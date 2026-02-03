# 🎀 Juri's Site - Complete Documentation

> **Last Updated**: February 2, 2026  
> **Firebase Project**: chansi-ddd7e  
> **Live Site**: https://jurietto.github.io

---

## 📋 Table of Contents

1. [Security Audit & Threats](#-security-audit--threats)
2. [Site Architecture](#-site-architecture)
3. [Pages & Features](#-pages--features)
4. [Admin Portal Guide](#-admin-portal-guide)
5. [Firebase Configuration](#-firebase-configuration)
6. [Deployment Guide](#-deployment-guide)
7. [File Reference](#-file-reference)
8. [Troubleshooting](#-troubleshooting)

---

## 🔴 Security Audit & Threats

### ⚠️ CRITICAL: Exposed Credentials in Public Repo

| Issue | Severity | Location | Status |
|-------|----------|----------|--------|
| **Firebase API Key Exposed** | 🟡 Medium | Multiple JS files | Acceptable* |
| **Admin UID Hardcoded** | 🔴 High | `js/admin.js`, `firestore.rules` | **ACTION NEEDED** |
| **Project ID Exposed** | 🟡 Medium | Firebase config | Acceptable* |

#### 🔴 HIGH PRIORITY: Admin UID Exposure

**Problem**: Your admin user ID is hardcoded in public files:
```javascript
// js/admin.js line 19
const ADMIN_UID = "Qrwkm5Rg16W1w77Whv4I39NKfXH2";

// firestore.rules line 16
return request.auth.uid == "Qrwkm5Rg16W1w77Whv4I39NKfXH2";
```

**Risk**: Anyone can see who the admin is. While they can't *become* admin without your GitHub credentials, this information could be used for targeted attacks or social engineering.

**Mitigation Options**:
1. ✅ **Recommended**: Move admin UID to Firebase environment config
   ```bash
   firebase functions:config:set admin.uid="YOUR_UID"
   ```
2. Use Firestore `users/{uid}.isAdmin` field instead of hardcoded UID (already partially implemented in Cloud Functions)
3. The Firestore rules approach is secure because it runs server-side

---

### 🟡 MEDIUM: Firebase API Keys

**Current Status**: API keys are in:
- [js/firebase.js](js/firebase.js)
- [js/blog.js](js/blog.js)
- [js/admin.js](js/admin.js)

**Why This Is OK**:
Firebase API keys are designed to be public. Security is enforced by:
1. ✅ **Firestore Security Rules** - Already configured in `firestore.rules`
2. ✅ **Content Security Policy** - All HTML pages have strict CSP headers
3. ✅ **Domain Restrictions** - Configure in Firebase Console

**Action Recommended**:
1. Go to [Firebase Console](https://console.firebase.google.com/) → Project Settings → API Keys
2. Click on "Browser key" → Add application restrictions
3. Add your domains: `jurietto.github.io`, `localhost`

---

### 🟢 Security Features Already In Place

| Feature | Implementation | Status |
|---------|---------------|--------|
| **Content Security Policy** | All HTML `<meta>` tags | ✅ Configured |
| **XSS Protection** | `firebase.json` headers | ✅ Configured |
| **X-Frame-Options** | DENY on HTML pages | ✅ Configured |
| **Referrer Policy** | strict-origin-when-cross-origin | ✅ Configured |
| **Firestore Rules** | `firestore.rules` | ✅ Deployed |
| **Rate Limiting** | Cloud Functions | ✅ 2-second cooldown |
| **Input Validation** | Client + Firestore rules | ✅ Max lengths enforced |
| **Report System** | Flagging with auto-moderation | ✅ 5+ flags = auto-delete |

---

### 🔍 Other Security Considerations

#### Service Worker
- [sw.js](sw.js) handles caching correctly
- Does NOT cache Firebase API calls
- No sensitive data cached

#### File Uploads
- Limited to images only (`isImageFile` check)
- Max 10 images per post
- Max 5MB per file / 50MB total
- Stored in Firebase Storage (secured by rules)

#### Anonymous Posting
- Users can post anonymously (no email/password required)
- `userId` is generated client-side and stored in localStorage
- This is intentional per your privacy policy

---

## 🏗 Site Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Pages (Static Hosting)            │
│  ┌─────────┬─────────┬─────────┬─────────┬─────────────┐   │
│  │  Forum  │  Blog   │ Profile │ Privacy │    Admin    │   │
│  │index.html│blog.html│profile. │privacy. │ admin.html  │   │
│  └────┬────┴────┬────┴────┬────┴────┬────┴──────┬──────┘   │
└───────┼─────────┼─────────┼─────────┼───────────┼──────────┘
        │         │         │         │           │
        ▼         ▼         ▼         ▼           ▼
┌─────────────────────────────────────────────────────────────┐
│                     Firebase Backend                        │
│  ┌─────────────────┐  ┌─────────────────────────────────┐  │
│  │   Firestore     │  │       Cloud Functions           │  │
│  │  ├─ threads/    │  │  ├─ checkRateLimit()           │  │
│  │  │  └─comments/ │  │  ├─ recordPostTime()           │  │
│  │  ├─ blogPosts/  │  │  ├─ flagComment()              │  │
│  │  │  └─comments/ │  │  ├─ resolveFlag()              │  │
│  │  ├─ users/      │  │  ├─ autoModerate()             │  │
│  │  └─ flagged..   │  │  └─ cleanupDeletedComments()   │  │
│  └─────────────────┘  └─────────────────────────────────┘  │
│  ┌─────────────────┐  ┌─────────────────────────────────┐  │
│  │  Firebase Auth  │  │       Firebase Storage          │  │
│  │  (GitHub OAuth) │  │       (Image uploads)           │  │
│  └─────────────────┘  └─────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📄 Pages & Features

### 🏠 Forum (`index.html`)
**URL**: `/` or `/index.html`

**Features**:
- Anonymous posting (no login required)
- Image uploads (up to 10 images, 5MB each)
- Nested replies
- Edit/delete own posts
- Report inappropriate content
- Real-time updates via Firestore
- Search functionality
- Pagination

**How to Use**:
1. Enter username (optional, defaults to "Anonymous")
2. Write your message
3. Click "Post" to submit
4. To reply: click "Reply" under any post
5. To edit: click "Edit" on your own posts
6. To report: click the flag icon ⚠️

---

### 📝 Blog (`blog.html`)
**URL**: `/blog.html`

**Features**:
- View all blog posts
- Filter by hashtags
- Search posts
- Comment on posts
- Comments support images

**How Comments Work**:
- Click a post to expand comments
- Add your username and comment
- Upload images if desired
- Edit/delete your own comments

---

### 👤 Profile (`profile.html`)
**URL**: `/profile.html`

**Features**:
- Displays Juri's profile information
- Link to GitHub
- Social links

---

### 🔒 Privacy (`privacy.html`)
**URL**: `/privacy.html`

**Content**: Privacy policy explaining:
- What data is collected (usernames, posts, images)
- What is NOT collected (IPs, cookies, tracking)
- How to request data deletion

---

### 🔐 Admin Portal (`admin.html`)
**URL**: `/admin.html`

**Access**: GitHub OAuth (admin account only)

**Features**:
1. **Write Post** - Create new blog posts
2. **Manage Posts** - Edit/delete existing posts
3. **Forum Moderation** - Delete forum comments
4. **Blog Comments** - Moderate blog comments
5. **Reports** - Review flagged content

---

## 🛠 Admin Portal Guide

### Accessing the Admin

1. Navigate to `/admin.html`
2. Click "Sign In with GitHub"
3. Authorize with the admin GitHub account
4. Dashboard will appear with 5 tabs

### Tab 1: Write Post 📝

Create a new blog post:
1. Enter title
2. Write content
3. Add hashtags (optional, format: `#tag1 #tag2`)
4. Click "Publish Post"

### Tab 2: Manage Posts 📚

Edit or delete existing blog posts:
- Click **Edit** to modify a post
- Click **Delete** to remove permanently
- Use pagination to browse older posts

### Tab 3: Forum Moderation 🛡️

View all forum comments:
- Comments grouped by thread
- Nested replies shown with indentation
- Click **Delete** to remove a comment (and all replies)

### Tab 4: Blog Comments 💬

Manage comments on blog posts:
- Shows which post each comment belongs to
- Delete inappropriate comments

### Tab 5: Reports 🚩

Review flagged content:
- See the reason for the report
- See additional details from reporter
- **Dismiss Report** - Keep the comment, remove the flag
- **Delete Comment** - Remove both comment and flag

---

## 🔥 Firebase Configuration

### Firestore Database Structure

```
firestore/
├── threads/
│   └── general/
│       └── comments/
│           └── {commentId}
│               ├── user: string
│               ├── text: string
│               ├── userId: string
│               ├── createdAt: timestamp
│               ├── media?: string[]
│               ├── replyTo?: string
│               ├── editedAt?: number
│               ├── flagCount?: number
│               └── flags/
│                   └── {flagId}
│
├── blogPosts/
│   └── {postId}
│       ├── title: string
│       ├── content: string
│       ├── author: string
│       ├── hashtags: string[]
│       ├── createdAt: timestamp
│       └── comments/
│           └── {commentId}
│
├── users/
│   └── {userId}
│       ├── lastPostTime: number
│       ├── lastUpdated: timestamp
│       └── isAdmin?: boolean
│
└── flaggedComments/
    └── {reportId}
        ├── commentPath: string
        ├── commentText: string
        ├── commentUser: string
        ├── reason: string
        ├── details?: string
        └── reportedAt: timestamp
```

### Security Rules Summary

| Collection | Read | Create | Update | Delete |
|------------|------|--------|--------|--------|
| `blogPosts` | Anyone | Admin | Admin | Admin |
| `blogPosts/comments` | Anyone | Anyone* | Owner | Owner/Admin |
| `threads/comments` | Anyone | Anyone* | Owner | Owner |
| `users` | Anyone | Owner | Owner | ❌ |
| `flaggedComments` | Admin | Anyone | ❌ | Admin |

*With field validation

### Cloud Functions

| Function | Trigger | Purpose |
|----------|---------|---------|
| `checkRateLimit` | HTTP Callable | Verify 2-second cooldown |
| `recordPostTime` | Firestore onCreate | Update user's last post time |
| `flagComment` | HTTP Request | Submit a report |
| `resolveFlag` | HTTP Callable | Admin approves/rejects flag |
| `autoModerate` | Firestore onUpdate | Auto-delete at 5+ flags |
| `cleanupDeletedComments` | Scheduled (daily) | Remove 30-day-old deleted posts |
| `deleteComment` | HTTP Callable | Manual delete (owner/admin) |

---

## 🚀 Deployment Guide

### Prerequisites

```bash
npm install -g firebase-tools
firebase login
```

### Deploy Everything

```bash
cd "c:\Users\hexan\Documents\github pages\jurietto.github.io"

# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Cloud Functions
cd functions && npm install && cd ..
firebase deploy --only functions

# Deploy hosting (optional - GitHub Pages handles this)
firebase deploy --only hosting
```

### Deploy Individual Components

```bash
# Just rules
firebase deploy --only firestore:rules

# Just functions
firebase deploy --only functions

# Just hosting
firebase deploy --only hosting
```

### GitHub Pages Deployment

The site automatically deploys when you push to the `main` branch:

```bash
git add .
git commit -m "Update site"
git push origin main
```

---

## 📁 File Reference

### HTML Pages
| File | Purpose |
|------|---------|
| `index.html` | Main forum page |
| `blog.html` | Blog listing |
| `admin.html` | Admin dashboard |
| `profile.html` | User profile |
| `privacy.html` | Privacy policy |
| `404.html` | Error page |

### CSS Stylesheets
| File | Purpose |
|------|---------|
| `css/global.css` | Base styles, colors, fonts |
| `css/forum.css` | Forum-specific styles |
| `css/blog.css` | Blog-specific styles |
| `css/admin.css` | Admin portal styles |
| `css/profile.css` | Profile page styles |
| `css/footer.css` | Footer component |
| `css/mobile.css` | Mobile responsive |

### JavaScript Modules
| File | Purpose |
|------|---------|
| `js/firebase.js` | Firebase initialization |
| `js/forum.js` | Forum main logic |
| `js/forum-ui.js` | Forum UI components |
| `js/blog.js` | Blog main logic |
| `js/blog-comments.js` | Blog comments |
| `js/admin.js` | Admin auth & core |
| `js/admin_blog.js` | Admin blog management |
| `js/admin_forum.js` | Admin forum moderation |
| `js/admin_blog_comments.js` | Admin blog comments |
| `js/admin_reported_comments.js` | Admin reports |
| `js/storage.js` | Firebase Storage uploads |
| `js/utils.js` | Shared utilities |
| `js/common.js` | Common navigation |
| `js/form.js` | Form handling |
| `js/post.js` | Post utilities |

### Configuration Files
| File | Purpose |
|------|---------|
| `firebase.json` | Firebase hosting config |
| `firestore.rules` | Database security rules |
| `.firebaserc` | Firebase project link |
| `manifest.json` | PWA manifest |
| `sw.js` | Service worker (caching) |
| `robots.txt` | Search engine rules |
| `sitemap.xml` | SEO sitemap |

### Cloud Functions
| File | Purpose |
|------|---------|
| `functions/index.js` | All Cloud Functions |
| `functions/package.json` | Function dependencies |

---

## 🔧 Troubleshooting

### "Permission denied" when posting
```bash
# Redeploy Firestore rules
firebase deploy --only firestore:rules
```

### Comments not loading
1. Check browser console for errors
2. Verify Firebase project is active
3. Check Firestore rules are deployed

### Admin login not working
1. Ensure you're using the correct GitHub account
2. Check that GitHub OAuth is enabled in Firebase Console
3. Verify the admin UID matches in `js/admin.js`

### Rate limiting not working
1. Deploy Cloud Functions:
   ```bash
   cd functions && npm install && cd ..
   firebase deploy --only functions
   ```
2. Check function logs:
   ```bash
   firebase functions:log
   ```

### Images not uploading
1. Check Firebase Storage rules in console
2. Verify file size < 5MB
3. Ensure file is an image format

### Site not updating after push
1. Wait 1-2 minutes for GitHub Pages to rebuild
2. Hard refresh: `Ctrl+Shift+R`
3. Clear service worker cache in DevTools

---

## 📞 Quick Commands Reference

```bash
# Login to Firebase
firebase login

# View project info
firebase projects:list

# Deploy all
firebase deploy

# Deploy just rules
firebase deploy --only firestore:rules

# Deploy just functions
firebase deploy --only functions

# View function logs
firebase functions:log

# View function logs (live)
firebase functions:log --follow

# Serve locally
firebase serve

# Run emulators
firebase emulators:start
```

---

## ✅ Security Checklist

- [ ] Add domain restrictions to Firebase API keys
- [ ] Consider moving admin UID to Firebase config
- [ ] Regularly review flagged content
- [ ] Monitor Cloud Function usage in Firebase Console
- [ ] Keep Firebase SDK versions updated
- [ ] Review Firestore rules after any database structure changes

---

**Made with 💕 by Juri**
