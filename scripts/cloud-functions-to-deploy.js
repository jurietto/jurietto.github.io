/**
 * Cloud Functions for Edit/Delete Comments
 * 
 * DEPLOY INSTRUCTIONS:
 * 1. Copy these functions to your Firebase Functions project (functions/index.js)
 * 2. Run: firebase deploy --only functions
 * 
 * NOTE: This version does NOT require 'npm install cors'. It handles CORS manually.
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize if not already
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Manual CORS helper - Handles Preflight OPTIONS requests
const cors = (req, res, handler) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.set('Access-Control-Max-Age', '3600');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  return handler(req, res);
};

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
      
      const commentRef = db.collection('threads').doc(threadId).collection('comments').doc(commentId);
      const commentDoc = await commentRef.get();
      
      if (!commentDoc.exists) {
        return res.status(404).send('Comment not found');
      }
      
      const commentData = commentDoc.data();
      if (commentData.userId !== userId) {
        return res.status(403).send('Not authorized to edit this comment');
      }
      
      await commentRef.update({
        text: text,
        media: media || null,
        editedAt: Date.now()
      });
      
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Edit error:', error);
      return res.status(500).send(error.message);
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
      
      const commentRef = db.collection('threads').doc(threadId).collection('comments').doc(commentId);
      const commentDoc = await commentRef.get();
      
      if (!commentDoc.exists) {
        return res.status(404).send('Comment not found');
      }
      
      const commentData = commentDoc.data();
      if (commentData.userId !== userId) {
        return res.status(403).send('Not authorized to delete this comment');
      }
      
      await commentRef.delete();
      
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Delete error:', error);
      return res.status(500).send(error.message);
    }
  });
});
