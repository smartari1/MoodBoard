/**
 * Google Cloud Storage Service
 * Handles image uploads, deletions, and URL generation for GCP bucket
 */

import { Storage } from '@google-cloud/storage'
import { v4 as uuidv4 } from 'uuid'

// GCP Storage Configuration
const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID || 'moodboard-476922'
const GCP_BUCKET_NAME = process.env.GCP_BUCKET_NAME || 'moodb-assets'
const GCP_PUBLIC_URL = process.env.GCP_PUBLIC_URL || `https://storage.googleapis.com/${GCP_BUCKET_NAME}`

// Initialize GCP Storage client
// If credentials are not explicitly set, it will use Application Default Credentials
const storage = new Storage({
  projectId: GCP_PROJECT_ID,
  // For local development, set GOOGLE_APPLICATION_CREDENTIALS env var
  // For production (Vercel), add service account key to env
  ...(process.env.GCP_SERVICE_ACCOUNT_KEY
    ? { credentials: JSON.parse(process.env.GCP_SERVICE_ACCOUNT_KEY) }
    : {}),
})

const bucket = storage.bucket(GCP_BUCKET_NAME)

export type EntityType = 'category' | 'subcategory' | 'style' | 'approach' | 'room' | 'material'

/**
 * Generate GCP Storage key path based on entity type and ID
 */
export function generateStorageKey(
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
      // They will be uploaded to GCP after style creation with the actual styleId
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
 * Upload image to GCP Storage
 */
export async function uploadImageToGCP(
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
  const key = generateStorageKey(
    entityType,
    entityId,
    originalFilename,
    options?.roomId,
    options?.projectId,
    options?.roomType,
    options?.organizationId
  )

  const fileObject = bucket.file(key)

  await fileObject.save(file, {
    contentType,
    metadata: {
      cacheControl: 'public, max-age=31536000, immutable',
    },
    // Note: Don't set public:true here because we're using uniform bucket-level access
    // The bucket is already configured for public read access
  })

  // Return public URL
  return `${GCP_PUBLIC_URL}/${key}`
}

/**
 * Delete image from GCP Storage
 */
export async function deleteImageFromGCP(imageUrl: string): Promise<void> {
  // Extract key from URL
  const url = new URL(imageUrl)
  const key = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname

  // Remove bucket name if it's in the path
  const cleanKey = key.replace(`${GCP_BUCKET_NAME}/`, '')

  const fileObject = bucket.file(cleanKey)
  await fileObject.delete()
}

/**
 * Check if image exists in GCP Storage
 */
export async function imageExistsInGCP(imageUrl: string): Promise<boolean> {
  try {
    // Extract key from URL
    const url = new URL(imageUrl)
    const key = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname

    // Remove bucket name if it's in the path
    const cleanKey = key.replace(`${GCP_BUCKET_NAME}/`, '')

    const fileObject = bucket.file(cleanKey)
    const [exists] = await fileObject.exists()
    return exists
  } catch (error) {
    return false
  }
}

/**
 * Get public URL for a GCP Storage key
 */
export function getGCPPublicUrl(key: string): string {
  return `${GCP_PUBLIC_URL}/${key}`
}

/**
 * Extract key from GCP Storage URL
 */
export function extractKeyFromUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    let key = urlObj.pathname.startsWith('/') ? urlObj.pathname.slice(1) : urlObj.pathname
    // Remove bucket name if it's in the path
    key = key.replace(`${GCP_BUCKET_NAME}/`, '')
    return key
  } catch {
    // If URL parsing fails, assume it's already a key
    return url
  }
}

/**
 * Style Images Folder Structure in GCP Storage:
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
 *   - After style creation, they're uploaded to GCP Storage with actual styleId
 *   - Folder structure: styles/{styleId}/ or styles/{styleId}/rooms/{roomType}/
 */
