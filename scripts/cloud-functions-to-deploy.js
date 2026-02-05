/**
 * Cloud Functions for Edit/Delete Comments
 * 
 * DEPLOY INSTRUCTIONS:
 * 1. Copy these functions to your Firebase Functions project (functions/index.js)
 * 2. Run: npm install cors (in functions folder)
 * 3. Run: firebase deploy --only functions
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });

// Initialize if not already
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Edit a comment
 * Expects: { commentId, threadId, userId, text, media }
 */
exports.editComment = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).send('Method not allowed');
    }
    
    try {
      const { commentId, threadId, userId, text, media } = req.body;
      
      if (!commentId || !threadId || !userId) {
        return res.status(400).send('Missing required fields');
      }
      
      // Get the comment to verify ownership
      const commentRef = db.collection('threads').doc(threadId).collection('comments').doc(commentId);
      const commentDoc = await commentRef.get();
      
      if (!commentDoc.exists) {
        return res.status(404).send('Comment not found');
      }
      
      const commentData = commentDoc.data();
      if (commentData.userId !== userId) {
        return res.status(403).send('Not authorized to edit this comment');
      }
      
      // Update the comment
      await commentRef.update({
        text: text,
        media: media || null,
        editedAt: Date.now()
      });
      
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Edit error:', error);
      return res.status(500).send('Internal server error');
    }
  });
});

/**
 * Delete a comment
 * Expects: { commentId, threadId, userId }
 */
exports.deleteComment = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).send('Method not allowed');
    }
    
    try {
      const { commentId, threadId, userId } = req.body;
      
      if (!commentId || !threadId || !userId) {
        return res.status(400).send('Missing required fields');
      }
      
      // Get the comment to verify ownership
      const commentRef = db.collection('threads').doc(threadId).collection('comments').doc(commentId);
      const commentDoc = await commentRef.get();
      
      if (!commentDoc.exists) {
        return res.status(404).send('Comment not found');
      }
      
      const commentData = commentDoc.data();
      if (commentData.userId !== userId) {
        return res.status(403).send('Not authorized to delete this comment');
      }
      
      // Delete the comment
      await commentRef.delete();
      
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Delete error:', error);
      return res.status(500).send('Internal server error');
    }
  });
});
