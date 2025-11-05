/**
 * Upload Validation Schemas
 * Zod schemas for file upload operations
 */

import { z } from 'zod'

// Allowed image MIME types
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
] as const

// Max file size: 10MB
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB in bytes

// Entity types that support image uploads
export const ENTITY_TYPES = ['category', 'subcategory', 'style', 'room', 'material'] as const

export type EntityType = (typeof ENTITY_TYPES)[number]

/**
 * Image upload request schema
 * entityId can be empty string for creation mode (styles, materials)
 */
export const imageUploadSchema = z.object({
  entityType: z.enum(ENTITY_TYPES, {
    errorMap: () => ({ message: 'Invalid entity type' }),
  }),
  entityId: z.string(), // Can be empty for creation mode
  projectId: z.string().optional(), // Required for room type
  roomId: z.string().optional(), // Required for room type
  roomType: z.string().optional(), // For room profiles within styles
})

export type ImageUploadRequest = z.infer<typeof imageUploadSchema>

/**
 * Image delete request schema
 */
export const imageDeleteSchema = z.object({
  url: z.string().url('Invalid image URL'),
})

export type ImageDeleteRequest = z.infer<typeof imageDeleteSchema>

/**
 * Validate image file
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as any)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`,
    }
  }

  // Check file size
  if (file.size > MAX_IMAGE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${MAX_IMAGE_SIZE / 1024 / 1024}MB`,
    }
  }

  return { valid: true }
}

/**
 * Client-side images schema (for forms)
 * Allows both regular URLs and blob URLs (for temporary local preview)
 * Used in form state management only - NOT for API validation
 */
export const clientImagesSchema = z.array(
  z.string().refine((val) => {
    // Allow blob URLs for client-side preview
    if (val.startsWith('blob:')) return true
    // Otherwise, must be a valid URL
    try {
      new URL(val)
      return true
    } catch {
      return false
    }
  }, 'Invalid URL')
).max(20, 'Maximum 20 images allowed').default([])

/**
 * Server-side images schema (for API validation)
 * Only allows HTTP/HTTPS URLs (e.g., Cloudflare R2)
 * Blob URLs are rejected as they're client-side only
 */
export const serverImagesSchema = z.array(
  z.string().url('Must be a valid URL').refine((val) => {
    return val.startsWith('http://') || val.startsWith('https://')
  }, 'Only HTTP/HTTPS URLs allowed')
).max(20, 'Maximum 20 images allowed').default([])

/**
 * Legacy alias for backward compatibility
 * @deprecated Use clientImagesSchema or serverImagesSchema explicitly
 */
export const imagesSchema = clientImagesSchema

export type ClientImages = z.infer<typeof clientImagesSchema>
export type ServerImages = z.infer<typeof serverImagesSchema>
export type Images = z.infer<typeof imagesSchema>

