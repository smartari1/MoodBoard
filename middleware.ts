import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import createIntlMiddleware from 'next-intl/middleware'
import { locales, defaultLocale } from './src/i18n/request'

// Create intl middleware
const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
})

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Skip ALL API routes completely - API routes should never have locale prefix
  if (pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  // Extract locale from pathname
  const pathParts = pathname.split('/').filter(Boolean)
  const locale = (pathParts[0] && locales.includes(pathParts[0] as any)) ? pathParts[0] : defaultLocale

  // Public routes (auth pages)
  const isSignInPage = pathname.includes('/sign-in')
  const isSignUpPage = pathname.includes('/sign-up')
  const isAuthPage = isSignInPage || isSignUpPage

  // Protected routes require authentication
  const protectedRoutes = ['/dashboard', '/projects', '/clients', '/styles', '/materials', '/budget', '/settings', '/onboarding', '/admin']
  const isProtectedRoute = protectedRoutes.some(route => pathname.includes(route))
  const isAdminRoute = pathname.includes('/admin')

  // Try to get token, with error handling
  // Must match cookie configuration in auth-config.ts
  const cookieName = process.env.NODE_ENV === 'production'
    ? '__Secure-authjs.session-token'
    : 'authjs.session-token'

  let token = null
  let hasInvalidToken = false

  // Debug: Check if cookies exist
  const hasDevCookie = request.cookies.has('authjs.session-token')
  const hasProdCookie = request.cookies.has('__Secure-authjs.session-token')

  if (isProtectedRoute) {
    console.log('[Middleware]', {
      path: pathname,
      hasDevCookie,
      hasProdCookie,
      cookieName,
      env: process.env.NODE_ENV,
    })
  }

  try {
    token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
      cookieName: cookieName,
      // Use raw mode to get the token directly without additional processing
      raw: false,
    })

    if (isProtectedRoute) {
      console.log('[Middleware] Token result:', token ? { userId: token.id, email: token.email } : 'null')
    }
  } catch (error) {
    console.error('[Middleware] Error getting token:', error)
    // If token validation fails, treat as unauthenticated and mark for cookie cleanup
    token = null
    hasInvalidToken = true
  }

  // If token is invalid or expired, clear the session cookies
  if (hasInvalidToken || (!token && (hasDevCookie || hasProdCookie))) {
    // We have a cookie but no valid token - means the session is invalid/expired
    hasInvalidToken = true
    console.log('[Middleware] Invalid token detected, will clear cookies')
  }

  // Check authentication for protected routes
  if (isProtectedRoute && !token) {
    // Prevent redirect loop with cookie-based counter
    const redirectCountCookie = request.cookies.get('_redirect_count')
    const redirectCount = redirectCountCookie ? parseInt(redirectCountCookie.value) : 0

    // If we've redirected too many times (>2), allow through to prevent infinite loop
    // This is a safety net but shouldn't normally trigger
    if (redirectCount > 2) {
      console.warn('Exceeded redirect limit, allowing request through to prevent loop')
      // Clear the counter cookie and apply i18n
      const response = intlMiddleware(request)
      response.cookies.delete('_redirect_count')
      return response
    }

    // Increment redirect counter
    const signInUrl = new URL(`/${locale}/sign-in`, request.url)
    signInUrl.searchParams.set('redirect_url', pathname)
    const response = NextResponse.redirect(signInUrl)

    // Set short-lived cookie (30 seconds) to track redirect count
    response.cookies.set('_redirect_count', String(redirectCount + 1), {
      maxAge: 30,
      httpOnly: true,
      sameSite: 'lax',
    })

    // Clear invalid session cookies to prevent stale session issues
    if (hasInvalidToken) {
      response.cookies.delete('authjs.session-token')
      response.cookies.delete('__Secure-authjs.session-token')
    }

    return response
  }

  // Check admin access
  if (isAdminRoute && token && token.role !== 'admin') {
    const dashboardUrl = new URL(`/${locale}/dashboard`, request.url)
    return NextResponse.redirect(dashboardUrl)
  }

  // Redirect authenticated users away from auth pages to prevent loops
  if (isAuthPage && token) {
    const redirectUrl = request.nextUrl.searchParams.get('redirect_url')

    // If redirect_url is also an auth page, ignore it to prevent loops
    if (redirectUrl && (redirectUrl.includes('/sign-in') || redirectUrl.includes('/sign-up'))) {
      const dashboardUrl = new URL(`/${locale}/dashboard`, request.url)
      const response = NextResponse.redirect(dashboardUrl)
      // Clear redirect counter when user successfully authenticates
      response.cookies.delete('_redirect_count')
      return response
    }

    // Use redirect_url if provided, otherwise go to dashboard
    const targetUrl = redirectUrl || `/${locale}/dashboard`

    // Ensure target has locale prefix
    const finalTarget = targetUrl.startsWith(`/${locale}/`)
      ? targetUrl
      : `/${locale}${targetUrl.startsWith('/') ? targetUrl : '/' + targetUrl}`

    // Only redirect if we're not already going there (prevent loop)
    if (pathname !== finalTarget) {
      const url = new URL(finalTarget, request.url)
      const response = NextResponse.redirect(url)
      // Clear redirect counter when user successfully authenticates
      response.cookies.delete('_redirect_count')
      return response
    }
  }

  // Handle i18n routing and clear redirect counter on successful access
  const response = intlMiddleware(request)
  // Clear redirect counter when user successfully accesses any page
  if (request.cookies.has('_redirect_count')) {
    response.cookies.delete('_redirect_count')
  }
  return response
}

export const config = {
  matcher: [
    // Skip Next.js internals, API routes, and all static files
    '/((?!api|_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
  ],
}
