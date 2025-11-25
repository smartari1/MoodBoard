'use client'

import { useCallback, useMemo, useTransition } from 'react'
import { usePathname, useRouter, useParams } from 'next/navigation'
import { locales, defaultLocale, type Locale } from '@/i18n/request'

/**
 * useRouting Hook
 * Centralized routing utilities for locale-aware navigation
 *
 * Usage:
 *   const { locale, localizedHref, isActive, navigate } = useRouting()
 *
 *   // Get localized href
 *   const href = localizedHref('/dashboard')  // => '/he/dashboard'
 *
 *   // Check if link is active
 *   const active = isActive('/dashboard')  // true if on /he/dashboard
 *
 *   // Navigate with loading state
 *   navigate('/projects')  // navigates to /he/projects with transition
 */

interface UseRoutingReturn {
  /** Current locale extracted from pathname */
  locale: Locale
  /** Current pathname */
  pathname: string
  /** Whether a navigation is in progress */
  isPending: boolean
  /** Get a localized href for a path */
  localizedHref: (path: string) => string
  /** Check if a path is currently active (exact or starts with) */
  isActive: (path: string, exact?: boolean) => boolean
  /** Check if a path is exactly the current path */
  isExactActive: (path: string) => boolean
  /** Navigate to a path with transition (shows loading state) */
  navigate: (path: string) => void
  /** Prefetch a path for faster navigation */
  prefetch: (path: string) => void
  /** Switch to a different locale */
  switchLocale: (newLocale: Locale) => void
}

export function useRouting(): UseRoutingReturn {
  const router = useRouter()
  const pathname = usePathname() || ''
  const params = useParams()
  const [isPending, startTransition] = useTransition()

  // Extract locale from params or pathname
  const locale = useMemo((): Locale => {
    // First try params (most reliable in app router)
    if (params?.locale && locales.includes(params.locale as Locale)) {
      return params.locale as Locale
    }

    // Fallback to pathname extraction
    const pathParts = pathname.split('/').filter(Boolean)
    if (pathParts[0] && locales.includes(pathParts[0] as Locale)) {
      return pathParts[0] as Locale
    }

    return defaultLocale
  }, [params?.locale, pathname])

  // Get the pathname without locale prefix
  const pathnameWithoutLocale = useMemo(() => {
    const parts = pathname.split('/').filter(Boolean)
    if (parts[0] && locales.includes(parts[0] as Locale)) {
      return '/' + parts.slice(1).join('/')
    }
    return pathname
  }, [pathname])

  // Create a localized href
  const localizedHref = useCallback((path: string): string => {
    // If path already has locale, return as-is
    const pathParts = path.split('/').filter(Boolean)
    if (pathParts[0] && locales.includes(pathParts[0] as Locale)) {
      return path
    }

    // Add locale prefix
    const cleanPath = path.startsWith('/') ? path : `/${path}`
    return `/${locale}${cleanPath}`
  }, [locale])

  // Check if a path is active (segment-based matching)
  const isActive = useCallback((path: string, exact = false): boolean => {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`

    if (exact) {
      return pathnameWithoutLocale === normalizedPath
    }

    // Segment-based matching to avoid /materials matching /materials-new
    const currentSegments = pathnameWithoutLocale.split('/').filter(Boolean)
    const targetSegments = normalizedPath.split('/').filter(Boolean)

    // Check if all target segments match the beginning of current segments
    if (targetSegments.length === 0) {
      return currentSegments.length === 0
    }

    for (let i = 0; i < targetSegments.length; i++) {
      if (currentSegments[i] !== targetSegments[i]) {
        return false
      }
    }

    return true
  }, [pathnameWithoutLocale])

  // Check exact match
  const isExactActive = useCallback((path: string): boolean => {
    return isActive(path, true)
  }, [isActive])

  // Navigate with transition
  const navigate = useCallback((path: string) => {
    const href = localizedHref(path)
    startTransition(() => {
      router.push(href)
    })
  }, [router, localizedHref])

  // Prefetch a path
  const prefetch = useCallback((path: string) => {
    const href = localizedHref(path)
    router.prefetch(href)
  }, [router, localizedHref])

  // Switch locale
  const switchLocale = useCallback((newLocale: Locale) => {
    if (!locales.includes(newLocale)) return

    const newPath = `/${newLocale}${pathnameWithoutLocale}`
    startTransition(() => {
      router.push(newPath)
    })
  }, [router, pathnameWithoutLocale])

  return {
    locale,
    pathname,
    isPending,
    localizedHref,
    isActive,
    isExactActive,
    navigate,
    prefetch,
    switchLocale,
  }
}

/**
 * useCurrentLocale Hook
 * Simple hook to get just the current locale
 *
 * Usage:
 *   const locale = useCurrentLocale()  // 'he' or 'en'
 */
export function useCurrentLocale(): Locale {
  const params = useParams()
  const pathname = usePathname() || ''

  return useMemo((): Locale => {
    // First try params
    if (params?.locale && locales.includes(params.locale as Locale)) {
      return params.locale as Locale
    }

    // Fallback to pathname
    const pathParts = pathname.split('/').filter(Boolean)
    if (pathParts[0] && locales.includes(pathParts[0] as Locale)) {
      return pathParts[0] as Locale
    }

    return defaultLocale
  }, [params?.locale, pathname])
}

/**
 * useLocalizedHref Hook
 * Simple hook to create localized hrefs
 *
 * Usage:
 *   const href = useLocalizedHref('/dashboard')  // '/he/dashboard'
 */
export function useLocalizedHref(path: string): string {
  const locale = useCurrentLocale()

  return useMemo(() => {
    const pathParts = path.split('/').filter(Boolean)
    if (pathParts[0] && locales.includes(pathParts[0] as Locale)) {
      return path
    }

    const cleanPath = path.startsWith('/') ? path : `/${path}`
    return `/${locale}${cleanPath}`
  }, [locale, path])
}

/**
 * useIsActiveLink Hook
 * Check if a specific link is active
 *
 * Usage:
 *   const isActive = useIsActiveLink('/dashboard')  // true/false
 */
export function useIsActiveLink(path: string, exact = false): boolean {
  const pathname = usePathname() || ''

  return useMemo(() => {
    // Get pathname without locale
    const parts = pathname.split('/').filter(Boolean)
    let pathnameWithoutLocale = pathname
    if (parts[0] && locales.includes(parts[0] as Locale)) {
      pathnameWithoutLocale = '/' + parts.slice(1).join('/')
    }

    const normalizedPath = path.startsWith('/') ? path : `/${path}`

    if (exact) {
      return pathnameWithoutLocale === normalizedPath
    }

    // Segment-based matching
    const currentSegments = pathnameWithoutLocale.split('/').filter(Boolean)
    const targetSegments = normalizedPath.split('/').filter(Boolean)

    if (targetSegments.length === 0) {
      return currentSegments.length === 0
    }

    for (let i = 0; i < targetSegments.length; i++) {
      if (currentSegments[i] !== targetSegments[i]) {
        return false
      }
    }

    return true
  }, [pathname, path, exact])
}
