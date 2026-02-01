# Forum Security Setup Guide

## 🔐 What's Been Implemented

### 1. **Firestore Security Rules** (`firestore.rules`)
- ✅ Restricts unauthorized database access
- ✅ Only owners can edit/delete their posts
- ✅ Validates field lengths (username: 100 chars, post: 10,000 chars)
- ✅ Prevents spam metadata like flags from being set by users
- ✅ Admin-only access to moderation data

### 2. **Cloud Functions** (`functions/index.js`)
- ✅ **Rate Limiting**: 2-second cooldown between posts (backend enforced)
- ✅ **Flag/Report System**: Users can report spam, harassment, NSFW content
- ✅ **Auto-Moderation**: Posts with 5+ reports are auto-deleted
- ✅ **Admin Moderation**: Review and approve/reject flagged content
- ✅ **Cleanup**: Automatically removes soft-deleted posts after 30 days

### 3. **Frontend Updates** (`js/forum.js`)
- ✅ Flag button (⚠️) on all comments
- ✅ Report modal with reason selection
- ✅ Client-side rate limiting (2-second cooldown)
- ✅ File size validation (5MB per file, 50MB total)
- ✅ Edit/Delete buttons for replies and nested replies
- ✅ Image compression (auto-compresses to 75% quality)

---

## 🚀 Deployment Instructions

### Step 1: Install Firebase CLI
```bash
npm install -g firebase-tools
```

### Step 2: Initialize Firebase (if not done)
```bash
cd "c:\Users\hexan\Documents\github pages\jurietto.github.io"
firebase init
```
- Select "Firestore" and "Functions"
- Use existing Firebase project: **chansi-ddd7e**

### Step 3: Deploy Firestore Rules
```bash
firebase deploy --only firestore:rules
```

### Step 4: Deploy Cloud Functions
```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

### Step 5: Apply Firestore Rules in Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **chansi-ddd7e**
3. Go to **Firestore Database** → **Rules**
4. Copy & paste content from `firestore.rules`
5. Click **Publish**

---

## 📋 Security Rules Explained

### Who Can Do What?

| Action | Root Post | Reply | Nested Reply | Conditions |
|--------|-----------|-------|--------------|-----------|
| **Read** | ✅ Anyone | ✅ Anyone | ✅ Anyone | Always allowed |
| **Create** | ✅ Anyone | ✅ Anyone | ✅ Anyone | Rate limited (2s), max 10k chars, has userId |
| **Edit** | ✅ Owner | ✅ Owner | ✅ Owner | Can only edit text/media, not metadata |
| **Delete** | ✅ Owner | ✅ Owner | ✅ Owner | Soft delete with timestamp |
| **Flag** | ✅ Anyone | ✅ Anyone | ✅ Anyone | Reason must be valid, attached to post |
| **Resolve Flags** | 🛡️ Admin | 🛡️ Admin | 🛡️ Admin | Admin only, can delete flagged posts |

---

## 🛡️ DDoS/Spam Protection

### Client-Side (Cannot be bypassed alone)
- ✅ 2-second rate limit between posts
- ✅ File size validation (5MB per file)
- ✅ Post length validation (10k characters)
- ✅ Image compression (saves bandwidth)

### Backend (Firestore Rules)
- ✅ Enforced 2-second cooldown per user
- ✅ Post length validation at database layer
- ✅ No unauthorized field updates

### Cloud Functions (Automatic)
- ✅ Tracks `lastPostTime` per user
- ✅ Auto-deletes posts with 5+ flags
- ✅ Admin can manually remove spam

### Additional Recommendations
1. **Enable Firebase DDoS Protection**
   - Go to Firebase Console → Settings → Security
   - Enable Cloud Armor or Firebase DDoS Protection

2. **Set Firestore Quotas**
   - Limit write operations per day
   - Set daily cost limits

3. **Monitor Activity**
   - Use Cloud Monitoring to watch for spikes
   - Set up alerts for unusual traffic

---

## 🚨 Moderation Workflow

### User Reports a Comment
1. User clicks ⚠️ button
2. Selects reason (spam, harassment, etc.)
3. Report stored in `/comments/{id}/flags` collection

### Auto-Moderation
- If comment gets 5+ reports → automatically deleted
- Flagged as `deleted: true` with reason

### Admin Review
Use Firebase Console or custom admin dashboard:
1. View flagged comments in Firestore
2. Call `resolveFlag()` Cloud Function
3. Approve/reject the flag
4. If approved, comment is deleted

---

## 🔑 Setting Up Admin Users

To designate users as admins:

```javascript
// In Firebase Console, Firestore -> users -> {userId}
{
  isAdmin: true,
  lastPostTime: 0,
  lastUpdated: timestamp
}
```

Or via Cloud Function (run in terminal):
```bash
firebase functions:config:set admin.user_id="YOUR_USER_ID"
```

---

## 📊 Monitoring & Analytics

### View Rate Limit Data
```javascript
// In Firebase Console, Firestore
// Path: users/{userId}
// Shows: lastPostTime, lastUpdated
```

### View Flags
```javascript
// In Firebase Console
// Path: threads/general/comments/{id}/flags
// Shows: reason, reporterId, status, createdAt
```

### Check Cloud Function Logs
```bash
firebase functions:log
```

Or in Firebase Console → Functions → Logs

---

## ❌ Common Issues & Fixes

### "Permission denied" when posting
**Cause**: Security rules not deployed correctly
**Fix**: 
```bash
firebase deploy --only firestore:rules
```

### "Cloud Function not found"
**Cause**: Functions not deployed
**Fix**:
```bash
cd functions && npm install && cd ..
firebase deploy --only functions
```

### Rate limiting not working
**Cause**: Client-side only (can be bypassed), need backend
**Fix**: Ensure Cloud Functions are deployed and Firestore rules include `canPostNow()` check

### Too many flagged posts being deleted
**Cause**: Flag threshold too low
**Fix**: Edit `functions/index.js` line ~200, change `flagCount >= 5` to higher value

---

## 🔄 Updating Rules/Functions

### Update Firestore Rules
```bash
# Edit firestore.rules
firebase deploy --only firestore:rules
```

### Update Cloud Functions
```bash
# Edit functions/index.js
cd functions
npm install  # if dependencies changed
cd ..
firebase deploy --only functions
```

---

## 💬 Testing

### Test Rate Limiting
1. Post a comment
2. Try to post again immediately
3. Should see "Please wait..." message

### Test Flagging
1. Click ⚠️ on any comment
2. Select reason and submit
3. Check Firestore: threads → general → comments → {id} → flags

### Test Auto-Moderation
1. Report same comment 5+ times (or manually set flagCount: 5)
2. Post should be auto-deleted or marked as deleted

---

## 🎯 Next Steps

1. ✅ Deploy security rules
2. ✅ Deploy Cloud Functions
3. ✅ Test all features
4. ✅ Set up monitoring/alerts
5. ✅ Document admin procedures
6. ✅ Train moderators (if team)

---

## 📞 Support

For issues:
- Check Firebase Console logs
- Review Firestore rules syntax
- Check Cloud Functions logs: `firebase functions:log`
- Review console errors in browser DevTools

---

**Last Updated**: January 31, 2026
**Firebase Project**: chansi-ddd7e
**Status**: Ready for deployment ✅
