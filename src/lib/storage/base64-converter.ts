/**
 * Base64 to Storage URL Converter Service
 *
 * Converts base64 data URLs to GCP Storage URLs before saving to MongoDB.
 * This prevents MongoDB's 16MB document size limit from being exceeded.
 *
 * Usage:
 * - Call convertBase64ToStorageUrls() before saving any data with potential base64 URLs
 * - Works with gallery items, image arrays, or any object containing URL fields
 */

import { uploadImageToGCP, type EntityType } from './gcp-storage'

export interface ConversionResult {
  success: boolean
  originalCount: number
  convertedCount: number
  failedCount: number
  skippedCount: number
  urls: string[]
  errors: string[]
}

export interface ConversionOptions {
  entityType: EntityType
  entityId: string
  filenamePrefix?: string
  maxRetries?: number
  retryDelayMs?: number
  onProgress?: (current: number, total: number, status: string) => void
}

/**
 * Check if a string is a base64 data URL
 */
export function isBase64DataUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false
  return url.startsWith('data:image/')
}

/**
 * Check if a URL is a valid HTTP/HTTPS URL
 */
export function isHttpUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false
  return url.startsWith('http://') || url.startsWith('https://')
}

/**
 * Extract mime type and base64 data from a data URL
 */
function parseDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
  const matches = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/)
  if (!matches) return null
  return {
    mimeType: matches[1],
    data: matches[2],
  }
}

/**
 * Generate a unique filename for uploaded images
 */
function generateFilename(prefix: string, index: number, mimeType: string): string {
  const extension = mimeType.split('/')[1] || 'png'
  const timestamp = Date.now()
  const sanitizedPrefix = prefix.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')
  return `${sanitizedPrefix}-${index + 1}-${timestamp}.${extension}`
}

/**
 * Upload a single base64 image to GCP storage with retry logic
 */
async function uploadBase64WithRetry(
  dataUrl: string,
  options: ConversionOptions,
  index: number
): Promise<{ success: boolean; url: string; error?: string }> {
  const { entityType, entityId, filenamePrefix = 'image', maxRetries = 3, retryDelayMs = 1000 } = options

  const parsed = parseDataUrl(dataUrl)
  if (!parsed) {
    return {
      success: false,
      url: dataUrl,
      error: 'Invalid data URL format',
    }
  }

  const { mimeType, data } = parsed
  const buffer = Buffer.from(data, 'base64')
  const filename = generateFilename(filenamePrefix, index, mimeType)

  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const gcpUrl = await uploadImageToGCP(
        buffer,
        mimeType,
        entityType,
        entityId,
        filename
      )

      return {
        success: true,
        url: gcpUrl,
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt < maxRetries) {
        const delay = retryDelayMs * Math.pow(2, attempt - 1) // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  return {
    success: false,
    url: dataUrl, // Keep original on failure
    error: lastError?.message || 'Upload failed after retries',
  }
}

/**
 * Convert an array of URLs - converts base64 to GCP storage URLs
 *
 * @param urls - Array of URLs (can be base64 data URLs, HTTP URLs, or mixed)
 * @param options - Conversion options
 * @returns ConversionResult with converted URLs
 */
export async function convertBase64ToStorageUrls(
  urls: string[],
  options: ConversionOptions
): Promise<ConversionResult> {
  const result: ConversionResult = {
    success: true,
    originalCount: urls.length,
    convertedCount: 0,
    failedCount: 0,
    skippedCount: 0,
    urls: [],
    errors: [],
  }

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i]
    options.onProgress?.(i + 1, urls.length, `Processing URL ${i + 1}/${urls.length}`)

    // Skip null/undefined/empty
    if (!url) {
      result.skippedCount++
      continue
    }

    // Already an HTTP URL - keep as is
    if (isHttpUrl(url)) {
      result.urls.push(url)
      result.skippedCount++
      continue
    }

    // Base64 data URL - convert to GCP storage
    if (isBase64DataUrl(url)) {
      options.onProgress?.(i + 1, urls.length, `Uploading image ${i + 1}/${urls.length} to storage...`)

      const uploadResult = await uploadBase64WithRetry(url, options, i)

      if (uploadResult.success) {
        result.urls.push(uploadResult.url)
        result.convertedCount++
      } else {
        // On failure, use a placeholder instead of base64 (MongoDB 16MB limit)
        const placeholder = `https://via.placeholder.com/1200x800/f7f7ed/333333?text=Upload+Failed+${i + 1}`
        result.urls.push(placeholder)
        result.failedCount++
        result.errors.push(`Image ${i + 1}: ${uploadResult.error}`)
        console.error(`[Base64Converter] Failed to upload image ${i + 1}:`, uploadResult.error)
      }
      continue
    }

    // Unknown URL format - skip with warning
    console.warn(`[Base64Converter] Unknown URL format at index ${i}:`, url.substring(0, 50))
    result.skippedCount++
  }

  result.success = result.failedCount === 0

  if (result.convertedCount > 0) {
    console.log(`[Base64Converter] Converted ${result.convertedCount}/${urls.length} base64 URLs to storage`)
  }
  if (result.failedCount > 0) {
    console.warn(`[Base64Converter] Failed to convert ${result.failedCount} URLs`)
  }

  return result
}

/**
 * Convert gallery items - converts base64 URLs in gallery item objects
 *
 * @param items - Array of gallery items with 'url' field
 * @param options - Conversion options
 * @returns Array of gallery items with converted URLs
 */
export async function convertGalleryItems<T extends { url: string }>(
  items: T[],
  options: ConversionOptions
): Promise<{ items: T[]; result: ConversionResult }> {
  const urls = items.map(item => item.url)
  const conversionResult = await convertBase64ToStorageUrls(urls, options)

  const convertedItems = items.map((item, index) => ({
    ...item,
    url: conversionResult.urls[index] || item.url,
  }))

  return {
    items: convertedItems,
    result: conversionResult,
  }
}

/**
 * Ensure all URLs in an array are storage-safe (no base64)
 * This is a wrapper that either converts or filters based on options
 *
 * @param urls - Array of URLs
 * @param options - Conversion options (or null to just filter)
 * @returns Array of storage-safe URLs
 */
export async function ensureStorageSafeUrls(
  urls: string[],
  options: ConversionOptions | null
): Promise<string[]> {
  if (!options) {
    // Just filter out base64 URLs
    return urls.filter(url => isHttpUrl(url))
  }

  const result = await convertBase64ToStorageUrls(urls, options)
  return result.urls
}

/**
 * Validate that no base64 data URLs exist in an array
 * Throws error if base64 URLs are found (use for debugging/validation)
 */
export function validateNoBase64Urls(urls: string[], context: string = ''): void {
  const base64Urls = urls.filter(isBase64DataUrl)
  if (base64Urls.length > 0) {
    throw new Error(
      `[Base64Converter] Found ${base64Urls.length} base64 URLs that should have been converted. ${context}`
    )
  }
}

/**
 * Get statistics about URL types in an array
 */
export function analyzeUrls(urls: string[]): {
  total: number
  http: number
  base64: number
  other: number
  base64SizeEstimate: number
} {
  let http = 0
  let base64 = 0
  let other = 0
  let base64SizeEstimate = 0

  for (const url of urls) {
    if (isHttpUrl(url)) {
      http++
    } else if (isBase64DataUrl(url)) {
      base64++
      // Estimate size: base64 is ~4/3 of original, and data URL adds overhead
      const dataLength = url.length - (url.indexOf(',') + 1)
      base64SizeEstimate += Math.ceil(dataLength * 0.75) // Approximate original bytes
    } else {
      other++
    }
  }

  return {
    total: urls.length,
    http,
    base64,
    other,
    base64SizeEstimate,
  }
}
