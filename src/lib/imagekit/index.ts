/**
 * ImageKit CDN Service
 * Optimizes and transforms images from Google Cloud Storage via ImageKit CDN
 *
 * Benefits:
 * - Automatic WebP/AVIF conversion (60-80% smaller files)
 * - Global CDN delivery (50+ edge locations)
 * - On-the-fly resizing and transformations
 * - Blur placeholder (LQIP) generation
 * - Cached delivery in 10-20ms
 */

// Configuration
const IMAGEKIT_URL_ENDPOINT = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || ''
const GCP_BUCKET_NAME = process.env.NEXT_PUBLIC_GCP_BUCKET_NAME || 'moodb-assets'
const GCP_PUBLIC_URL = `https://storage.googleapis.com/${GCP_BUCKET_NAME}`

// Check if ImageKit is configured
export const isImageKitEnabled = (): boolean => {
  return !!IMAGEKIT_URL_ENDPOINT && IMAGEKIT_URL_ENDPOINT.length > 0
}

/**
 * Image transformation options
 */
export interface ImageKitTransformOptions {
  /** Width in pixels */
  width?: number
  /** Height in pixels */
  height?: number
  /** Quality (1-100), default 80 */
  quality?: number
  /** Auto format (webp/avif based on browser) */
  format?: 'auto' | 'webp' | 'avif' | 'jpg' | 'png'
  /** Fit mode */
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside'
  /** Focus area for cropping */
  focus?: 'auto' | 'center' | 'top' | 'bottom' | 'left' | 'right' | 'face'
  /** Blur amount (1-100) for LQIP placeholders */
  blur?: number
  /** Grayscale */
  grayscale?: boolean
  /** Progressive loading */
  progressive?: boolean
  /** DPR (device pixel ratio) */
  dpr?: number
}

/**
 * Preset transformations for common use cases
 */
export const ImageKitPresets = {
  /** Thumbnail for lists/grids - 400px, quality 75 */
  thumbnail: { width: 400, quality: 75, format: 'auto' as const },

  /** Card image - 600px, quality 80 */
  card: { width: 600, quality: 80, format: 'auto' as const },

  /** Detail view - 1200px, quality 85 */
  detail: { width: 1200, quality: 85, format: 'auto' as const },

  /** Hero/banner - 1920px, quality 85 */
  hero: { width: 1920, quality: 85, format: 'auto' as const },

  /** Full quality - original size, quality 90 */
  full: { quality: 90, format: 'auto' as const },

  /** Blur placeholder (LQIP) - tiny 20px blurred */
  placeholder: { width: 20, quality: 30, blur: 30, format: 'auto' as const },

  /** Avatar/profile - 200px square */
  avatar: { width: 200, height: 200, fit: 'cover' as const, focus: 'face' as const, format: 'auto' as const },

  /** Material/texture swatch - 300px square */
  swatch: { width: 300, height: 300, fit: 'cover' as const, quality: 80, format: 'auto' as const },
} as const

/**
 * Build ImageKit transformation string from options
 */
function buildTransformString(options: ImageKitTransformOptions): string {
  const transforms: string[] = []

  if (options.width) transforms.push(`w-${options.width}`)
  if (options.height) transforms.push(`h-${options.height}`)
  if (options.quality) transforms.push(`q-${options.quality}`)
  if (options.format === 'auto') transforms.push('f-auto')
  else if (options.format) transforms.push(`f-${options.format}`)

  if (options.fit) {
    const fitMap: Record<string, string> = {
      cover: 'c-maintain_ratio',
      contain: 'c-at_max',
      fill: 'c-force',
      inside: 'c-at_max',
      outside: 'c-at_least',
    }
    if (fitMap[options.fit]) transforms.push(fitMap[options.fit])
  }

  if (options.focus) {
    const focusMap: Record<string, string> = {
      auto: 'fo-auto',
      center: 'fo-center',
      top: 'fo-top',
      bottom: 'fo-bottom',
      left: 'fo-left',
      right: 'fo-right',
      face: 'fo-face',
    }
    if (focusMap[options.focus]) transforms.push(focusMap[options.focus])
  }

  if (options.blur) transforms.push(`bl-${options.blur}`)
  if (options.grayscale) transforms.push('e-grayscale')
  if (options.progressive !== false) transforms.push('pr-true')
  if (options.dpr && options.dpr > 1) transforms.push(`dpr-${options.dpr}`)

  return transforms.length > 0 ? `tr=${transforms.join(',')}` : ''
}

/**
 * Extract path from GCS URL
 */
function extractPathFromGCSUrl(url: string): string | null {
  if (!url) return null

  // Handle GCS URLs
  if (url.includes('storage.googleapis.com')) {
    // Format: https://storage.googleapis.com/bucket-name/path/to/image.jpg
    const match = url.match(/storage\.googleapis\.com\/[^/]+\/(.+)/)
    return match ? match[1] : null
  }

  // Handle already-transformed ImageKit URLs - extract original path
  if (url.includes('ik.imagekit.io')) {
    const match = url.match(/ik\.imagekit\.io\/[^/]+\/(.+?)(\?|$)/)
    return match ? match[1] : null
  }

  // Handle relative paths or other formats
  if (url.startsWith('/')) {
    return url.slice(1)
  }

  // If it's just a path, return as-is
  if (!url.startsWith('http')) {
    return url
  }

  return null
}

/**
 * Get optimized ImageKit URL for a GCS image
 * Falls back to original URL if ImageKit is not configured
 */
export function getOptimizedImageUrl(
  originalUrl: string | null | undefined,
  options: ImageKitTransformOptions = {}
): string {
  // Return empty string for null/undefined
  if (!originalUrl) return ''

  // Skip blob URLs (local previews)
  if (originalUrl.startsWith('blob:')) return originalUrl

  // Skip data URLs
  if (originalUrl.startsWith('data:')) return originalUrl

  // If ImageKit is not configured, return original URL
  if (!isImageKitEnabled()) return originalUrl

  // Extract path from GCS URL
  const path = extractPathFromGCSUrl(originalUrl)
  if (!path) return originalUrl

  // Build transformation string
  const transformString = buildTransformString(options)

  // Build ImageKit URL
  const baseUrl = `${IMAGEKIT_URL_ENDPOINT}/${path}`
  return transformString ? `${baseUrl}?${transformString}` : baseUrl
}

/**
 * Get optimized URL using a preset
 */
export function getOptimizedImageUrlWithPreset(
  originalUrl: string | null | undefined,
  preset: keyof typeof ImageKitPresets
): string {
  return getOptimizedImageUrl(originalUrl, ImageKitPresets[preset])
}

/**
 * Get blur placeholder URL for progressive loading
 */
export function getBlurPlaceholderUrl(originalUrl: string | null | undefined): string {
  return getOptimizedImageUrl(originalUrl, ImageKitPresets.placeholder)
}

/**
 * Get responsive image srcSet for different screen sizes
 */
export function getResponsiveSrcSet(
  originalUrl: string | null | undefined,
  options: {
    widths?: number[]
    quality?: number
    format?: 'auto' | 'webp' | 'avif'
  } = {}
): string {
  if (!originalUrl || !isImageKitEnabled()) return ''

  const widths = options.widths || [320, 640, 960, 1280, 1920]
  const quality = options.quality || 80
  const format = options.format || 'auto'

  return widths
    .map((width) => {
      const url = getOptimizedImageUrl(originalUrl, { width, quality, format })
      return `${url} ${width}w`
    })
    .join(', ')
}

/**
 * Get sizes attribute for responsive images
 */
export function getResponsiveSizes(
  options: {
    mobile?: string
    tablet?: string
    desktop?: string
    default?: string
  } = {}
): string {
  const parts: string[] = []

  if (options.mobile) parts.push(`(max-width: 640px) ${options.mobile}`)
  if (options.tablet) parts.push(`(max-width: 1024px) ${options.tablet}`)
  if (options.desktop) parts.push(`(max-width: 1920px) ${options.desktop}`)

  parts.push(options.default || '100vw')

  return parts.join(', ')
}

/**
 * React hook helpers - get optimized props for img elements
 */
export function getOptimizedImageProps(
  originalUrl: string | null | undefined,
  options: ImageKitTransformOptions & {
    responsive?: boolean
    responsiveWidths?: number[]
  } = {}
): {
  src: string
  srcSet?: string
  sizes?: string
} {
  const { responsive, responsiveWidths, ...transformOptions } = options

  const src = getOptimizedImageUrl(originalUrl, transformOptions)

  if (responsive && isImageKitEnabled()) {
    return {
      src,
      srcSet: getResponsiveSrcSet(originalUrl, {
        widths: responsiveWidths,
        quality: transformOptions.quality,
        format: transformOptions.format,
      }),
      sizes: getResponsiveSizes({
        mobile: '100vw',
        tablet: '50vw',
        desktop: '33vw',
      }),
    }
  }

  return { src }
}

export default {
  getOptimizedImageUrl,
  getOptimizedImageUrlWithPreset,
  getBlurPlaceholderUrl,
  getResponsiveSrcSet,
  getResponsiveSizes,
  getOptimizedImageProps,
  isImageKitEnabled,
  ImageKitPresets,
}
