'use client'

import { Suspense, useEffect, useState, useTransition } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { Progress, Box } from '@mantine/core'

/**
 * NavigationProgressInner Component
 * Internal component that uses useSearchParams (requires Suspense boundary)
 */
function NavigationProgressInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isNavigating, setIsNavigating] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // Reset progress when navigation completes
    setIsNavigating(false)
    setProgress(0)
  }, [pathname, searchParams])

  useEffect(() => {
    if (!isNavigating) return

    // Simulate progress during navigation
    const timer1 = setTimeout(() => setProgress(30), 100)
    const timer2 = setTimeout(() => setProgress(60), 300)
    const timer3 = setTimeout(() => setProgress(80), 600)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
    }
  }, [isNavigating])

  // Listen for navigation start via click events on links
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const anchor = target.closest('a')

      if (anchor && anchor.href) {
        const url = new URL(anchor.href, window.location.origin)

        // Only show progress for internal navigation
        if (url.origin === window.location.origin) {
          // Don't show for same page links or hash links
          if (url.pathname !== pathname || url.search !== window.location.search) {
            setIsNavigating(true)
            setProgress(10)
          }
        }
      }
    }

    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [pathname])

  if (!isNavigating) return null

  return (
    <Box
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
      }}
    >
      <Progress
        value={progress}
        size="xs"
        color="brand"
        radius={0}
        transitionDuration={200}
        styles={{
          root: {
            backgroundColor: 'transparent',
          },
        }}
      />
    </Box>
  )
}

/**
 * NavigationProgress Component
 * Shows a progress bar at the top of the page during route transitions
 * Wrapped in Suspense for useSearchParams compatibility
 */
export function NavigationProgress() {
  return (
    <Suspense fallback={null}>
      <NavigationProgressInner />
    </Suspense>
  )
}

/**
 * useNavigationProgress Hook
 * For programmatic navigation with progress indication
 *
 * Usage:
 *   const { startNavigation, isNavigating } = useNavigationProgress()
 *   startNavigation(() => router.push('/new-page'))
 */
export function useNavigationProgress() {
  const [isPending, startTransition] = useTransition()

  const startNavigation = (callback: () => void) => {
    startTransition(() => {
      callback()
    })
  }

  return {
    isNavigating: isPending,
    startNavigation,
  }
}
