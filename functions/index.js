// Firebase Cloud Functions for Forum Rate Limiting & Moderation
// Deploy with: firebase deploy --only functions
// Run: npm install firebase-functions firebase-admin

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });

admin.initializeApp();
const db = admin.firestore();

// ==================== RATE LIMITING ====================

/**
 * HTTP Cloud Function to check rate limits
 * Called before posting to verify user hasn't posted recently
 */
exports.checkRateLimit = functions.https.onCall(async (data, context) => {
  // Require authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Must be signed in to check rate limit'
    );
  }

  const userId = context.auth.uid;
  const userRef = db.collection('users').doc(userId);

  try {
    const userDoc = await userRef.get();
    const userData = userDoc.data() || {};
    const lastPostTime = userData.lastPostTime || 0;
    const now = Date.now();
    const timeSinceLastPost = now - lastPostTime;
    const COOLDOWN_MS = 2000;

    if (timeSinceLastPost < COOLDOWN_MS) {
      return {
        allowed: false,
        waitMs: COOLDOWN_MS - timeSinceLastPost,
        message: `Rate limited. Wait ${Math.ceil((COOLDOWN_MS - timeSinceLastPost) / 1000)}s`
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error('Rate limit check error:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Error checking rate limit'
    );
  }
});

/**
 * Firestore Trigger - Update rate limit timestamp when post is created
 */
exports.recordPostTime = functions.firestore
  .document('threads/{threadId}/comments/{commentId}')
  .onCreate(async (snap, context) => {
    const commentData = snap.data();
    const userId = commentData.userId;

    if (!userId) return;

    try {
      await db.collection('users').doc(userId).set(
        {
          lastPostTime: Date.now(),
          lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        },
        { merge: true }
      );
    } catch (error) {
      console.error('Error recording post time:', error);
    }
  });

// ==================== CONTENT MODERATION ====================

/**
 * Cloud Function to flag/report a comment
 */
exports.flagComment = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { commentId, threadId, reason, details } = req.body;
    const reporterId = req.body.uid || 'anonymous';

    // Validate input
    if (!commentId || !threadId || !reason) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const validReasons = ['spam', 'harassment', 'nsfw', 'misinformation', 'other'];
    if (!validReasons.includes(reason)) {
      return res.status(400).json({ error: 'Invalid reason' });
    }

    try {
      // Create flag document
      const flagRef = db.collection('threads').doc(threadId)
        .collection('comments').doc(commentId)
        .collection('flags').doc();

      await flagRef.set({
        reason,
        details: details || '',
        reporterId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'pending',
        resolvedAt: null,
        resolvedBy: null
      });

      // Increment flag count on comment
      const commentRef = db.collection('threads').doc(threadId)
        .collection('comments').doc(commentId);
      
      await commentRef.update({
        flagCount: admin.firestore.FieldValue.increment(1)
      });

      return res.status(200).json({ success: true, message: 'Report submitted successfully' });
    } catch (error) {
      console.error('Error flagging comment:', error);
      return res.status(500).json({ error: 'Error submitting report: ' + error.message });
    }
  });
});

/**
 * Admin Function to review and resolve flags
 */
exports.resolveFlag = functions.https.onCall(async (data, context) => {
  // Check if user is admin
  const userDoc = await db.collection('users').doc(context.auth.uid).get();
  if (!userDoc.data()?.isAdmin) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Admin access required'
    );
  }

  const { threadId, commentId, flagId, action } = data;
  // action = 'approve', 'reject', or 'delete'

  if (!['approve', 'reject', 'delete'].includes(action)) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Invalid action. Must be: approve, reject, or delete'
    );
  }

  try {
    const flagRef = db.collection('threads').doc(threadId)
      .collection('comments').doc(commentId)
      .collection('flags').doc(flagId);

    const batch = db.batch();

    // Update flag status
    batch.update(flagRef, {
      status: action === 'approve' ? 'approved' : 'rejected',
      resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
      resolvedBy: context.auth.uid
    });

    // If approved, soft-delete the comment
    if (action === 'approve') {
      const commentRef = db.collection('threads').doc(threadId)
        .collection('comments').doc(commentId);
      
      batch.update(commentRef, {
        deleted: true,
        deletedAt: admin.firestore.FieldValue.serverTimestamp(),
        deletedReason: 'Moderation: Flagged content removed'
      });
    }

    await batch.commit();
    return { success: true, message: `Flag ${action}ed` };
  } catch (error) {
    console.error('Error resolving flag:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Error resolving flag'
    );
  }
});

/**
 * Scheduled function to clean up old deleted comments (optional)
 * Runs daily
 */
exports.cleanupDeletedComments = functions.pubsub
  .schedule('every day 02:00')
  .timeZone('UTC')
  .onRun(async (context) => {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

    try {
      const snapshot = await db.collectionGroup('comments')
        .where('deleted', '==', true)
        .where('deletedAt', '<', new Date(thirtyDaysAgo))
        .get();

      let deleted = 0;
      const batch = db.batch();

      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
        deleted++;
      });

      if (deleted > 0) {
        await batch.commit();
      }

      console.log(`Cleanup: Deleted ${deleted} old comments`);
      return { success: true, deleted };
    } catch (error) {
      console.error('Cleanup error:', error);
      return { error: error.message };
    }
  });

/**
 * Firestore Trigger - Auto-moderate if flagged too many times
 */
exports.autoModerate = functions.firestore
  .document('threads/{threadId}/comments/{commentId}')
  .onUpdate(async (change, context) => {
    const after = change.after.data();
    const flagCount = after.flagCount || 0;

    // If more than 5 flags, auto-delete
    if (flagCount >= 5 && !after.deleted) {
      try {
        await change.after.ref.update({
          deleted: true,
          deletedAt: admin.firestore.FieldValue.serverTimestamp(),
          deletedReason: 'Auto-moderation: Multiple reports'
        });

        console.log('Auto-moderated comment:', context.params.commentId);
      } catch (error) {
        console.error('Auto-moderation error:', error);
      }
    }
  });

// ==================== UTILITIES ====================

/**
 * Admin function to manually delete a comment
 */
exports.deleteComment = functions.https.onCall(async (data, context) => {
  const { threadId, commentId } = data;

  // Verify ownership or admin
  const commentDoc = await db.collection('threads').doc(threadId)
    .collection('comments').doc(commentId).get();

  const commentData = commentDoc.data();
  const isOwner = context.auth.uid === commentData.userId;
  const adminDoc = await db.collection('users').doc(context.auth.uid).get();
  const userIsAdmin = adminDoc.data()?.isAdmin;

  if (!isOwner && !userIsAdmin) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'You can only delete your own comments'
    );
  }

  try {
    await commentDoc.ref.delete();
    return { success: true, message: 'Comment deleted' };
  } catch (error) {
    console.error('Error deleting comment:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Error deleting comment'
    );
  }
});
