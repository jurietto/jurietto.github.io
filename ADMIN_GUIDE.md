# Forum Moderation Quick Reference

## 🎛️ Admin Dashboard Commands

### Check Flagged Posts
```javascript
// In Firebase Console → Firestore → Run Query:
// Collection: threads/general/comments
// Where: flagCount > 0
```

### Delete a Post (as Admin)
```javascript
// In Cloud Functions terminal:
firebase functions:config:get
// Then call: deleteComment(threadId, commentId)
```

### Review a Flag
- Go to Firestore
- Path: `threads/general/comments/{commentId}/flags`
- Click on flag document
<!-- Admin portal documentation removed as part of portal deprecation. General moderation and emergency procedures retained. -->

When moderating, document:
```
Date: 2026-01-31
Action: Approved flag on post {id}
Reason: Spam
Moderator: {admin_id}
Result: Post deleted
```

---

Last Updated: January 31, 2026
