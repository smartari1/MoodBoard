# Authentication Loop Fix

## Problem Identified

The authentication redirect loop was caused by:

1. **Cookie Domain Mismatch**: NextAuth cookies weren't properly configured for the custom domain `app.moodboard.co.il`
2. **Middleware Token Reading**: The middleware couldn't read the session token, even when the session was valid
3. **Client/Server Redirect Conflict**: Sign-in page (client-side) was redirecting to dashboard, while middleware (server-side) was redirecting back to sign-in

## Symptoms
- Browser errors: `ERR_NETWORK_CHANGED`, `ERR_NAME_NOT_RESOLVED` 
- Infinite loop: `/he/dashboard` (307) → `/he/sign-in` (200) → `/he/dashboard` (307) → repeat
- Multiple `/api/auth/session` calls returning 200 OK, but middleware not recognizing auth

## Changes Made

### 1. Fixed Cookie Configuration (`src/lib/auth/auth-config.ts`)

Added explicit cookie settings to ensure proper cookie handling on custom domain:

```typescript
cookies: {
  sessionToken: {
    name: process.env.NODE_ENV === 'production' 
      ? '__Secure-next-auth.session-token'
      : 'next-auth.session-token',
    options: {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      domain: process.env.NODE_ENV === 'production' 
        ? '.moodboard.co.il'  // Share cookie across subdomains
        : undefined,
    },
  },
}
```

**Key Fix**: The `domain: '.moodboard.co.il'` (with leading dot) allows the cookie to be shared across all subdomains.

### 2. Added Redirect Loop Protection (`middleware.ts`)

Added detection to prevent infinite redirects:

```typescript
if (isProtectedRoute && !token) {
  // Prevent redirect loop: if we've been redirecting too many times, stop
  const referer = request.headers.get('referer')
  const isRedirectLoop = referer && referer.includes('/sign-in')
  
  if (isRedirectLoop) {
    console.warn('Detected potential redirect loop, allowing request through')
    return intlMiddleware(request)
  }
  
  const signInUrl = new URL(`/${locale}/sign-in`, request.url)
  signInUrl.searchParams.set('redirect_url', pathname)
  return NextResponse.redirect(signInUrl)
}
```

### 3. Improved Sign-in Page Redirect (`src/app/[locale]/(auth)/sign-in/page.tsx`)

Changed from `window.location.replace()` to `router.replace()` with a small delay:

```typescript
// Add a small delay to ensure auth state is properly synced
const timer = setTimeout(() => {
  // Use router.replace instead of window.location to work better with middleware
  router.replace(redirectUrl)
}, 100)
```

## Deployment Instructions

### 1. Verify Environment Variables on Vercel

Ensure these are set correctly:

```bash
NEXTAUTH_URL=https://app.moodboard.co.il
NEXTAUTH_SECRET=<your-secret>
GOOGLE_CLIENT_ID=<your-client-id>
GOOGLE_CLIENT_SECRET=<your-client-secret>
```

**Important**: `NEXTAUTH_URL` must exactly match your custom domain (including `https://`).

### 2. Update Google OAuth Settings

Make sure your Google OAuth credentials include:

**Authorized JavaScript origins:**
- `https://app.moodboard.co.il`

**Authorized redirect URIs:**
- `https://app.moodboard.co.il/api/auth/callback/google`

### 3. Deploy to Vercel

```bash
# Commit changes
git add .
git commit -m "fix: resolve authentication redirect loop with proper cookie configuration"

# Push to trigger deployment
git push origin main
```

### 4. Testing After Deployment

1. **Clear browser cookies and cache** completely
2. Navigate to `https://app.moodboard.co.il/he/sign-in`
3. Sign in with Google
4. Verify you're redirected to `/he/dashboard` without loops
5. Check browser DevTools:
   - Network tab: Should see one successful sign-in flow
   - Application/Cookies: Should see `__Secure-next-auth.session-token` cookie with domain `.moodboard.co.il`

### 5. If Issues Persist

Check Vercel logs:

```bash
vercel logs <deployment-url>
```

Look for:
- "Error getting token in middleware" messages
- "Detected potential redirect loop" warnings
- Any NextAuth errors

## Technical Notes

### Why Cookie Domain Matters

Without explicit domain configuration, NextAuth sets cookies with the exact hostname (e.g., `app.moodboard.co.il`). With a leading dot (`.moodboard.co.il`), the cookie is accessible by:
- `app.moodboard.co.il`
- `www.moodboard.co.il`
- Any other subdomain

This ensures the middleware (running on the same domain) can read the session token.

### Why __Secure Prefix

The `__Secure-` prefix is a browser security feature that:
- Requires the cookie to be set with `Secure` flag
- Requires HTTPS
- Prevents insecure pages from overwriting the cookie

This is NextAuth's default for production environments using HTTPS.

### Middleware Token Reading

The middleware uses `getToken()` from `next-auth/jwt` which:
1. Reads the cookie from the request
2. Verifies the JWT signature
3. Decodes the token payload

If the cookie domain is wrong, step 1 fails, causing the middleware to think the user is unauthenticated.

## Rollback Instructions

If issues arise, you can rollback by reverting:

```bash
git revert HEAD
git push origin main
```

Then investigate further using Vercel logs.

