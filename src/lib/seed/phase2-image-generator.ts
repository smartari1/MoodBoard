/**
 * Phase 2: Comprehensive Image Generator
 *
 * Generates the full suite of images per style:
 * - 60 ROOM_OVERVIEW images (15 room types × 4 views each)
 * - 25 MATERIAL images (mood board style close-ups)
 * - 15 TEXTURE images (surface finish close-ups)
 * - 1 COMPOSITE mood board
 * - 1 ANCHOR image
 *
 * Total: ~102 images per style
 */

import { PrismaClient, ImageCategory, PriceLevel } from '@prisma/client'
import { generateAndUploadImages } from '@/lib/ai'
import pLimit from 'p-limit'

const prisma = new PrismaClient()

// ============================================
// Parallelization Configuration
// ============================================

/**
 * Concurrency limit for parallel image generation
 * 20 concurrent requests balances speed vs Gemini API rate limits
 */
const CONCURRENCY_LIMIT = 20
const limit = pLimit(CONCURRENCY_LIMIT)

// ============================================
// Constants & Configuration
// ============================================

/**
 * Room types for image generation (15 core room types)
 * Each gets 4 views = 60 total ROOM_OVERVIEW images
 */
export const PHASE2_ROOM_TYPES = [
  { slug: 'living-room', name: { en: 'Living Room', he: 'סלון' }, priority: 1 },
  { slug: 'kitchen', name: { en: 'Kitchen', he: 'מטבח' }, priority: 1 },
  { slug: 'dining-room', name: { en: 'Dining Room', he: 'פינת אוכל' }, priority: 1 },
  { slug: 'master-bedroom', name: { en: 'Master Bedroom', he: 'חדר שינה הורים' }, priority: 1 },
  { slug: 'bathroom', name: { en: 'Bathroom', he: 'חדר אמבטיה' }, priority: 1 },
  { slug: 'bedroom', name: { en: 'Bedroom', he: 'חדר שינה' }, priority: 2 },
  { slug: 'home-office', name: { en: 'Home Office', he: 'חדר עבודה' }, priority: 2 },
  { slug: 'entryway', name: { en: 'Entryway', he: 'כניסה' }, priority: 2 },
  { slug: 'hallway', name: { en: 'Hallway', he: 'מסדרון' }, priority: 2 },
  { slug: 'guest-bedroom', name: { en: 'Guest Bedroom', he: 'חדר אורחים' }, priority: 2 },
  { slug: 'master-bathroom', name: { en: 'Master Bathroom', he: 'חדר רחצה הורים' }, priority: 3 },
  { slug: 'children-bedroom', name: { en: "Children's Bedroom", he: 'חדר ילדים' }, priority: 3 },
  { slug: 'balcony', name: { en: 'Balcony', he: 'מרפסת' }, priority: 3 },
  { slug: 'walk-in-closet', name: { en: 'Walk-in Closet', he: 'חדר ארונות' }, priority: 3 },
  { slug: 'laundry-room', name: { en: 'Laundry Room', he: 'חדר כביסה' }, priority: 3 },
] as const

/**
 * View types for each room (4 views per room)
 * Matches Act 4 format: main, opposite, left, right (all 4:3)
 */
export const ROOM_VIEW_TYPES = [
  { type: 'main', name: 'Main View', aspectRatio: '4:3', orientation: 'main' as const },
  { type: 'opposite', name: 'Opposite View', aspectRatio: '4:3', orientation: 'opposite' as const },
  { type: 'left', name: 'Left View', aspectRatio: '4:3', orientation: 'left' as const },
  { type: 'right', name: 'Right View', aspectRatio: '4:3', orientation: 'right' as const },
] as const

/**
 * Diverse aspect ratios for scenes, materials, and textures
 * Cycles through for visual variety
 */
export const DIVERSE_ASPECT_RATIOS = ['16:9', '4:3', '1:1', '3:4', '9:16'] as const

/**
 * Materials by price level (25 materials each)
 */
export const MATERIALS_BY_PRICE_LEVEL = {
  LUXURY: [
    { name: 'Calacatta Marble', category: 'stone', he: 'שיש קלקטה' },
    { name: 'Carrara Marble', category: 'stone', he: 'שיש קררה' },
    { name: 'Solid Walnut Wood', category: 'wood', he: 'עץ אגוז מלא' },
    { name: 'White Oak Flooring', category: 'wood', he: 'פרקט אלון לבן' },
    { name: 'Brushed Brass Fixtures', category: 'metal', he: 'אביזרי פליז מוברש' },
    { name: 'Polished Nickel Hardware', category: 'metal', he: 'חומרת ניקל מצוחצח' },
    { name: 'Italian Velvet Upholstery', category: 'fabric', he: 'קטיפה איטלקית' },
    { name: 'Belgian Linen Drapes', category: 'fabric', he: 'וילונות פשתן בלגי' },
    { name: 'Handmade Ceramic Tiles', category: 'tile', he: 'אריחי קרמיקה בעבודת יד' },
    { name: 'Large Format Porcelain', category: 'tile', he: 'פורצלן פורמט גדול' },
    { name: 'Natural Travertine', category: 'stone', he: 'טרוורטין טבעי' },
    { name: 'Venetian Plaster', category: 'wall', he: 'טיח ונציאני' },
    { name: 'Silk Wallcovering', category: 'wall', he: 'טפט משי' },
    { name: 'Antique Mirror Glass', category: 'glass', he: 'זכוכית מראה עתיקה' },
    { name: 'Leather Paneling', category: 'fabric', he: 'חיפוי עור' },
    { name: 'Bronze Door Hardware', category: 'metal', he: 'חומרת דלת ברונזה' },
    { name: 'Onyx Countertops', category: 'stone', he: 'משטח אוניקס' },
    { name: 'Custom Millwork', category: 'wood', he: 'נגרות בהזמנה אישית' },
    { name: 'Hand-Knotted Wool Rug', category: 'fabric', he: 'שטיח צמר קשירה ידנית' },
    { name: 'Terrazzo Flooring', category: 'stone', he: 'רצפת טראצו' },
    { name: 'Crystal Chandelier Parts', category: 'glass', he: 'חלקי נברשת קריסטל' },
    { name: 'Mother of Pearl Inlay', category: 'decorative', he: 'שיבוץ צדף' },
    { name: 'Teak Wood Outdoor', category: 'wood', he: 'עץ טיק לחוץ' },
    { name: 'Gold Leaf Accent', category: 'decorative', he: 'עלי זהב לעיטור' },
    { name: 'Bespoke Cabinet Hardware', category: 'metal', he: 'חומרת ארונות בהזמנה' },
  ],
  REGULAR: [
    { name: 'Ceramic Floor Tiles', category: 'tile', he: 'אריחי קרמיקה לרצפה' },
    { name: 'Laminate Flooring', category: 'wood', he: 'רצפת למינציה' },
    { name: 'Engineered Wood', category: 'wood', he: 'עץ מהונדס' },
    { name: 'Chrome Fixtures', category: 'metal', he: 'אביזרי כרום' },
    { name: 'Brushed Nickel Hardware', category: 'metal', he: 'חומרת ניקל מוברש' },
    { name: 'Cotton Upholstery', category: 'fabric', he: 'ריפוד כותנה' },
    { name: 'Polyester Blend Curtains', category: 'fabric', he: 'וילונות תערובת פוליאסטר' },
    { name: 'Standard Ceramic Tiles', category: 'tile', he: 'אריחי קרמיקה סטנדרטיים' },
    { name: 'Porcelain Floor Tiles', category: 'tile', he: 'אריחי פורצלן לרצפה' },
    { name: 'Quartz Countertops', category: 'stone', he: 'משטח קוורץ' },
    { name: 'Painted Drywall', category: 'wall', he: 'גבס צבוע' },
    { name: 'Vinyl Wallpaper', category: 'wall', he: 'טפט ויניל' },
    { name: 'Clear Float Glass', category: 'glass', he: 'זכוכית שקופה' },
    { name: 'Faux Leather', category: 'fabric', he: 'דמוי עור' },
    { name: 'Stainless Steel Handles', category: 'metal', he: 'ידיות נירוסטה' },
    { name: 'Granite Countertops', category: 'stone', he: 'משטח גרניט' },
    { name: 'MDF Cabinetry', category: 'wood', he: 'ארונות MDF' },
    { name: 'Machine-Made Area Rug', category: 'fabric', he: 'שטיח מכונה' },
    { name: 'Concrete Effect Tiles', category: 'tile', he: 'אריחי אפקט בטון' },
    { name: 'Standard Lighting Fixtures', category: 'glass', he: 'גופי תאורה סטנדרטיים' },
    { name: 'Melamine Shelving', category: 'wood', he: 'מדפי מלמין' },
    { name: 'Acrylic Panels', category: 'decorative', he: 'לוחות אקריליק' },
    { name: 'Composite Decking', category: 'wood', he: 'דק מרוכב' },
    { name: 'Standard Cabinet Knobs', category: 'metal', he: 'ידיות ארונות סטנדרטיות' },
    { name: 'Textured Paint Finish', category: 'wall', he: 'צבע עם טקסטורה' },
  ],
} as const

/**
 * Textures/surface finishes (15 textures)
 */
export const TEXTURE_TYPES = [
  { name: 'Matte Paint Finish', category: 'surface', he: 'גימור צבע מט' },
  { name: 'Glossy Lacquer', category: 'surface', he: 'לכה מבריקה' },
  { name: 'Satin Sheen', category: 'surface', he: 'ברק סאטן' },
  { name: 'Brushed Metal', category: 'metal', he: 'מתכת מוברשת' },
  { name: 'Polished Surface', category: 'surface', he: 'משטח מצוחצח' },
  { name: 'Natural Wood Grain', category: 'wood', he: 'עורקי עץ טבעיים' },
  { name: 'Fabric Weave Close-up', category: 'fabric', he: 'קלוז-אפ אריגת בד' },
  { name: 'Stone Surface Texture', category: 'stone', he: 'טקסטורת משטח אבן' },
  { name: 'Concrete Finish', category: 'industrial', he: 'גימור בטון' },
  { name: 'Leather Grain', category: 'fabric', he: 'גרעין עור' },
  { name: 'Soft Textile Drape', category: 'fabric', he: 'קפלי טקסטיל רכים' },
  { name: 'Rough Natural Texture', category: 'natural', he: 'טקסטורה טבעית גסה' },
  { name: 'Hammered Metal', category: 'metal', he: 'מתכת מרוקעת' },
  { name: 'Woven Rattan', category: 'natural', he: 'ראטן קלוע' },
  { name: 'Ceramic Glaze', category: 'surface', he: 'זיגוג קרמי' },
] as const

// ============================================
// Types
// ============================================

export interface Phase2GenerationOptions {
  styleId: string
  styleName: { he: string; en: string }
  priceLevel: PriceLevel
  styleContext: {
    subCategoryName: string
    approachName: string
    colorName: string
    colorHex: string
  }
  visualContext?: {
    characteristics?: string[]
    visualElements?: string[]
    materialGuidance?: string
    colorGuidance?: string
  }
  // Generation limits (default to full Phase 2 counts)
  roomImageCount?: number // Default: 60 (15 rooms × 4 views)
  materialImageCount?: number // Default: 25
  textureImageCount?: number // Default: 15
  // Callbacks
  onProgress?: (message: string, current?: number, total?: number) => void
  onRoomComplete?: (roomSlug: string, imageCount: number) => void
}

export interface Phase2GenerationResult {
  roomImages: number
  materialImages: number
  textureImages: number
  compositeImage: boolean
  anchorImage: boolean
  totalImages: number
  errors: string[]
}

/**
 * RoomView structure for roomProfiles[].views[]
 * Matches the schema's RoomView type
 */
export interface RoomView {
  id: string
  url: string
  orientation: 'main' | 'opposite' | 'left' | 'right'
  prompt?: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  createdAt: Date
}

/**
 * Result from generatePhase2RoomViews()
 * Contains room views ready to be stored in roomProfiles[].views[]
 */
export interface RoomViewsResult {
  roomTypeId: string
  roomSlug: string
  views: RoomView[]
}

// ============================================
// Main Generation Function
// ============================================

/**
 * Generate all Phase 2 images for a style
 */
export async function generatePhase2Images(
  options: Phase2GenerationOptions
): Promise<Phase2GenerationResult> {
  const {
    styleId,
    styleName,
    priceLevel,
    styleContext,
    visualContext,
    roomImageCount = 60,
    materialImageCount = 25,
    textureImageCount = 15,
    onProgress,
    onRoomComplete,
  } = options

  const result: Phase2GenerationResult = {
    roomImages: 0,
    materialImages: 0,
    textureImages: 0,
    compositeImage: false,
    anchorImage: false,
    totalImages: 0,
    errors: [],
  }

  console.log(`\n${'='.repeat(60)}`)
  console.log(`Phase 2 Image Generation: ${styleName.en}`)
  console.log(`Price Level: ${priceLevel}`)
  console.log(`Target: ${roomImageCount} rooms + ${materialImageCount} materials + ${textureImageCount} textures`)
  console.log(`${'='.repeat(60)}\n`)

  // ========================================
  // Step 1: Generate Room Overview Images
  // ========================================
  onProgress?.(`Step 1/5: Generating ${roomImageCount} room images...`, 0, roomImageCount)

  try {
    const roomResult = await generateRoomOverviewImages({
      styleId,
      styleName,
      priceLevel,
      styleContext,
      visualContext,
      targetCount: roomImageCount,
      onProgress: (msg, current, total) => {
        onProgress?.(`[Rooms] ${msg}`, current, total)
      },
      onRoomComplete,
    })
    result.roomImages = roomResult.count
  } catch (error) {
    const errorMsg = `Room generation failed: ${error instanceof Error ? error.message : String(error)}`
    result.errors.push(errorMsg)
    console.error(errorMsg)
  }

  // ========================================
  // Step 2: Generate Material Images
  // ========================================
  onProgress?.(`Step 2/5: Generating ${materialImageCount} material images...`, 0, materialImageCount)

  try {
    const materialResult = await generateMaterialStyleImages({
      styleId,
      styleName,
      priceLevel,
      styleContext,
      targetCount: materialImageCount,
      onProgress: (msg, current, total) => {
        onProgress?.(`[Materials] ${msg}`, current, total)
      },
    })
    result.materialImages = materialResult.count
  } catch (error) {
    const errorMsg = `Material generation failed: ${error instanceof Error ? error.message : String(error)}`
    result.errors.push(errorMsg)
    console.error(errorMsg)
  }

  // ========================================
  // Step 3: Generate Texture Images
  // ========================================
  onProgress?.(`Step 3/5: Generating ${textureImageCount} texture images...`, 0, textureImageCount)

  try {
    const textureResult = await generateTextureStyleImages({
      styleId,
      styleName,
      priceLevel,
      styleContext,
      targetCount: textureImageCount,
      onProgress: (msg, current, total) => {
        onProgress?.(`[Textures] ${msg}`, current, total)
      },
    })
    result.textureImages = textureResult.count
  } catch (error) {
    const errorMsg = `Texture generation failed: ${error instanceof Error ? error.message : String(error)}`
    result.errors.push(errorMsg)
    console.error(errorMsg)
  }

  // ========================================
  // Steps 4-5: Generate Composite + Anchor in Parallel
  // ========================================
  onProgress?.(`Steps 4-5: Generating composite + anchor in parallel...`)
  console.log(`\n🚀 PARALLEL Special Images: Composite + Anchor`)

  const specialImageOptions = { styleId, styleName, priceLevel, styleContext }

  const [compositeResult, anchorResult] = await Promise.allSettled([
    generateCompositeMoodBoard(specialImageOptions),
    generateAnchorStyleImage(specialImageOptions),
  ])

  // Process composite result
  if (compositeResult.status === 'fulfilled') {
    result.compositeImage = !!compositeResult.value
  } else {
    const errorMsg = `Composite generation failed: ${compositeResult.reason}`
    result.errors.push(errorMsg)
    console.error(errorMsg)
  }

  // Process anchor result
  if (anchorResult.status === 'fulfilled') {
    result.anchorImage = !!anchorResult.value
  } else {
    const errorMsg = `Anchor generation failed: ${anchorResult.reason}`
    result.errors.push(errorMsg)
    console.error(errorMsg)
  }

  // Calculate totals
  result.totalImages =
    result.roomImages +
    result.materialImages +
    result.textureImages +
    (result.compositeImage ? 1 : 0) +
    (result.anchorImage ? 1 : 0)

  console.log(`\n${'='.repeat(60)}`)
  console.log(`Phase 2 Generation Complete: ${styleName.en}`)
  console.log(`Room Images: ${result.roomImages}/${roomImageCount}`)
  console.log(`Material Images: ${result.materialImages}/${materialImageCount}`)
  console.log(`Texture Images: ${result.textureImages}/${textureImageCount}`)
  console.log(`Composite: ${result.compositeImage ? 'Yes' : 'No'}`)
  console.log(`Anchor: ${result.anchorImage ? 'Yes' : 'No'}`)
  console.log(`Total: ${result.totalImages} images`)
  console.log(`Errors: ${result.errors.length}`)
  console.log(`${'='.repeat(60)}\n`)

  return result
}

// ============================================
// Room Views Generation (for roomProfiles[].views[])
// ============================================

/**
 * Options for generating room views
 */
export interface RoomViewsGenerationOptions {
  styleName: { he: string; en: string }
  priceLevel: PriceLevel
  styleContext: {
    subCategoryName: string
    approachName: string
    colorName: string
    colorHex: string
  }
  visualContext?: {
    characteristics?: string[]
    visualElements?: string[]
    materialGuidance?: string
    colorGuidance?: string
  }
  referenceImages?: string[] // Sub-category images for consistency
  roomTypes?: typeof PHASE2_ROOM_TYPES // Subset of room types to generate
  onProgress?: (message: string, current: number, total: number) => void
  onRoomComplete?: (roomSlug: string, imageCount: number) => void
}

/**
 * Generate room views for roomProfiles[].views[]
 * This is the new unified approach that replaces both Act 4 and Phase 2 room StyleImage generation
 *
 * @returns Array of RoomViewsResult, one per room type, containing 4 views each
 */
export async function generatePhase2RoomViews(
  options: RoomViewsGenerationOptions
): Promise<RoomViewsResult[]> {
  const {
    styleName,
    priceLevel,
    styleContext,
    visualContext,
    referenceImages = [],
    roomTypes = PHASE2_ROOM_TYPES,
    onProgress,
    onRoomComplete,
  } = options

  const results: RoomViewsResult[] = []
  const totalImages = roomTypes.length * ROOM_VIEW_TYPES.length

  console.log(`\n${'='.repeat(60)}`)
  console.log(`Room Views Generation: ${styleName.en}`)
  console.log(`Rooms: ${roomTypes.length} × Views: ${ROOM_VIEW_TYPES.length} = ${totalImages} images`)
  console.log(`${'='.repeat(60)}\n`)

  // Get room type IDs from database
  const roomTypeMap = await ensureRoomTypesExist(roomTypes)

  // Store reference images for each room (first view becomes reference for subsequent views)
  const roomReferenceImages: Record<string, string> = {}
  let generatedCount = 0

  // Process each room type
  for (let roomIndex = 0; roomIndex < roomTypes.length; roomIndex++) {
    const room = roomTypes[roomIndex]
    const roomTypeId = roomTypeMap.get(room.slug) || ''
    const roomViews: RoomView[] = []

    console.log(`\n🏠 Room ${roomIndex + 1}/${roomTypes.length}: ${room.name.en}`)

    // Generate 4 views for this room
    for (let viewIndex = 0; viewIndex < ROOM_VIEW_TYPES.length; viewIndex++) {
      const view = ROOM_VIEW_TYPES[viewIndex]

      // Use first view of this room as reference for subsequent views
      const roomRef = roomReferenceImages[room.slug]
      // Also include sub-category reference images if provided
      const allReferenceImages = [
        ...(roomRef ? [roomRef] : []),
        ...(viewIndex === 0 ? referenceImages : []), // Only use sub-category refs for first view
      ].filter(Boolean)

      try {
        onProgress?.(`${room.name.en} - ${view.name}`, generatedCount, totalImages)

        const imageUrls = await generateAndUploadImages({
          entityType: 'style-room',
          entityName: styleName,
          numberOfImages: 1,
          roomContext: {
            roomTypeName: room.name.en,
            styleName: styleName.en,
            colorHex: styleContext.colorHex,
          },
          styleContext,
          visualContext,
          variationType: view.type as any,
          aspectRatio: view.aspectRatio,
          priceLevel,
          referenceImages: allReferenceImages.length > 0 ? allReferenceImages : undefined,
        })

        if (imageUrls.length > 0) {
          const url = imageUrls[0]

          // Store first view as reference for this room
          if (viewIndex === 0) {
            roomReferenceImages[room.slug] = url
          }

          // Create RoomView object
          const roomView: RoomView = {
            id: crypto.randomUUID(),
            url,
            orientation: view.orientation,
            status: 'COMPLETED',
            createdAt: new Date(),
          }

          roomViews.push(roomView)
          generatedCount++
          console.log(`   ✓ ${view.name}${allReferenceImages.length > 0 ? ' [ref]' : ''}`)
        } else {
          console.log(`   ✗ ${view.name} - no URL returned`)
        }
      } catch (error) {
        console.error(`   ✗ ${view.name}: ${error instanceof Error ? error.message : 'Unknown'}`)
      }

      // Small delay between views (if not last view)
      if (viewIndex < ROOM_VIEW_TYPES.length - 1) {
        await delay(1000)
      }
    }

    // Add result for this room
    results.push({
      roomTypeId,
      roomSlug: room.slug,
      views: roomViews,
    })

    onRoomComplete?.(room.slug, roomViews.length)
    console.log(`   ✅ ${roomViews.length}/${ROOM_VIEW_TYPES.length} views generated`)

    // Delay between rooms
    if (roomIndex < roomTypes.length - 1) {
      await delay(2000)
    }
  }

  const totalGenerated = results.reduce((sum, r) => sum + r.views.length, 0)
  console.log(`\n${'='.repeat(60)}`)
  console.log(`Room Views Generation Complete: ${totalGenerated}/${totalImages} images`)
  console.log(`${'='.repeat(60)}\n`)

  return results
}

// ============================================
// Room Overview Generation (Legacy - for StyleImage)
// ============================================

interface RoomGenerationOptions {
  styleId: string
  styleName: { he: string; en: string }
  priceLevel: PriceLevel
  styleContext: {
    subCategoryName: string
    approachName: string
    colorName: string
    colorHex: string
  }
  visualContext?: {
    characteristics?: string[]
    visualElements?: string[]
    materialGuidance?: string
    colorGuidance?: string
  }
  targetCount: number
  onProgress?: (message: string, current: number, total: number) => void
  onRoomComplete?: (roomSlug: string, imageCount: number) => void
}

async function generateRoomOverviewImages(
  options: RoomGenerationOptions
): Promise<{ count: number; byRoom: Map<string, number> }> {
  const {
    styleId,
    styleName,
    priceLevel,
    styleContext,
    visualContext,
    targetCount,
    onProgress,
    onRoomComplete,
  } = options

  const byRoom = new Map<string, number>()
  let totalGenerated = 0

  // Calculate how many rooms and views we need
  // Default: 15 rooms × 4 views = 60 images
  const roomsNeeded = Math.ceil(targetCount / ROOM_VIEW_TYPES.length)
  const roomsToGenerate = PHASE2_ROOM_TYPES.slice(0, roomsNeeded)
  const totalImages = roomsToGenerate.length * ROOM_VIEW_TYPES.length

  console.log(`\n🚀 PARALLEL Room Generation: ${roomsToGenerate.length} rooms × ${ROOM_VIEW_TYPES.length} views = ${totalImages} target images`)
  console.log(`   Concurrency: ${CONCURRENCY_LIMIT} parallel requests`)

  // First, get or create RoomType records
  const roomTypeMap = await ensureRoomTypesExist(roomsToGenerate)

  // Store reference images for each room (first view becomes reference for subsequent views)
  const roomReferenceImages: Record<string, string> = {}

  // ========================================
  // WAVE 1: Generate first view of all rooms in parallel
  // ========================================
  const firstView = ROOM_VIEW_TYPES[0]
  console.log(`\n📸 Wave 1/${ROOM_VIEW_TYPES.length}: Generating "${firstView.name}" for all ${roomsToGenerate.length} rooms in parallel...`)
  onProgress?.(`Wave 1: ${firstView.name} (all rooms)`, 0, totalImages)

  const wave1Promises = roomsToGenerate.map((room, roomIndex) =>
    limit(async () => {
      try {
        const imageUrls = await generateAndUploadImages({
          entityType: 'style-room',
          entityName: styleName,
          numberOfImages: 1,
          roomContext: {
            roomTypeName: room.name.en,
            styleName: styleName.en,
            colorHex: styleContext.colorHex,
          },
          styleContext,
          visualContext,
          variationType: firstView.type as any,
          aspectRatio: firstView.aspectRatio,
          priceLevel,
        })

        if (imageUrls.length > 0) {
          const url = imageUrls[0]

          // Save StyleImage record
          await prisma.styleImage.create({
            data: {
              styleId,
              url,
              imageCategory: 'ROOM_OVERVIEW',
              displayOrder: roomIndex * ROOM_VIEW_TYPES.length + 1,
              description: `${room.name.en} - ${firstView.name}`,
              tags: [room.slug, firstView.type, priceLevel.toLowerCase(), styleContext.subCategoryName.toLowerCase()],
              roomType: room.slug,
            },
          })

          console.log(`    ✓ ${room.name.en} (${firstView.name})`)
          return { roomSlug: room.slug, url, success: true }
        }
        return { roomSlug: room.slug, url: null, success: false }
      } catch (error) {
        console.error(`    ✗ ${room.name.en} (${firstView.name}): ${error instanceof Error ? error.message : 'Unknown'}`)
        return { roomSlug: room.slug, url: null, success: false }
      }
    })
  )

  const wave1Results = await Promise.allSettled(wave1Promises)

  // Store successful first views as reference images
  wave1Results.forEach((result) => {
    if (result.status === 'fulfilled' && result.value.success && result.value.url) {
      roomReferenceImages[result.value.roomSlug] = result.value.url
      totalGenerated++
      const currentCount = byRoom.get(result.value.roomSlug) || 0
      byRoom.set(result.value.roomSlug, currentCount + 1)
    }
  })

  console.log(`   Wave 1 complete: ${Object.keys(roomReferenceImages).length}/${roomsToGenerate.length} rooms generated`)

  // ========================================
  // WAVES 2-4: Generate remaining views using first image as reference
  // ========================================
  for (let viewIndex = 1; viewIndex < ROOM_VIEW_TYPES.length; viewIndex++) {
    const view = ROOM_VIEW_TYPES[viewIndex]
    const waveNum = viewIndex + 1

    console.log(`\n📸 Wave ${waveNum}/${ROOM_VIEW_TYPES.length}: Generating "${view.name}" for all rooms (with reference images)...`)
    onProgress?.(`Wave ${waveNum}: ${view.name} (all rooms)`, totalGenerated, totalImages)

    const wavePromises = roomsToGenerate.map((room, roomIndex) =>
      limit(async () => {
        const referenceUrl = roomReferenceImages[room.slug]

        try {
          const imageUrls = await generateAndUploadImages({
            entityType: 'style-room',
            entityName: styleName,
            numberOfImages: 1,
            roomContext: {
              roomTypeName: room.name.en,
              styleName: styleName.en,
              colorHex: styleContext.colorHex,
            },
            styleContext,
            visualContext,
            variationType: view.type as any,
            aspectRatio: view.aspectRatio,
            priceLevel,
            // CRITICAL: Pass first view as reference for room consistency
            referenceImages: referenceUrl ? [referenceUrl] : undefined,
          })

          if (imageUrls.length > 0) {
            await prisma.styleImage.create({
              data: {
                styleId,
                url: imageUrls[0],
                imageCategory: view.type.startsWith('detail') ? 'ROOM_DETAIL' : 'ROOM_OVERVIEW',
                displayOrder: roomIndex * ROOM_VIEW_TYPES.length + viewIndex + 1,
                description: `${room.name.en} - ${view.name}`,
                tags: [room.slug, view.type, priceLevel.toLowerCase(), styleContext.subCategoryName.toLowerCase()],
                roomType: room.slug,
              },
            })

            console.log(`    ✓ ${room.name.en} (${view.name})${referenceUrl ? ' [ref]' : ''}`)
            return { roomSlug: room.slug, success: true }
          }
          return { roomSlug: room.slug, success: false }
        } catch (error) {
          console.error(`    ✗ ${room.name.en} (${view.name}): ${error instanceof Error ? error.message : 'Unknown'}`)
          return { roomSlug: room.slug, success: false }
        }
      })
    )

    const waveResults = await Promise.allSettled(wavePromises)

    // Count successes
    waveResults.forEach((result) => {
      if (result.status === 'fulfilled' && result.value.success) {
        totalGenerated++
        const currentCount = byRoom.get(result.value.roomSlug) || 0
        byRoom.set(result.value.roomSlug, currentCount + 1)
      }
    })

    const waveSuccesses = waveResults.filter(r => r.status === 'fulfilled' && r.value.success).length
    console.log(`   Wave ${waveNum} complete: ${waveSuccesses}/${roomsToGenerate.length} rooms generated`)
  }

  // Report room completion for each room
  for (const room of roomsToGenerate) {
    const count = byRoom.get(room.slug) || 0
    onRoomComplete?.(room.slug, count)
  }

  console.log(`\n✅ Room generation complete: ${totalGenerated}/${totalImages} images`)
  return { count: totalGenerated, byRoom }
}

// ============================================
// Material Image Generation
// ============================================

interface MaterialGenerationOptions {
  styleId: string
  styleName: { he: string; en: string }
  priceLevel: PriceLevel
  styleContext: {
    subCategoryName: string
    approachName: string
    colorName: string
    colorHex: string
  }
  targetCount: number
  onProgress?: (message: string, current: number, total: number) => void
}

async function generateMaterialStyleImages(
  options: MaterialGenerationOptions
): Promise<{ count: number }> {
  const { styleId, styleName, priceLevel, styleContext, targetCount, onProgress } = options

  const materials = MATERIALS_BY_PRICE_LEVEL[priceLevel].slice(0, targetCount)

  console.log(`\n🚀 PARALLEL Material Generation: ${materials.length} materials (${priceLevel})`)
  console.log(`   Concurrency: ${CONCURRENCY_LIMIT} parallel requests`)
  onProgress?.(`Generating ${materials.length} materials in parallel`, 0, materials.length)

  const materialPromises = materials.map((material, i) =>
    limit(async () => {
      // Diverse aspect ratios for materials
      const aspectRatio = DIVERSE_ASPECT_RATIOS[i % DIVERSE_ASPECT_RATIOS.length]

      try {
        const imageUrls = await generateAndUploadImages({
          entityType: 'material',
          entityName: {
            en: material.name,
            he: material.he,
          },
          numberOfImages: 1,
          styleContext,
          priceLevel,
          aspectRatio,
        })

        if (imageUrls.length > 0) {
          await prisma.styleImage.create({
            data: {
              styleId,
              url: imageUrls[0],
              imageCategory: 'MATERIAL',
              displayOrder: 100 + i,
              description: `${material.name} - ${priceLevel} quality`,
              tags: [
                'material',
                material.category,
                priceLevel.toLowerCase(),
                material.name.toLowerCase().replace(/\s+/g, '-'),
              ],
            },
          })

          console.log(`  ✓ ${material.name}`)
          return 1
        }
        return 0
      } catch (error) {
        console.error(`  ✗ ${material.name}: ${error instanceof Error ? error.message : 'Unknown'}`)
        return 0
      }
    })
  )

  const results = await Promise.allSettled(materialPromises)
  const generated = results.reduce((sum, r) => sum + (r.status === 'fulfilled' ? r.value : 0), 0)

  console.log(`\n✅ Material generation complete: ${generated}/${materials.length} images`)
  return { count: generated }
}

// ============================================
// Texture Image Generation
// ============================================

interface TextureGenerationOptions {
  styleId: string
  styleName: { he: string; en: string }
  priceLevel: PriceLevel
  styleContext: {
    subCategoryName: string
    approachName: string
    colorName: string
    colorHex: string
  }
  targetCount: number
  onProgress?: (message: string, current: number, total: number) => void
}

async function generateTextureStyleImages(
  options: TextureGenerationOptions
): Promise<{ count: number }> {
  const { styleId, styleName, priceLevel, styleContext, targetCount, onProgress } = options

  const textures = TEXTURE_TYPES.slice(0, targetCount)

  console.log(`\n🚀 PARALLEL Texture Generation: ${textures.length} textures`)
  console.log(`   Concurrency: ${CONCURRENCY_LIMIT} parallel requests`)
  onProgress?.(`Generating ${textures.length} textures in parallel`, 0, textures.length)

  const texturePromises = textures.map((texture, i) =>
    limit(async () => {
      // Diverse aspect ratios for textures
      const aspectRatio = DIVERSE_ASPECT_RATIOS[i % DIVERSE_ASPECT_RATIOS.length]

      try {
        const imageUrls = await generateAndUploadImages({
          entityType: 'texture',
          entityName: {
            en: texture.name,
            he: texture.he,
          },
          numberOfImages: 1,
          styleContext,
          priceLevel,
          aspectRatio,
        })

        if (imageUrls.length > 0) {
          await prisma.styleImage.create({
            data: {
              styleId,
              url: imageUrls[0],
              imageCategory: 'TEXTURE',
              displayOrder: 200 + i,
              description: `${texture.name} - surface finish`,
              tags: [
                'texture',
                texture.category,
                priceLevel.toLowerCase(),
                texture.name.toLowerCase().replace(/\s+/g, '-'),
              ],
            },
          })

          console.log(`  ✓ ${texture.name}`)
          return 1
        }
        return 0
      } catch (error) {
        console.error(`  ✗ ${texture.name}: ${error instanceof Error ? error.message : 'Unknown'}`)
        return 0
      }
    })
  )

  const results = await Promise.allSettled(texturePromises)
  const generated = results.reduce((sum, r) => sum + (r.status === 'fulfilled' ? r.value : 0), 0)

  console.log(`\n✅ Texture generation complete: ${generated}/${textures.length} images`)
  return { count: generated }
}

// ============================================
// Composite Mood Board Generation
// ============================================

interface CompositeGenerationOptions {
  styleId: string
  styleName: { he: string; en: string }
  priceLevel: PriceLevel
  styleContext: {
    subCategoryName: string
    approachName: string
    colorName: string
    colorHex: string
  }
}

async function generateCompositeMoodBoard(options: CompositeGenerationOptions): Promise<string | null> {
  const { styleId, styleName, priceLevel, styleContext } = options

  console.log(`\nGenerating composite mood board for ${styleName.en}`)

  try {
    const imageUrls = await generateAndUploadImages({
      entityType: 'composite',
      entityName: styleName,
      numberOfImages: 1,
      styleContext,
      priceLevel,
      aspectRatio: '4:3',
    })

    if (imageUrls.length > 0) {
      const url = imageUrls[0]

      // Create StyleImage record
      await prisma.styleImage.create({
        data: {
          styleId,
          url,
          imageCategory: 'COMPOSITE',
          displayOrder: 0, // Top priority
          description: `Mood board composite for ${styleName.en}`,
          tags: ['composite', 'mood-board', priceLevel.toLowerCase()],
        },
      })

      // Update Style with compositeImageUrl
      await prisma.style.update({
        where: { id: styleId },
        data: { compositeImageUrl: url },
      })

      console.log(`  ✓ Composite: ${url.substring(0, 60)}...`)
      return url
    }
  } catch (error) {
    console.error(`  ✗ Composite: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  return null
}

// ============================================
// Anchor Image Generation
// ============================================

async function generateAnchorStyleImage(options: CompositeGenerationOptions): Promise<string | null> {
  const { styleId, styleName, priceLevel, styleContext } = options

  console.log(`\nGenerating anchor image for ${styleName.en}`)

  try {
    const imageUrls = await generateAndUploadImages({
      entityType: 'anchor',
      entityName: styleName,
      numberOfImages: 1,
      styleContext,
      priceLevel,
      aspectRatio: '16:9',
    })

    if (imageUrls.length > 0) {
      const url = imageUrls[0]

      // Create StyleImage record
      await prisma.styleImage.create({
        data: {
          styleId,
          url,
          imageCategory: 'ANCHOR',
          displayOrder: 1, // Second priority after composite
          description: `Hero anchor image for ${styleName.en}`,
          tags: ['anchor', 'hero', priceLevel.toLowerCase()],
        },
      })

      // Update Style with anchorImageUrl
      await prisma.style.update({
        where: { id: styleId },
        data: { anchorImageUrl: url },
      })

      console.log(`  ✓ Anchor: ${url.substring(0, 60)}...`)
      return url
    }
  } catch (error) {
    console.error(`  ✗ Anchor: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  return null
}

// ============================================
// Helper Functions
// ============================================

/**
 * Ensure RoomType records exist for the room types we're generating
 */
async function ensureRoomTypesExist(
  rooms: readonly { slug: string; name: { en: string; he: string }; priority: number }[]
): Promise<Map<string, string>> {
  const roomTypeMap = new Map<string, string>()

  // Get default room category
  let defaultCategory = await prisma.roomCategory.findFirst()

  if (!defaultCategory) {
    // Create default category if none exists
    defaultCategory = await prisma.roomCategory.create({
      data: {
        slug: 'residential',
        name: { he: 'מגורים', en: 'Residential' },
        description: { he: 'חללי מגורים פרטיים', en: 'Private residential spaces' },
        order: 0,
      },
    })
  }

  for (const room of rooms) {
    // Check if RoomType exists
    let roomType = await prisma.roomType.findUnique({
      where: { slug: room.slug },
    })

    if (!roomType) {
      // Create RoomType
      roomType = await prisma.roomType.create({
        data: {
          slug: room.slug,
          name: room.name,
          categoryId: defaultCategory.id,
          order: room.priority,
        },
      })
      console.log(`  Created RoomType: ${room.slug}`)
    }

    roomTypeMap.set(room.slug, roomType.id)
  }

  return roomTypeMap
}

/**
 * Delay helper
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ============================================
// Utility: Get Style Image Stats
// ============================================

export async function getStyleImageStats(styleId: string): Promise<{
  total: number
  byCategory: Record<string, number>
  byRoom: Record<string, number>
}> {
  const images = await prisma.styleImage.findMany({
    where: { styleId },
    select: { imageCategory: true, roomType: true },
  })

  const byCategory: Record<string, number> = {}
  const byRoom: Record<string, number> = {}

  for (const img of images) {
    byCategory[img.imageCategory] = (byCategory[img.imageCategory] || 0) + 1
    if (img.roomType) {
      byRoom[img.roomType] = (byRoom[img.roomType] || 0) + 1
    }
  }

  return {
    total: images.length,
    byCategory,
    byRoom,
  }
}
