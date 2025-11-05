# Authentication Guide for MoodB

## Overview

MoodB uses **NextAuth.js v5 (beta)** for authentication with Google OAuth as the primary provider. This guide covers the architecture, implementation details, and important considerations.

## Architecture

### Key Files

```
src/
├── lib/auth/
│   ├── auth-instance.ts       # NextAuth v5 instance & exports
│   ├── auth-config.ts         # NextAuth configuration (providers, callbacks)
│   ├── auth.ts                # Helper functions (getCurrentUser, requireAuth, etc.)
│   ├── rbac.ts                # Role-based access control
│   └── api-middleware.ts      # API authentication middleware
├── app/
│   ├── api/auth/[...nextauth]/route.ts  # Auth API endpoints
│   └── [locale]/
│       ├── sign-in/           # Sign-in page
│       └── sign-up/           # Sign-up page
└── middleware.ts              # Root middleware (auth + i18n)
```

---

## NextAuth v5 Configuration

### 1. Auth Instance (`src/lib/auth/auth-instance.ts`)

**CRITICAL:** NextAuth v5 uses a different export pattern than v4.

```typescript
import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth/auth-config"

// Export handlers, auth function, and sign-in/out helpers
export const { handlers, auth, signIn, signOut } = NextAuth(authOptions)

// Export route handlers for API routes
export const { GET, POST } = handlers
```

**Key Points:**
- `handlers` contains the GET/POST route handlers
- `auth()` is used to get the current session (replaces `getServerSession`)
- `signIn()` and `signOut()` are server-side action helpers

---

### 2. Auth Configuration (`src/lib/auth/auth-config.ts`)

Configures providers, callbacks, and session strategy.

```typescript
import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { prisma } from "@/lib/db/prisma"

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: "jwt",  // Use JWT for serverless compatibility
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user, account }) { /* ... */ },
    async session({ session, token }) { /* ... */ },
    async signIn({ user, account, profile }) { /* ... */ },
    async redirect({ url, baseUrl }) { /* ... */ },
  },
  pages: {
    signIn: "/he/sign-in",
    error: "/he/error",
  },
  secret: process.env.NEXTAUTH_SECRET,
}
```

**Important Callbacks:**

#### `jwt` callback
- Runs when JWT is created or updated
- Add custom data to the token (userId, organizationId, role)

#### `session` callback
- Runs when session is accessed
- Transfers data from token to session object

#### `signIn` callback
- Runs on user sign-in
- Create user/organization if first login
- Update `lastActive` timestamp

#### `redirect` callback
- Handles post-login redirects
- Ensures locale prefix is added to URLs

---

### 3. API Route (`src/app/api/auth/[...nextauth]/route.ts`)

**CRITICAL:** Must import handlers from `auth-instance.ts`, NOT create a new instance.

```typescript
import { GET, POST } from "@/lib/auth/auth-instance"

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export { GET, POST }
```

**Why this matters:**
- NextAuth v5 requires handlers to be exported from the same instance used throughout the app
- Creating a new instance will cause "handler is not a function" errors
- The handlers must be at `/api/auth/[...nextauth]` (NOT `/api/auth/`)

---

## Middleware Configuration

### Root Middleware (`middleware.ts`)

Handles both authentication and internationalization. **Critical configuration:**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import createIntlMiddleware from 'next-intl/middleware'

const intlMiddleware = createIntlMiddleware({
  locales: ['he', 'en'],
  defaultLocale: 'he',
  localePrefix: 'always',
})

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // ⚠️ CRITICAL: Bypass intl middleware for ALL API routes
  if (pathname.startsWith('/api')) {
    return NextResponse.next()  // ← DO NOT use intlMiddleware here!
  }

  // Get token for auth checks
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  // Protected route logic...
  const isProtectedRoute = ['/dashboard', '/projects', /* ... */].some(
    route => pathname.includes(route)
  )

  if (isProtectedRoute && !token) {
    const signInUrl = new URL(`/${locale}/sign-in`, request.url)
    return NextResponse.redirect(signInUrl)
  }

  // Apply intl middleware for all other routes
  return intlMiddleware(request)
}

export const config = {
  matcher: [
    // Skip Next.js internals, API routes, and all static files
    '/((?!api|_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
  ],
}
```

**Critical Points:**

1. **ALL API routes must bypass intl middleware**
   - **CRITICAL:** `/api/*` should return `NextResponse.next()` directly
   - DO NOT pass ANY API routes through `intlMiddleware()` or locale prefixes will be added
   - This causes 404 errors like `/he/api/projects` or `/he/api/auth/session`
   - API routes should NEVER have locale prefixes

2. **Matcher configuration**
   - Must exclude `/api` from the matcher entirely
   - Current config: `/((?!api|_next|...).*)`  - excludes API routes and Next.js internals

3. **Token validation**
   - Use `getToken()` from `next-auth/jwt` in middleware
   - Wrap in try-catch to handle invalid tokens gracefully

---

## Environment Variables

### Required Variables

```bash
# NextAuth
NEXTAUTH_URL=https://app.moodboard.co.il
NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>

# Google OAuth
GOOGLE_CLIENT_ID=<from-gcp-console>
GOOGLE_CLIENT_SECRET=<from-gcp-console>

# Database
DATABASE_URL=<your-database-url>
```

### Generating NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

---

## Google OAuth Setup

### 1. GCP Console Configuration

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Create or edit OAuth 2.0 Client ID

### 2. Authorized JavaScript Origins

Add all domains where your app runs:

```
http://localhost:3000
https://app.moodboard.co.il
```

### 3. Authorized Redirect URIs

NextAuth requires the `/api/auth/callback/google` endpoint:

```
http://localhost:3000/api/auth/callback/google
https://app.moodboard.co.il/api/auth/callback/google
```

**Important:**
- NO trailing slashes
- NO locale prefixes (NOT `/he/api/auth/...`)
- Exact match required

---

## Helper Functions

### Get Current User

```typescript
import { getCurrentUser } from '@/lib/auth/auth'

// In Server Components or Route Handlers
const user = await getCurrentUser()

if (user) {
  console.log(user.id, user.email, user.organizationId)
}
```

### Require Authentication

```typescript
import { requireAuth } from '@/lib/auth/auth'

// Redirects to sign-in if not authenticated
const user = await requireAuth()
```

### Require Organization

```typescript
import { requireOrganization } from '@/lib/auth/auth'

// Ensures user has an organization, redirects to onboarding if not
const { user, organizationId } = await requireOrganization()
```

### Check Permissions

```typescript
import { hasPermission } from '@/lib/auth/auth'

const canEditProject = await hasPermission(
  userId,
  'project:edit',
  organizationId
)
```

---

## Session Management

### Client-Side (React)

Use NextAuth's `useSession` hook:

```typescript
import { useSession } from 'next-auth/react'

function MyComponent() {
  const { data: session, status } = useSession()

  if (status === 'loading') return <Spinner />
  if (status === 'unauthenticated') return <SignIn />

  return <div>Welcome {session.user.name}</div>
}
```

### Server-Side (Server Components)

Use the `auth()` function:

```typescript
import { auth } from '@/lib/auth/auth-instance'

export default async function Page() {
  const session = await auth()

  if (!session) {
    redirect('/sign-in')
  }

  return <div>Welcome {session.user.name}</div>
}
```

### API Routes

```typescript
import { auth } from '@/lib/auth/auth-instance'

export async function GET(req: Request) {
  const session = await auth()

  if (!session) {
    return new Response('Unauthorized', { status: 401 })
  }

  return Response.json({ data: 'protected' })
}
```

---

## User Creation Flow

When a user signs in with Google for the first time:

1. **Check if user exists** in database by email
2. **If new user:**
   - Create organization with slug from email
   - Create user with `designer_owner` role
   - Link account record (provider: google)
   - Set default permissions: `["*"]` (full access)
3. **If existing user:**
   - Update `lastActive` timestamp
4. **Add to session:**
   - User ID
   - Organization ID
   - Role
   - Organization details

---

## Common Issues & Solutions

### 1. "Couldn't find next-intl config file"

**Cause:** API routes were being passed through intl middleware.

**Solution:** In `middleware.ts`:
```typescript
if (pathname.startsWith('/api')) {
  return NextResponse.next()  // Bypass intl middleware for ALL API routes
}
```

### 2. "GET /he/api/[route] 404" (e.g., `/he/api/projects`, `/he/api/auth/session`)

**Cause:** Intl middleware added locale prefix to API routes.

**Solution:** Same as above - bypass intl middleware for ALL `/api/*` routes

**Key Point:** API routes should NEVER have locale prefixes. The middleware must return `NextResponse.next()` for ALL paths starting with `/api`.

### 3. "TypeError: handler is not a function"

**Cause:** Route handler created new NextAuth instance instead of importing from `auth-instance.ts`.

**Solution:** In `/api/auth/[...nextauth]/route.ts`:
```typescript
import { GET, POST } from "@/lib/auth/auth-instance"
export { GET, POST }
```

### 4. "redirect_uri_mismatch" (Google OAuth)

**Cause:** Redirect URI in GCP Console doesn't match actual callback URL.

**Solution:**
- Check exact URL in error message
- Update GCP Console with exact match
- Remove locale prefixes if present

### 5. Session not persisting

**Cause:** Cookie domain or NEXTAUTH_URL mismatch.

**Solution:**
- Set `NEXTAUTH_URL` to your actual domain
- In production: `https://app.moodboard.co.il`
- In development: `http://localhost:3000`

---

## Security Best Practices

### 1. Environment Variables

- ✅ **NEVER** commit `.env` files to git
- ✅ Use `.env.local` for local development
- ✅ Set environment variables in Vercel for production
- ✅ Rotate `NEXTAUTH_SECRET` periodically

### 2. RBAC (Role-Based Access Control)

- ✅ Check permissions on **server-side** (not just client)
- ✅ Validate `organizationId` in all queries
- ✅ Use middleware for route-level protection
- ✅ Implement granular permissions (`project:edit`, `client:delete`, etc.)

### 3. Database Queries

- ✅ Always scope by `organizationId`
- ✅ Verify user belongs to organization
- ✅ Use Prisma's `include` carefully to avoid data leaks

### 4. Token Security

- ✅ Use JWT for stateless authentication
- ✅ Set appropriate session expiry (30 days)
- ✅ Use httpOnly cookies (NextAuth default)
- ✅ Enable CSRF protection (NextAuth default)

---

## Testing Authentication

### Manual Testing

1. **Sign In Flow**
   ```
   Visit: http://localhost:3000/he/sign-in
   Click: "Sign in with Google"
   Expected: Redirect to Google OAuth consent
   Expected: Redirect back to /he/dashboard after approval
   ```

2. **Session Endpoint**
   ```bash
   curl http://localhost:3000/api/auth/session
   # Should return session JSON or null
   ```

3. **Protected Routes**
   ```
   Visit: http://localhost:3000/he/dashboard (signed out)
   Expected: Redirect to /he/sign-in
   ```

### Testing Checklist

- [ ] Sign in with Google works
- [ ] Session persists after page refresh
- [ ] Sign out clears session
- [ ] Protected routes redirect to sign-in
- [ ] Middleware doesn't add locale to `/api/auth/*`
- [ ] User and organization created on first sign-in
- [ ] `lastActive` updates on subsequent sign-ins

---

## Deployment Considerations

### Vercel Deployment

1. **Environment Variables:**
   - Set all required env vars in Vercel dashboard
   - Use different values for Preview vs Production

2. **Domain Configuration:**
   - Update `NEXTAUTH_URL` to match custom domain
   - Update Google OAuth redirect URIs

3. **Build Configuration:**
   - Ensure Prisma generates client during build
   - Verify serverless function timeout (60s for auth operations)

### Multi-Region Deployment

- JWT sessions work well with multi-region
- No need for session database or Redis
- Stateless authentication scales horizontally

---

## Debugging

### Enable Debug Logging

In `.env.local`:
```bash
NEXTAUTH_DEBUG=true
NODE_ENV=development
```

### Common Log Messages

```
[auth][warn][debug-enabled]
  → Debug mode is enabled, not for production use

[auth][error][callback_error]
  → Error in callback, check your callback implementation

[auth][error][signin_error]
  → Error during sign in, check provider configuration
```

### Useful Commands

```bash
# Test session endpoint
curl http://localhost:3000/api/auth/session

# Check middleware routes
curl -I http://localhost:3000/he/dashboard

# View NextAuth routes
curl http://localhost:3000/api/auth/providers
```

---

## Migration Notes

### From NextAuth v4 to v5

If migrating from v4, key changes:

1. **Import changes:**
   - ~~`import { getServerSession } from 'next-auth'`~~
   - ✅ `import { auth } from '@/lib/auth/auth-instance'`

2. **Handler export:**
   - ~~`export default NextAuth(authOptions)`~~
   - ✅ `export const { GET, POST } = handlers`

3. **Session access:**
   - ~~`const session = await getServerSession(authOptions)`~~
   - ✅ `const session = await auth()`

4. **Configuration:**
   - JWT strategy is more explicitly required
   - Callbacks have slightly different signatures

---

## Additional Resources

- [NextAuth.js v5 Documentation](https://authjs.dev/)
- [Google OAuth Setup Guide](https://console.cloud.google.com/apis/credentials)
- [JWT Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)
- [MoodB RBAC Implementation](./RBAC.md)

---

## Support

For authentication issues:
1. Check this documentation
2. Review error logs in Vercel
3. Verify environment variables
4. Test middleware configuration
5. Consult [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

---

**Last Updated:** 2025-01-05
**Version:** 1.0.0
