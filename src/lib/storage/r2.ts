/**
 * Cloudflare R2 Storage Service
 * Handles image uploads, deletions, and URL generation for R2 bucket
 */

import { DeleteObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { v4 as uuidv4 } from 'uuid'

// R2 is S3-compatible, so we use AWS SDK
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'moodb-assets'
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || 'https://assets.moodb.com'

// Initialize S3 client for R2
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID || '',
    secretAccessKey: R2_SECRET_ACCESS_KEY || '',
  },
})

export type EntityType = 'category' | 'subcategory' | 'style' | 'approach' | 'room' | 'material'

/**
 * Generate R2 key path based on entity type and ID
 */
export function generateR2Key(
  entityType: EntityType,
  entityId: string,
  filename: string,
  roomId?: string,
  projectId?: string,
  roomType?: string,
  organizationId?: string
): string {
  const timestamp = Date.now()
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
  const uniqueFilename = `${timestamp}-${uuidv4().substring(0, 8)}-${sanitizedFilename}`

  switch (entityType) {
    case 'category':
      if (!entityId || entityId === '') {
        throw new Error('Category ID is required')
      }
      return `categories/${entityId}/${uniqueFilename}`
    case 'subcategory':
      if (!entityId || entityId === '') {
        throw new Error('SubCategory ID is required')
      }
      return `sub-categories/${entityId}/${uniqueFilename}`
    case 'style':
      // In creation mode (empty entityId), images are stored as blob URLs locally
      // They will be uploaded to R2 after style creation with the actual styleId
      // For now, if entityId is empty, we use a temp path structure
      if (!entityId || entityId === '') {
        // During creation, files are stored locally as blob URLs
        // When style is created, they'll be uploaded with the actual styleId
        // For now, use temp path if upload happens before style creation
        const tempId = `temp-${timestamp}-${uuidv4().substring(0, 8)}`
        if (roomType) {
          const sanitizedRoomType = roomType.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
          return `styles/${tempId}/rooms/${sanitizedRoomType}/${uniqueFilename}`
        }
        return `styles/${tempId}/${uniqueFilename}`
      }
      
      // Edit mode - use actual styleId
      // If roomType is provided, this is a room profile image within a style
      if (roomType) {
        const sanitizedRoomType = roomType.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
        return `styles/${entityId}/rooms/${sanitizedRoomType}/${uniqueFilename}`
      }
      return `styles/${entityId}/${uniqueFilename}`
    case 'approach':
      if (!entityId || entityId === '') {
        const tempId = `temp-${timestamp}-${uuidv4().substring(0, 8)}`
        return `approaches/${tempId}/${uniqueFilename}`
      }
      return `approaches/${entityId}/${uniqueFilename}`
    case 'room':
      if (!projectId || !roomId) {
        throw new Error('Project ID and Room ID are required for room images')
      }
      return `projects/${projectId}/rooms/${roomId}/${uniqueFilename}`
    case 'material':
      if (!organizationId) {
        throw new Error('Organization ID is required for material images')
      }
      return `materials/${organizationId}/${entityId}/${uniqueFilename}`
    default:
      throw new Error(`Unknown entity type: ${entityType}`)
  }
}

/**
 * Upload image to R2
 */
export async function uploadImageToR2(
  file: Buffer,
  contentType: string,
  entityType: EntityType,
  entityId: string,
  originalFilename: string,
  options?: {
    projectId?: string
    roomId?: string
    roomType?: string
    organizationId?: string
  }
): Promise<string> {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error('R2 credentials are not configured')
  }

  const key = generateR2Key(
    entityType,
    entityId,
    originalFilename,
    options?.roomId,
    options?.projectId,
    options?.roomType,
    options?.organizationId
  )

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: file,
    ContentType: contentType,
    // Cache for 1 year, but allow revalidation
    CacheControl: 'public, max-age=31536000, immutable',
  })

  await r2Client.send(command)

  // Return public URL
  return `${R2_PUBLIC_URL}/${key}`
}

/**
 * Delete image from R2
 */
export async function deleteImageFromR2(imageUrl: string): Promise<void> {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error('R2 credentials are not configured')
  }

  // Extract key from URL
  const url = new URL(imageUrl)
  const key = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname

  const command = new DeleteObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  })

  await r2Client.send(command)
}

/**
 * Check if image exists in R2
 */
export async function imageExistsInR2(imageUrl: string): Promise<boolean> {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    return false
  }

  try {
    // Extract key from URL
    const url = new URL(imageUrl)
    const key = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname

    const command = new HeadObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    })

    await r2Client.send(command)
    return true
  } catch (error) {
    return false
  }
}

/**
 * Get public URL for an R2 key
 */
export function getR2PublicUrl(key: string): string {
  return `${R2_PUBLIC_URL}/${key}`
}

/**
 * Extract key from R2 URL
 */
export function extractKeyFromUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    return urlObj.pathname.startsWith('/') ? urlObj.pathname.slice(1) : urlObj.pathname
  } catch {
    // If URL parsing fails, assume it's already a key
    return url
  }
}

/**
 * Style Images Folder Structure in R2:
 * 
 * styles/
 *   {styleId}/
 *     {timestamp}-{uuid}-{filename}                    # Main style images
 *     rooms/
 *       {roomType}/
 *         {timestamp}-{uuid}-{filename}                # Room profile images
 * 
 * Example:
 *   styles/507f1f77bcf86cd799439011/main-image.jpg
 *   styles/507f1f77bcf86cd799439011/rooms/living_room/room-image-1.jpg
 *   styles/507f1f77bcf86cd799439011/rooms/kitchen/room-image-2.jpg
 * 
 * During creation mode (entityId empty):
 *   - Images are stored as blob URLs locally
 *   - After style creation, they're uploaded to R2 with actual styleId
 *   - Folder structure: styles/{styleId}/ or styles/{styleId}/rooms/{roomType}/
 */

