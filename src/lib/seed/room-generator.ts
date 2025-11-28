/**
 * Phase 2: Room Image Generator Module
 *
 * Generates ROOM_OVERVIEW and ROOM_DETAIL images for styles:
 * 1. Generate 4 views per room type (main, opposite, left, right)
 * 2. Use reference images from sub-category for consistency
 * 3. Create StyleImage records with proper categories
 * 4. Support 24 standard room types
 */

import { PrismaClient, ImageCategory } from '@prisma/client'
import { generateAndUploadImages } from '@/lib/ai'

const prisma = new PrismaClient()

/**
 * Standard room types (24 rooms)
 */
export const STANDARD_ROOM_TYPES = [
  'Living Room',
  'Dining Room',
  'Kitchen',
  'Bedroom',
  'Master Bedroom',
  'Guest Bedroom',
  'Children Bedroom',
  'Bathroom',
  'Master Bathroom',
  'Powder Room',
  'Home Office',
  'Library',
  'Den',
  'Media Room',
  'Entryway',
  'Hallway',
  'Staircase',
  'Balcony',
  'Patio',
  'Terrace',
  'Sunroom',
  'Laundry Room',
  'Walk-in Closet',
  'Pantry',
]

/**
 * View types for each room
 */
const VIEW_TYPES = [
  { type: 'main', category: 'ROOM_OVERVIEW', name: 'Main View' },
  { type: 'opposite', category: 'ROOM_OVERVIEW', name: 'Opposite View' },
  { type: 'left', category: 'ROOM_DETAIL', name: 'Left Detail' },
  { type: 'right', category: 'ROOM_DETAIL', name: 'Right Detail' },
] as const

/**
 * Aspect ratios that cycle through the views
 */
const ASPECT_RATIOS = ['16:9', '4:3', '1:1', '3:4', '9:16']

export interface RoomImageOptions {
  styleId: string
  styleName: { he: string; en: string }
  colorHex: string
  roomTypes?: string[] // Subset of STANDARD_ROOM_TYPES or all
  visualContext?: {
    characteristics?: string[]
    visualElements?: string[]
    materialGuidance?: string
    colorGuidance?: string
  }
  referenceImages?: string[] // Sub-category images for consistency
  maxRooms?: number
  tags?: string[]
}

/**
 * Generate room images for a style
 */
export async function generateRoomImages(
  options: RoomImageOptions
): Promise<Map<string, string[]>> {
  const {
    styleId,
    styleName,
    colorHex,
    roomTypes = STANDARD_ROOM_TYPES,
    visualContext,
    referenceImages = [],
    maxRooms = 24,
    tags = [],
  } = options

  console.log(`\n🏠 Generating ROOM images for style: ${styleName.en}`)
  console.log(`   Room Types: ${roomTypes.length}`)
  console.log(`   Reference Images: ${referenceImages.length}`)
  console.log(`   Max Rooms: ${maxRooms}`)

  const roomImageUrls = new Map<string, string[]>()

  // Limit to maxRooms
  const roomsToGenerate = roomTypes.slice(0, maxRooms)

  for (let roomIndex = 0; roomIndex < roomsToGenerate.length; roomIndex++) {
    const roomType = roomsToGenerate[roomIndex]
    const imageUrls: string[] = []

    console.log(`\n   🚪 Room ${roomIndex + 1}/${roomsToGenerate.length}: ${roomType}`)

    // Generate 4 views for this room
    for (let viewIndex = 0; viewIndex < VIEW_TYPES.length; viewIndex++) {
      const view = VIEW_TYPES[viewIndex]
      const aspectRatio = ASPECT_RATIOS[viewIndex % ASPECT_RATIOS.length]

      try {
        console.log(`      📸 Generating ${view.name} (${aspectRatio})...`)

        // Generate room view image with reference images
        const viewImages = await generateAndUploadImages({
          entityType: 'style-room',
          entityName: styleName,
          numberOfImages: 1,
          roomContext: {
            roomTypeName: roomType,
            styleName: styleName.en,
            colorHex,
          },
          visualContext,
          referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
          variationType: view.type as any,
          aspectRatio,
        })

        if (viewImages.length > 0) {
          const imageUrl = viewImages[0]

          // Create StyleImage record
          const styleImage = await prisma.styleImage.create({
            data: {
              styleId,
              url: imageUrl,
              imageCategory: view.category as ImageCategory,
              displayOrder: (roomIndex * VIEW_TYPES.length) + viewIndex,
              description: `${roomType} - ${view.name}`,
              tags: [roomType.toLowerCase(), view.type, ...tags],
              roomType,
            }
          })

          imageUrls.push(imageUrl)
          console.log(`      ✅ ${view.name} created: ${styleImage.id}`)
        }

        // Add delay between views
        await new Promise(resolve => setTimeout(resolve, 2000))

      } catch (error) {
        console.error(`      ❌ Failed to generate ${view.name}:`, error)
        // Continue with next view
      }
    }

    roomImageUrls.set(roomType, imageUrls)
    console.log(`   ✅ Generated ${imageUrls.length}/4 views for ${roomType}`)

    // Add delay between rooms
    if (roomIndex < roomsToGenerate.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 3000))
    }
  }

  const totalImages = Array.from(roomImageUrls.values()).reduce((sum, urls) => sum + urls.length, 0)
  console.log(`   ✅ Generated ${totalImages} total room images across ${roomImageUrls.size} rooms`)

  return roomImageUrls
}

/**
 * Get room images for a style
 */
export async function getStyleRoomImages(
  styleId: string,
  options?: {
    roomType?: string
    category?: ImageCategory
  }
) {
  return await prisma.styleImage.findMany({
    where: {
      styleId,
      roomType: options?.roomType,
      imageCategory: options?.category || {
        in: ['ROOM_OVERVIEW', 'ROOM_DETAIL']
      }
    },
    orderBy: {
      displayOrder: 'asc'
    }
  })
}

/**
 * Get images grouped by room type
 */
export async function getStyleRoomImagesByType(styleId: string) {
  const images = await getStyleRoomImages(styleId)

  const grouped = new Map<string, any[]>()

  for (const image of images) {
    if (!image.roomType) continue

    if (!grouped.has(image.roomType)) {
      grouped.set(image.roomType, [])
    }

    grouped.get(image.roomType)!.push(image)
  }

  return grouped
}

/**
 * Delete room images for a specific room type
 */
export async function deleteRoomTypeImages(styleId: string, roomType: string) {
  await prisma.styleImage.deleteMany({
    where: {
      styleId,
      roomType,
    }
  })
}

/**
 * Update room image metadata
 */
export async function updateRoomImage(
  imageId: string,
  updates: {
    description?: string
    tags?: string[]
    displayOrder?: number
    imageCategory?: ImageCategory
  }
) {
  return await prisma.styleImage.update({
    where: { id: imageId },
    data: updates
  })
}
