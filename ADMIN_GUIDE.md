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
- Call `resolveFlag()` function with:
  - `threadId`: "general"
  - `commentId`: ID
  - `flagId`: ID
  - `action`: "approve" | "reject"

---

## 📊 Monitoring Metrics

### Rate Limit Abuse Detected
- If `users/{userId}.lastPostTime` is updated multiple times per second
- Check Cloud Functions logs for failures

### Spam Pattern
- Posts with same content
- Posts with excessive links
- Posts flagged within minutes

---

## ⚠️ Emergency Procedures

### User Posting Spam Rapidly
1. Get their `userId`
2. In Firestore, delete user document: `users/{userId}`
3. Next post will create new rate limit entry

### Website Under Attack
1. In Firebase Console, enable Cloud Armor
2. Block suspicious IPs
3. Temporarily lower rate limit (edit functions/index.js)
4. Deploy: `firebase deploy --only functions`

### Database Quota Exceeded
1. Go to Firebase → Firestore → Quota Usage
2. Check what's using space
3. Run cleanup: `functions:cleanup` (scheduled daily at 02:00 UTC)

---

## 🔧 Common Admin Tasks

### Task: Delete a Spam Post
```javascript
// Option 1: User owns it (they can delete)
// Option 2: Approve flag via Cloud Function
// Option 3: Manual delete in Firebase Console
```

### Task: Mute a User
```javascript
// In Firestore, users/{userId}, add:
{
  muted: true,
  mutedAt: timestamp,
  mutedReason: "Spam"
}
// Then check before allowing posts
```

### Task: View User's Posts
```javascript
// In Firestore, run query:
// Collection: threads/general/comments
// Where: userId == "{userId}"
```

---

## 📈 Performance Targets

- **Post Creation**: < 500ms
- **Flag Submission**: < 1000ms
- **Rate Limit Check**: < 100ms
- **Auto-Moderation**: < 2000ms

If slower, check Cloud Functions logs for errors.

---

## 🚨 Alert Thresholds

Set up Firebase Alerts for:
- Firestore writes > 1000/min (DDoS)
- Firestore reads > 5000/min (Heavy traffic)
- Cloud Functions errors > 5%
- Cloud Functions latency > 5s

---

## 👤 User Reputation System (Optional Future)

Could implement based on:
- `flagCount` (higher = more problematic)
- Post frequency (burst = suspicious)
- Edit frequency (changing posts = less reliable)
- Age of account (new accounts = more risk)

---

## 📝 Moderation Log Template

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
