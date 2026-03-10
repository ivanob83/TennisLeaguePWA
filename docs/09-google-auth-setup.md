# Google Authentication Setup Guide

Quick guide for enabling Google Sign-In in Firebase.

---

## Enable Google Provider in Firebase Console

### Step 1: Go to Firebase Console
[https://console.firebase.google.com/project/ligaplay-9c803/authentication](https://console.firebase.google.com/project/ligaplay-9c803/authentication/providers)

### Step 2: Enable Google Sign-In Method

1. Click **Authentication** in left sidebar
2. Click **Sign-in method** tab
3. Find **Google** in the providers list
4. Click **Edit** (pencil icon)
5. Toggle **Enable**
6. Set **Project support email** (your email address)
7. Click **Save**

### Step 3: Configure Authorized Domains

By default, `localhost` should already be authorized. If deploying to production:

1. Go to **Authentication → Settings → Authorized domains**
2. Add your production domain (e.g., `yourdomain.com`)

---

## Features Implemented

✅ **Login Page** - Google sign-in button added
✅ **Register Page** - Google sign-up button added
✅ **Auto User Creation** - Firestore user document created automatically on first Google login
✅ **Profile Photo** - Google profile photo saved to Firestore
✅ **Default Role** - New Google users get `role: 'player'` by default

---

## What Happens on Google Sign-In

1. User clicks "Sign in with Google" button
2. Google popup opens for account selection
3. User authorizes the app
4. Firebase Auth creates/authenticates user
5. `loginWithGoogle()` checks if user document exists in Firestore
6. If new user → creates Firestore document with:
   - `email` - from Google account
   - `displayName` - from Google profile
   - `photoURL` - Google profile picture
   - `role: 'player'` - default role
   - `createdAt` and `updatedAt` timestamps
7. User redirected to `/dashboard`

---

## Testing

1. Go to `http://localhost:5173/login`
2. Click "Sign in with Google"
3. Select your Google account
4. Should redirect to dashboard
5. Check Firestore Console → `users` collection → verify document created

---

## Troubleshooting

### Error: "Popup blocked"
**Solution:** Allow popups for localhost in browser settings

### Error: "unauthorized_client"
**Solution:** Make sure Google provider is enabled in Firebase Console

### Error: "auth/popup-closed-by-user"
**Solution:** User closed the popup, this is normal - just try again

### Profile photo not showing
**Solution:** Check if `photoURL` field exists in Firestore user document

---

## Security Notes

- Google sign-in uses OAuth 2.0 (secure)
- User email automatically verified by Google
- No password stored for Google users
- Firebase handles token refresh automatically
- Same security rules apply (defined in `firestore.rules`)

---

## Next Steps

After enabling Google Sign-In:
1. ✅ Test login flow
2. ✅ Test register flow
3. ✅ Verify Firestore user document creation
4. 📋 Update Header to show Google profile photo
5. 📋 Allow linking email/password to existing Google account (future)
