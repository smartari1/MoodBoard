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
  let token = null
  try {
    token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    })
  } catch (error) {
    console.error('Error getting token in middleware:', error)
    // If token validation fails, treat as unauthenticated
    token = null
  }

  // Check authentication for protected routes
  if (isProtectedRoute && !token) {
    const signInUrl = new URL(`/${locale}/sign-in`, request.url)
    signInUrl.searchParams.set('redirect_url', pathname)
    return NextResponse.redirect(signInUrl)
  }

  // Check admin access
  if (isAdminRoute && token && token.role !== 'admin') {
    const dashboardUrl = new URL(`/${locale}/dashboard`, request.url)
    return NextResponse.redirect(dashboardUrl)
  }

  // Redirect authenticated users away from auth pages to prevent loops
  if (isAuthPage && token) {
    // Check if we're in a redirect loop by checking referrer
    const referer = request.headers.get('referer')
    const redirectUrl = request.nextUrl.searchParams.get('redirect_url')

    // If redirect_url is also an auth page, ignore it to prevent loops
    if (redirectUrl && (redirectUrl.includes('/sign-in') || redirectUrl.includes('/sign-up'))) {
      const dashboardUrl = new URL(`/${locale}/dashboard`, request.url)
      return NextResponse.redirect(dashboardUrl)
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
      return NextResponse.redirect(url)
    }
  }

  // Handle i18n routing
  return intlMiddleware(request)
}

export const config = {
  matcher: [
    // Skip Next.js internals, API routes, and all static files
    '/((?!api|_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
  ],
}
