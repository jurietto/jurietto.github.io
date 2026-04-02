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
const { defineSecret } = require('firebase-functions/params');

// Define the secret
const claudeApiKey = defineSecret('CLAUDE_API_KEY');

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
 * Expects: { commentId, threadId, userId, text, media, collectionPath }
 * If collectionPath is provided, it uses that (e.g. "blogPosts/article-1/comments")
 * Otherwise defaults to "threads/{threadId}/comments"
 */
exports.editComment = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).send('Method not allowed');
    }
    
    try {
      const { commentId, threadId, userId, text, media, collectionPath } = req.body;
      
      if (!commentId || !userId) {
        return res.status(400).send('Missing required fields');
      }
      
      let commentRef;
      if (collectionPath) {
        commentRef = db.collection(collectionPath.split('/')[0]).doc(collectionPath.split('/')[1]).collection(collectionPath.split('/')[2]).doc(commentId);
      } else if (threadId) {
        commentRef = db.collection('threads').doc(threadId).collection('comments').doc(commentId);
      } else {
        return res.status(400).send('Missing threadId or collectionPath');
      }

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
      return res.status(500).json({ error: error.message });
    }
  });
});

/**
 * Delete a comment
 * Expects: { commentId, threadId, userId, collectionPath }
 */
exports.deleteComment = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).send('Method not allowed');
    }
    
    try {
      const { commentId, threadId, userId, collectionPath } = req.body;
      
      if (!commentId || !userId) {
        return res.status(400).send('Missing required fields');
      }
      
      let commentRef;
      if (collectionPath) {
        // Handle nested paths dynamically "col/doc/subcol/doc"
        const parts = collectionPath.split('/');
        if (parts.length === 3) {
            // "blogPosts/123/comments" -> docId is passed separately as commentId
             commentRef = db.collection(parts[0]).doc(parts[1]).collection(parts[2]).doc(commentId);
        } else {
             // Fallback or error
             return res.status(400).send('Invalid collectionPath format');
        }
      } else if (threadId) {
        commentRef = db.collection('threads').doc(threadId).collection('comments').doc(commentId);
      } else {
        return res.status(400).send('Missing threadId or collectionPath');
      }

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
      return res.status(500).json({ error: error.message });
    }
  });
});

/**
 * Post a comment
 * Expects: { threadId, user, userId, text, media, replyTo, collectionPath }
 */
exports.postComment = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).send('Method not allowed');
    }
    
    try {
      const { threadId, user, userId, text, media, replyTo, collectionPath } = req.body;
      
      // Allow empty text if media is present
      if (!userId || (!text && (!media || !media.length))) {
        return res.status(400).send('Missing required fields');
      }
      
      const newComment = {
        user: user || 'Anonymous',
        text: text,
        userId: userId,
        createdAt: Date.now(), // Use server time
        media: media || null
      };

      if (replyTo) {
        newComment.replyTo = replyTo;
      }
      
      let colRef;
      if (collectionPath) {
         const parts = collectionPath.split('/');
         colRef = db.collection(parts[0]).doc(parts[1]).collection(parts[2]);
      } else if (threadId) {
         colRef = db.collection('threads').doc(threadId).collection('comments');
      } else {
        return res.status(400).send('Missing threadId or collectionPath');
      }

      const docRef = await colRef.add(newComment);
      
      return res.status(200).json({ success: true, id: docRef.id });
    } catch (error) {
      console.error('Post error:', error);
      return res.status(500).json({ error: error.message });
    }
  });
});

/**
 * AI Forum Summary
 * Expects: { threadId }
 * Fetches recent posts and generates an AI summary using Claude
 */
exports.generateAISummary = functions.https.onRequest(
  { secrets: [claudeApiKey] },
  (req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).send('Method not allowed');
    }
    
    try {
      const { threadId } = req.body;
      
      if (!threadId) {
        return res.status(400).send('Missing threadId');
      }
      
      // Fetch recent posts from the forum (limit to 50 most recent)
      const commentsRef = db.collection('threads').doc(threadId).collection('comments');
      const snapshot = await commentsRef.orderBy('createdAt', 'desc').limit(50).get();
      
      if (snapshot.empty) {
        return res.status(200).json({ summary: 'No posts found in the forum yet!' });
      }
      
      // Build posts text for AI
      const posts = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        posts.push(`[${data.user || 'Anonymous'}]: ${data.text || '[image/media]'}`);
      });
      
      const postsText = posts.reverse().join('\n\n');
      
      // Call Claude API using native fetch (Node 18+)
      const apiKey = claudeApiKey.value();
      
      console.log('API Key exists:', !!apiKey);
      console.log('Posts text length:', postsText.length);
      
      if (!apiKey) {
        return res.status(500).json({ error: 'Claude API key not configured' });
      }
      
      console.log('Calling Claude API...');
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1024,
          messages: [{
            role: 'user',
            content: `You're summarizing a casual internet forum for friends. Be friendly and concise. Summarize what's been happening in this forum based on these recent posts:\n\n${postsText}`
          }]
        })
      });
      
      console.log('Claude API response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Claude API error response:', errorText);
        return res.status(500).json({ error: `AI request failed: ${errorText}` });
      }
      
      const data = await response.json();
      console.log('Claude API success, summary length:', data.content[0].text.length);
      const summary = data.content[0].text;
      
      return res.status(200).json({ summary });
    } catch (error) {
      console.error('AI Summary error:', error);
      console.error('Error stack:', error.stack);
      return res.status(500).json({ error: error.message });
    }
  });
});
