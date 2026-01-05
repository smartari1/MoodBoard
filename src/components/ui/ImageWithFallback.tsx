'use client'

import { useState, useCallback, useEffect } from 'react'
import { Image, Box, Skeleton, Text, Stack } from '@mantine/core'
import { IconPhoto, IconRefresh } from '@tabler/icons-react'

interface ImageWithFallbackProps {
  src: string | undefined | null
  alt: string
  height?: number | string
  width?: number | string
  fit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down'
  radius?: string | number
  style?: React.CSSProperties
  fallbackColor?: string
  maxRetries?: number
  retryDelay?: number
  showRetryButton?: boolean
  onClick?: () => void
}

/**
 * Image component with automatic retry on failure and fallback placeholder
 *
 * Features:
 * - Automatic retry with exponential backoff
 * - Loading skeleton state
 * - Fallback placeholder on final failure
 * - Manual retry button option
 * - Handles QUIC protocol errors and network issues
 */
export function ImageWithFallback({
  src,
  alt,
  height = 200,
  width = '100%',
  fit = 'cover',
  radius,
  style,
  fallbackColor = '#e0e0d8',
  maxRetries = 3,
  retryDelay = 1000,
  showRetryButton = true,
  onClick,
}: ImageWithFallbackProps) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading')
  const [retryCount, setRetryCount] = useState(0)
  const [currentSrc, setCurrentSrc] = useState<string | null>(null)

  // Reset state when src changes
  useEffect(() => {
    if (src) {
      setStatus('loading')
      setRetryCount(0)
      // Add cache-busting param to force fresh load
      setCurrentSrc(src)
    } else {
      setStatus('error')
    }
  }, [src])

  const handleError = useCallback(() => {
    if (retryCount < maxRetries) {
      // Exponential backoff: 1s, 2s, 4s
      const delay = retryDelay * Math.pow(2, retryCount)

      setTimeout(() => {
        setRetryCount((prev) => prev + 1)
        // Add cache-busting param to bypass browser cache
        const cacheBuster = `_retry=${Date.now()}`
        const separator = src?.includes('?') ? '&' : '?'
        setCurrentSrc(`${src}${separator}${cacheBuster}`)
        setStatus('loading')
      }, delay)
    } else {
      setStatus('error')
    }
  }, [retryCount, maxRetries, retryDelay, src])

  const handleLoad = useCallback(() => {
    setStatus('loaded')
  }, [])

  const handleManualRetry = useCallback(() => {
    setRetryCount(0)
    const cacheBuster = `_retry=${Date.now()}`
    const separator = src?.includes('?') ? '&' : '?'
    setCurrentSrc(`${src}${separator}${cacheBuster}`)
    setStatus('loading')
  }, [src])

  // No src provided
  if (!src) {
    return (
      <Box
        style={{
          height,
          width,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: fallbackColor,
          borderRadius: radius,
          ...style,
        }}
        onClick={onClick}
      >
        <IconPhoto size={48} color="#999" />
      </Box>
    )
  }

  // Loading state
  if (status === 'loading') {
    return (
      <Box style={{ position: 'relative', height, width, ...style }} onClick={onClick}>
        <Skeleton height={height} width={width} radius={radius} />
        {/* Hidden image for loading */}
        <img
          src={currentSrc || src}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          style={{
            position: 'absolute',
            width: 1,
            height: 1,
            opacity: 0,
            pointerEvents: 'none',
          }}
        />
        {retryCount > 0 && (
          <Box
            style={{
              position: 'absolute',
              bottom: 8,
              right: 8,
              backgroundColor: 'rgba(0,0,0,0.5)',
              color: 'white',
              padding: '2px 6px',
              borderRadius: 4,
              fontSize: 10,
            }}
          >
            Retry {retryCount}/{maxRetries}
          </Box>
        )}
      </Box>
    )
  }

  // Error state - show fallback
  if (status === 'error') {
    return (
      <Box
        style={{
          height,
          width,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: fallbackColor,
          borderRadius: radius,
          cursor: showRetryButton ? 'pointer' : 'default',
          ...style,
        }}
        onClick={showRetryButton ? handleManualRetry : onClick}
      >
        <Stack align="center" gap={4}>
          <IconPhoto size={32} color="#999" />
          {showRetryButton && (
            <Box
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                color: '#666',
                fontSize: 12,
              }}
            >
              <IconRefresh size={14} />
              <Text size="xs" c="dimmed">
                לחץ לניסיון חוזר
              </Text>
            </Box>
          )}
        </Stack>
      </Box>
    )
  }

  // Loaded state - show image
  return (
    <Image
      src={currentSrc || src}
      alt={alt}
      height={height}
      width={width}
      fit={fit}
      radius={radius}
      style={style}
      onClick={onClick}
    />
  )
}

export default ImageWithFallback
