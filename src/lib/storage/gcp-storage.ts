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

export type EntityType = 'category' | 'subcategory' | 'style' | 'approach' | 'room' | 'material' | 'texture' | 'scene' | 'composite' | 'anchor'

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
      // For abstract/admin materials, use shared path; for org materials, use org path
      if (organizationId) {
        return `materials/${organizationId}/${entityId}/${uniqueFilename}`
      }
      // Abstract/admin materials go to shared path
      if (!entityId || entityId === '') {
        const tempId = `temp-${timestamp}-${uuidv4().substring(0, 8)}`
        return `materials/shared/${tempId}/${uniqueFilename}`
      }
      return `materials/shared/${entityId}/${uniqueFilename}`
    case 'texture':
      if (!entityId || entityId === '') {
        const tempId = `temp-${timestamp}-${uuidv4().substring(0, 8)}`
        return `textures/${tempId}/${uniqueFilename}`
      }
      return `textures/${entityId}/${uniqueFilename}`
    case 'scene':
      // Scene images are golden scene shots for a style
      if (!entityId || entityId === '') {
        const tempId = `temp-${timestamp}-${uuidv4().substring(0, 8)}`
        return `styles/${tempId}/scenes/${uniqueFilename}`
      }
      return `styles/${entityId}/scenes/${uniqueFilename}`
    case 'composite':
      // Composite mood board images for a style
      if (!entityId || entityId === '') {
        const tempId = `temp-${timestamp}-${uuidv4().substring(0, 8)}`
        return `styles/${tempId}/composite/${uniqueFilename}`
      }
      return `styles/${entityId}/composite/${uniqueFilename}`
    case 'anchor':
      // Anchor/hero images for a style
      if (!entityId || entityId === '') {
        const tempId = `temp-${timestamp}-${uuidv4().substring(0, 8)}`
        return `styles/${tempId}/anchor/${uniqueFilename}`
      }
      return `styles/${entityId}/anchor/${uniqueFilename}`
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
 * Copy/move image to a new location in GCP Storage
 */
export async function copyImageInGCP(
  sourceUrl: string,
  destinationKey: string,
  deleteSource = false
): Promise<string> {
  // Extract source key from URL
  const sourceKey = extractKeyFromUrl(sourceUrl)

  const sourceFile = bucket.file(sourceKey)
  const destinationFile = bucket.file(destinationKey)

  // Copy file
  await sourceFile.copy(destinationFile)

  // Delete source if requested (move operation)
  if (deleteSource) {
    await sourceFile.delete()
  }

  // Return new public URL
  return getGCPPublicUrl(destinationKey)
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
 * List all files in a GCP Storage path (prefix)
 */
export async function listFilesInPath(prefix: string): Promise<string[]> {
  try {
    const [files] = await bucket.getFiles({ prefix })
    return files.map((file) => getGCPPublicUrl(file.name))
  } catch (error) {
    console.error(`Error listing files in path ${prefix}:`, error)
    return []
  }
}

/**
 * List files organized by style and room type
 * Returns main style images and room-specific images sorted by timestamp
 */
export async function listStyleImages(styleId: string): Promise<{
  mainImages: string[]
  roomImages: Record<string, string[]>
}> {
  try {
    const prefix = `styles/${styleId}/`
    const [files] = await bucket.getFiles({ prefix })

    const mainImages: string[] = []
    const roomImages: Record<string, string[]> = {}

    for (const file of files) {
      const url = getGCPPublicUrl(file.name)

      // Check if it's a room image (pattern: styles/{styleId}/rooms/{roomType}/)
      const roomMatch = file.name.match(/styles\/[^/]+\/rooms\/([^/]+)\//)
      if (roomMatch) {
        const roomType = roomMatch[1]
        if (!roomImages[roomType]) {
          roomImages[roomType] = []
        }
        roomImages[roomType].push(url)
      } else if (file.name.includes(`styles/${styleId}/`) && !file.name.includes('/rooms/')) {
        // Main style image (not in a rooms subfolder)
        mainImages.push(url)
      }
    }

    // Sort by timestamp (extracted from filename: {timestamp}-{uuid}-{filename})
    const sortByTimestamp = (urls: string[]) => {
      return urls.sort((a, b) => {
        const timestampA = parseInt(a.match(/\/(\d+)-/)?.[1] || '0')
        const timestampB = parseInt(b.match(/\/(\d+)-/)?.[1] || '0')
        return timestampA - timestampB
      })
    }

    return {
      mainImages: sortByTimestamp(mainImages),
      roomImages: Object.fromEntries(
        Object.entries(roomImages).map(([type, urls]) => [type, sortByTimestamp(urls)])
      ),
    }
  } catch (error) {
    console.error(`Error listing style images for ${styleId}:`, error)
    return { mainImages: [], roomImages: {} }
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
