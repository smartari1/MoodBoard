/**
 * BlurHash Generation Utility
 * Generates compact blurhash strings for image placeholders
 *
 * Usage:
 * 1. On image upload, generate blurhash and store with the image record
 * 2. Pass blurhash to ImageWithFallback for instant placeholder display
 */

import sharp from 'sharp'
import { encode } from 'blurhash'

interface BlurHashOptions {
  /** Component count X (1-9, default 4) */
  componentX?: number
  /** Component count Y (1-9, default 3) */
  componentY?: number
  /** Resize width for processing (default 32) */
  resizeWidth?: number
}

/**
 * Generate a blurhash string from an image buffer
 *
 * @param imageBuffer - The image as a Buffer
 * @param options - Optional configuration
 * @returns The blurhash string (20-30 characters)
 *
 * @example
 * const file = await fs.readFile('./image.jpg')
 * const hash = await generateBlurHash(file)
 * // Returns: "LEHV6nWB2yk8pyo0adR*.7kCMdnj"
 */
export async function generateBlurHash(
  imageBuffer: Buffer,
  options: BlurHashOptions = {}
): Promise<string> {
  const {
    componentX = 4,
    componentY = 3,
    resizeWidth = 32,
  } = options

  try {
    // Resize image for faster processing and normalize format
    const { data, info } = await sharp(imageBuffer)
      .raw()
      .ensureAlpha()
      .resize(resizeWidth, null, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .toBuffer({ resolveWithObject: true })

    // Encode to blurhash
    const hash = encode(
      new Uint8ClampedArray(data),
      info.width,
      info.height,
      componentX,
      componentY
    )

    return hash
  } catch (error) {
    console.error('[BlurHash] Error generating blurhash:', error)
    throw error
  }
}

/**
 * Generate a blurhash from a URL
 * Fetches the image and generates the hash
 *
 * @param imageUrl - The image URL
 * @param options - Optional configuration
 * @returns The blurhash string
 */
export async function generateBlurHashFromUrl(
  imageUrl: string,
  options: BlurHashOptions = {}
): Promise<string> {
  try {
    const response = await fetch(imageUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`)
    }

    const buffer = Buffer.from(await response.arrayBuffer())
    return generateBlurHash(buffer, options)
  } catch (error) {
    console.error('[BlurHash] Error fetching image:', error)
    throw error
  }
}

/**
 * Generate a tiny base64 data URL placeholder (alternative to blurhash)
 * This is smaller than blurhash and doesn't require a decoder library
 *
 * @param imageBuffer - The image as a Buffer
 * @returns Base64 data URL (tiny blurred image)
 */
export async function generateTinyPlaceholder(
  imageBuffer: Buffer
): Promise<string> {
  try {
    const placeholder = await sharp(imageBuffer)
      .resize(10, 10, { fit: 'cover' })
      .blur(2)
      .jpeg({ quality: 20 })
      .toBuffer()

    return `data:image/jpeg;base64,${placeholder.toString('base64')}`
  } catch (error) {
    console.error('[BlurHash] Error generating tiny placeholder:', error)
    throw error
  }
}

/**
 * Generate CSS gradient placeholder from average color
 * Fastest option - just extracts dominant colors
 *
 * @param imageBuffer - The image as a Buffer
 * @returns CSS gradient string
 */
export async function generateGradientPlaceholder(
  imageBuffer: Buffer
): Promise<string> {
  try {
    const { dominant } = await sharp(imageBuffer)
      .resize(50, 50, { fit: 'cover' })
      .stats()

    const { r, g, b } = dominant
    const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`

    // Create slightly lighter/darker variants for gradient
    const lighter = adjustBrightness(r, g, b, 20)
    const darker = adjustBrightness(r, g, b, -20)

    return `linear-gradient(135deg, ${lighter} 0%, ${hex} 50%, ${darker} 100%)`
  } catch (error) {
    console.error('[BlurHash] Error generating gradient:', error)
    throw error
  }
}

function adjustBrightness(r: number, g: number, b: number, amount: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, n))
  const nr = clamp(r + amount)
  const ng = clamp(g + amount)
  const nb = clamp(b + amount)
  return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`
}

export default {
  generateBlurHash,
  generateBlurHashFromUrl,
  generateTinyPlaceholder,
  generateGradientPlaceholder,
}
