/**
 * Seed Service
 *
 * Main service for seeding the database with detailed content
 * using Gemini AI to generate comprehensive descriptions
 */

import { PrismaClient } from '@prisma/client'
// AI SDK Migration: Using Vercel AI SDK for structured output, retry logic, and cost tracking
import {
  generateCategoryContent,
  generateSubCategoryContent,
  generateStyleContent,
  generateApproachContent,
  generateRoomTypeContent,
  generateAndUploadImages,
  generateGoldenScenes,
  generateStyleRoomImages,
  getGlobalTokenUsage,
  logTokenUsage,
  type LocalizedDetailedContent,
} from '../ai'
import { parseAllBaseData, type ParsedData } from './parser'
import { convertRoomProfileToIds } from './room-profile-converter'
import { convertGalleryItems, analyzeUrls } from '../storage/base64-converter'

const prisma = new PrismaClient()

const GOLDEN_SCENES = [
  { name: 'entry', promptSuffix: 'Exterior entrance, wide angle, welcoming atmosphere', complement: 'style-dependent' },
  { name: 'living', promptSuffix: 'Living room, cozy, focal point fireplace or seating', complement: 'style-dependent' },
  { name: 'dining', promptSuffix: 'Dining area, elegant table setting, lighting feature', complement: 'style-dependent' },
  { name: 'kitchen', promptSuffix: 'Kitchen, functional and stylish, island or counter', complement: 'style-dependent' },
  { name: 'master_bed', promptSuffix: 'Master bedroom, serene, plush bedding, relaxing', complement: 'style-dependent' },
  { name: 'bath', promptSuffix: 'Bathroom, spa-like, clean lines, material focus', complement: 'style-dependent' },
]

function slugify(text: string): string {
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '')             // Trim - from end of text
}

/**
 * Check if a URL is a base64 data URL (which should NOT be stored in MongoDB)
 * MongoDB has a 16MB document limit, and base64 images can be 20-30MB each
 */
function isBase64DataUrl(url: string): boolean {
  return url?.startsWith('data:') || false
}

/**
 * Filter gallery items to remove any base64 data URLs
 * This prevents MongoDB 16MB document limit errors
 * Returns only items with valid HTTP/HTTPS URLs
 */
function filterGalleryItemsForStorage(items: any[], logPrefix: string = ''): any[] {
  const validItems: any[] = []
  const skippedCount = { base64: 0, invalid: 0 }

  for (const item of items) {
    if (!item.url) {
      skippedCount.invalid++
      continue
    }

    if (isBase64DataUrl(item.url)) {
      skippedCount.base64++
      continue
    }

    // Accept HTTP/HTTPS URLs (including placeholder URLs)
    if (item.url.startsWith('http://') || item.url.startsWith('https://')) {
      validItems.push(item)
    } else {
      skippedCount.invalid++
    }
  }

  if (skippedCount.base64 > 0 || skippedCount.invalid > 0) {
    console.warn(
      `${logPrefix}⚠️  Filtered gallery items: ${skippedCount.base64} base64 URLs removed, ${skippedCount.invalid} invalid URLs removed. Keeping ${validItems.length}/${items.length} items.`
    )
  }

  return validItems
}

/**
 * Pre-create material entities (deduplication by name)
 * Note: This is called BEFORE style creation, so no StyleMaterial links are created here.
 * StyleMaterial links are created later in the "Material Entity Creation" step.
 */
async function ensureAssetsExist(
  materialNames: string[],
  colorNames: string[],
  styleContext: string,
  priceLevel: 'REGULAR' | 'LUXURY' = 'REGULAR'
): Promise<{ materialIds: string[], colorIds: string[] }> {
  // Import the new material generator
  const { findOrCreateMaterial } = await import('./material-generator')

  const materialIds: string[] = []
  const colorIds: string[] = []

  console.log(`\n🧱 Pre-creating material entities for: ${styleContext}`)

  for (const name of materialNames) {
    try {
      // Use the new findOrCreateMaterial function (without styleId - no linking yet)
      const materialId = await findOrCreateMaterial(
        { name, priceLevel },
        { generateImage: false } // Don't generate images here, will be done later
      )
      materialIds.push(materialId)
    } catch (e) {
      console.warn(`Failed to create/find material ${name}:`, e)
    }
  }

  // Colors - just find existing, don't create
  for (const colorName of colorNames) {
    const existingColor = await prisma.color.findFirst({
      where: {
        OR: [
          { name: { is: { en: { contains: colorName, mode: 'insensitive' } } } },
          { name: { is: { he: { contains: colorName, mode: 'insensitive' } } } },
        ]
      }
    })
    if (existingColor) {
      colorIds.push(existingColor.id)
    }
  }

  console.log(`   ✅ Pre-created ${materialIds.length} materials, found ${colorIds.length} colors`)
  return { materialIds, colorIds }
}


export interface SeedOptions {
  /**
   * Whether to skip existing entities (don't overwrite)
   */
  skipExisting?: boolean

  /**
   * Only seed specific entity types
   */
  only?: ('categories' | 'subCategories' | 'approaches' | 'roomTypes' | 'styles')[]

  /**
   * Limit the number of items to seed (for testing)
   */
  limit?: number

  /**
   * Progress callback
   */
  onProgress?: (message: string, current?: number, total?: number) => void

  /**
   * Dry run - don't actually save to database
   */
  dryRun?: boolean

  /**
   * Generate images for entities (requires image generation API)
   * Default: false (will use placeholders until API is integrated)
   */
  generateImages?: boolean

  /**
   * Number of images to generate per entity
   * Default: 3
   */
  imagesPerEntity?: number
}

export interface SeedResult {
  success: boolean
  stats: {
    categories: { created: number; updated: number; skipped: number }
    subCategories: { created: number; updated: number; skipped: number }
    approaches: { created: number; updated: number; skipped: number }
    roomTypes: { created: number; updated: number; skipped: number }
    styles: {
      created: number
      updated: number
      skipped: number
      // Extended stats for styles
      totalSubCategories?: number
      alreadyGenerated?: number
      pendingBeforeSeed?: number
    }
  }
  errors: Array<{ entity: string; error: string }>
}

/**
 * Main seed function
 */
export async function seedAllContent(options: SeedOptions = {}): Promise<SeedResult> {
  const { skipExisting = true, only, limit, onProgress, dryRun = false } = options

  const result: SeedResult = {
    success: true,
    stats: {
      categories: { created: 0, updated: 0, skipped: 0 },
      subCategories: { created: 0, updated: 0, skipped: 0 },
      approaches: { created: 0, updated: 0, skipped: 0 },
      roomTypes: { created: 0, updated: 0, skipped: 0 },
      styles: { created: 0, updated: 0, skipped: 0 },
    },
    errors: [],
  }

  try {
    onProgress?.('📖 Parsing data from markdown file...')
    const parsedData = parseAllBaseData()
    onProgress?.('✅ Data parsed successfully')

    // Seed in order: Approaches → Room Types → Categories → Styles → SubCategories

    if (!only || only.includes('approaches')) {
      await seedApproaches(parsedData, result, {
        skipExisting,
        limit,
        onProgress,
        dryRun,
        generateImages: options.generateImages,
        imagesPerEntity: options.imagesPerEntity
      })
    }

    if (!only || only.includes('roomTypes')) {
      await seedRoomTypes(parsedData, result, {
        skipExisting,
        limit,
        onProgress,
        dryRun,
        generateImages: options.generateImages,
        imagesPerEntity: options.imagesPerEntity
      })
    }

    if (!only || only.includes('categories')) {
      await seedCategories(parsedData, result, {
        skipExisting,
        limit,
        onProgress,
        dryRun,
        generateImages: options.generateImages,
        imagesPerEntity: options.imagesPerEntity
      })
    }

    if (!only || only.includes('subCategories')) {
      await seedSubCategories(parsedData, result, {
        skipExisting,
        limit,
        onProgress,
        dryRun,
        generateImages: options.generateImages,
        imagesPerEntity: options.imagesPerEntity
      })
    }

    onProgress?.('✅ Seeding completed successfully!')
    result.success = true
  } catch (error) {
    result.success = false
    result.errors.push({
      entity: 'global',
      error: error instanceof Error ? error.message : String(error),
    })
    onProgress?.(`❌ Error: ${error instanceof Error ? error.message : String(error)}`)
  } finally {
    await prisma.$disconnect()
  }

  return result
}

/**
 * Seed approaches
 */
async function seedApproaches(
  data: ParsedData,
  result: SeedResult,
  options: SeedOptions
): Promise<void> {
  const { onProgress, skipExisting, limit, dryRun } = options
  const approaches = limit ? data.approaches.slice(0, limit) : data.approaches

  onProgress?.(`🎨 Seeding ${approaches.length} approaches...`, 0, approaches.length)

  for (let i = 0; i < approaches.length; i++) {
    const approachData = approaches[i]

    try {
      // Check if exists
      const existing = await prisma.approach.findUnique({
        where: { slug: approachData.slug },
      })

      if (existing && skipExisting) {
        result.stats.approaches.skipped++
        onProgress?.(
          `⏭️  Skipping existing approach: ${approachData.name.he} / ${approachData.name.en}`,
          i + 1,
          approaches.length
        )
        continue
      }

      // Generate detailed content using Gemini
      onProgress?.(
        `🤖 Generating content for approach: ${approachData.name.he} / ${approachData.name.en}`,
        i + 1,
        approaches.length
      )

      const detailedContent = await generateApproachContent(approachData.name, {
        description: approachData.description,
      })

      // Generate images if requested
      let images: string[] = []
      if (options.generateImages) {
        onProgress?.(
          `🖼️  Generating ${options.imagesPerEntity || 3} images for approach: ${approachData.name.he}`,
          i + 1,
          approaches.length
        )

        try {
          images = await generateAndUploadImages({
            entityType: 'approach',
            entityName: approachData.name,
            description: {
              he: detailedContent.he.description || '',
              en: detailedContent.en.description || '',
            },
            numberOfImages: options.imagesPerEntity || 3,
          })
        } catch (error) {
          onProgress?.(
            `⚠️  Warning: Failed to generate images for ${approachData.name.he}: ${error instanceof Error ? error.message : String(error)}`,
            i + 1,
            approaches.length
          )
        }
      }

      if (dryRun) {
        onProgress?.(
          `[DRY RUN] Would create/update approach: ${approachData.name.he}${images.length > 0 ? ` with ${images.length} images` : ''}`,
          i + 1,
          approaches.length
        )
        result.stats.approaches.created++
        continue
      }

      // Create or update
      const approach = await prisma.approach.upsert({
        where: { slug: approachData.slug },
        create: {
          slug: approachData.slug,
          name: approachData.name,
          description: {
            he: detailedContent.he.introduction || detailedContent.he.description || '',
            en: detailedContent.en.introduction || detailedContent.en.description || '',
          },
          order: approachData.order,
          images,
          detailedContent,
          metadata: {
            isDefault: false,
            version: '1.0.0',
            tags: [],
            usage: 0,
          },
        },
        update: {
          name: approachData.name,
          description: {
            he: detailedContent.he.introduction || detailedContent.he.description || '',
            en: detailedContent.en.introduction || detailedContent.en.description || '',
          },
          order: approachData.order,
          ...(images.length > 0 && { images }),
          detailedContent,
        },
      })

      if (existing) {
        result.stats.approaches.updated++
        onProgress?.(
          `✏️  Updated approach: ${approach.name.he}`,
          i + 1,
          approaches.length
        )
      } else {
        result.stats.approaches.created++
        onProgress?.(
          `✅ Created approach: ${approach.name.he}`,
          i + 1,
          approaches.length
        )
      }
    } catch (error) {
      result.errors.push({
        entity: `approach:${approachData.slug}`,
        error: error instanceof Error ? error.message : String(error),
      })
      onProgress?.(
        `❌ Error with approach ${approachData.name.he}: ${error instanceof Error ? error.message : String(error)}`,
        i + 1,
        approaches.length
      )
    }
  }
}

/**
 * Seed room types
 */
async function seedRoomTypes(
  data: ParsedData,
  result: SeedResult,
  options: SeedOptions
): Promise<void> {
  const { onProgress, skipExisting, limit, dryRun } = options
  const roomTypes = limit ? data.roomTypes.slice(0, limit) : data.roomTypes

  onProgress?.(`🏠 Seeding ${roomTypes.length} room types...`, 0, roomTypes.length)

  for (let i = 0; i < roomTypes.length; i++) {
    const roomTypeData = roomTypes[i]

    try {
      // Check if exists
      const existing = await prisma.roomType.findUnique({
        where: { slug: roomTypeData.slug },
      })

      if (existing && skipExisting) {
        result.stats.roomTypes.skipped++
        onProgress?.(
          `⏭️  Skipping existing room type: ${roomTypeData.name.he}`,
          i + 1,
          roomTypes.length
        )
        continue
      }

      // Generate detailed content using Gemini
      onProgress?.(
        `🤖 Generating content for room type: ${roomTypeData.name.he} / ${roomTypeData.name.en}`,
        i + 1,
        roomTypes.length
      )

      const detailedContent = await generateRoomTypeContent(roomTypeData.name, {
        category: roomTypeData.category,
      })

      if (dryRun) {
        onProgress?.(
          `[DRY RUN] Would create/update room type: ${roomTypeData.name.he}`,
          i + 1,
          roomTypes.length
        )
        result.stats.roomTypes.created++
        continue
      }

      // Create or update
      const roomType = await prisma.roomType.upsert({
        where: { slug: roomTypeData.slug },
        create: {
          slug: roomTypeData.slug,
          name: roomTypeData.name,
          description: {
            he: detailedContent.he.introduction || detailedContent.he.description || '',
            en: detailedContent.en.introduction || detailedContent.en.description || '',
          },
          order: roomTypeData.order,
          detailedContent,
        },
        update: {
          name: roomTypeData.name,
          description: {
            he: detailedContent.he.introduction || detailedContent.he.description || '',
            en: detailedContent.en.introduction || detailedContent.en.description || '',
          },
          order: roomTypeData.order,
          detailedContent,
        },
      })

      if (existing) {
        result.stats.roomTypes.updated++
        onProgress?.(
          `✏️  Updated room type: ${roomType.name.he}`,
          i + 1,
          roomTypes.length
        )
      } else {
        result.stats.roomTypes.created++
        onProgress?.(
          `✅ Created room type: ${roomType.name.he}`,
          i + 1,
          roomTypes.length
        )
      }
    } catch (error) {
      result.errors.push({
        entity: `roomType:${roomTypeData.slug}`,
        error: error instanceof Error ? error.message : String(error),
      })
      onProgress?.(
        `❌ Error with room type ${roomTypeData.name.he}: ${error instanceof Error ? error.message : String(error)}`,
        i + 1,
        roomTypes.length
      )
    }
  }
}

/**
 * Seed categories (and styles within them)
 */
async function seedCategories(
  data: ParsedData,
  result: SeedResult,
  options: SeedOptions
): Promise<void> {
  const { onProgress, skipExisting, limit, dryRun } = options
  const categories = limit ? data.categories.slice(0, limit) : data.categories

  onProgress?.(`📚 Seeding ${categories.length} categories...`, 0, categories.length)

  for (let i = 0; i < categories.length; i++) {
    const categoryData = categories[i]

    try {
      // Check if exists
      const existing = await prisma.category.findUnique({
        where: { slug: categoryData.slug },
      })

      if (existing && skipExisting) {
        result.stats.categories.skipped++
        onProgress?.(
          `⏭️  Skipping existing category: ${categoryData.name.he}`,
          i + 1,
          categories.length
        )
        continue
      }

      // Generate detailed content using Gemini
      onProgress?.(
        `🤖 Generating content for category: ${categoryData.name.he} / ${categoryData.name.en}`,
        i + 1,
        categories.length
      )

      const detailedContent = await generateCategoryContent(categoryData.name, {
        description: categoryData.description,
        period: categoryData.period,
      })

      // Generate images if requested
      let images: string[] = []
      if (options.generateImages) {
        onProgress?.(
          `🖼️  Generating ${options.imagesPerEntity || 3} images for category: ${categoryData.name.he}`,
          i + 1,
          categories.length
        )

        try {
          images = await generateAndUploadImages({
            entityType: 'category',
            entityName: categoryData.name,
            description: categoryData.description,
            period: categoryData.period,
            numberOfImages: options.imagesPerEntity || 3,
          })
        } catch (error) {
          onProgress?.(
            `⚠️  Warning: Failed to generate images for ${categoryData.name.he}: ${error instanceof Error ? error.message : String(error)}`,
            i + 1,
            categories.length
          )
        }
      }

      if (dryRun) {
        onProgress?.(
          `[DRY RUN] Would create/update category: ${categoryData.name.he}${images.length > 0 ? ` with ${images.length} images` : ''}`,
          i + 1,
          categories.length
        )
        result.stats.categories.created++
        continue
      }

      // Create or update category
      const category = await prisma.category.upsert({
        where: { slug: categoryData.slug },
        create: {
          slug: categoryData.slug,
          name: categoryData.name,
          description: {
            he: detailedContent.he.introduction || categoryData.description.he,
            en: detailedContent.en.introduction || categoryData.description.en,
          },
          order: categoryData.order,
          images,
          detailedContent,
        },
        update: {
          name: categoryData.name,
          description: {
            he: detailedContent.he.introduction || categoryData.description.he,
            en: detailedContent.en.introduction || categoryData.description.en,
          },
          order: categoryData.order,
          ...(images.length > 0 && { images }),
          detailedContent,
        },
      })

      if (existing) {
        result.stats.categories.updated++
        onProgress?.(
          `✏️  Updated category: ${category.name.he}`,
          i + 1,
          categories.length
        )
      } else {
        result.stats.categories.created++
        onProgress?.(
          `✅ Created category: ${category.name.he}`,
          i + 1,
          categories.length
        )
      }
    } catch (error) {
      result.errors.push({
        entity: `category:${categoryData.slug}`,
        error: error instanceof Error ? error.message : String(error),
      })
      onProgress?.(
        `❌ Error with category ${categoryData.name.he}: ${error instanceof Error ? error.message : String(error)}`,
        i + 1,
        categories.length
      )
    }
  }
}

/**
 * Seed sub-categories (all 60+ items from all categories)
 */
async function seedSubCategories(
  data: ParsedData,
  result: SeedResult,
  options: SeedOptions
): Promise<void> {
  const { onProgress, skipExisting, limit, dryRun } = options
  const subCategories = limit ? data.subCategories.slice(0, limit) : data.subCategories

  onProgress?.(`📂 Seeding ${subCategories.length} sub-categories...`, 0, subCategories.length)

  // Get all categories for lookup
  const categories = await prisma.category.findMany({
    select: { id: true, slug: true, name: true },
  })

  const categoryMap = new Map(categories.map((c) => [c.slug, c]))

  for (let i = 0; i < subCategories.length; i++) {
    const subCategoryData = subCategories[i]

    try {
      // Find parent category
      const parentCategory = categoryMap.get(subCategoryData.categorySlug)

      if (!parentCategory) {
        onProgress?.(
          `⚠️  Warning: Could not find category "${subCategoryData.categorySlug}" for sub-category "${subCategoryData.name.he}"`,
          i + 1,
          subCategories.length
        )
        result.errors.push({
          entity: `subCategory:${subCategoryData.slug}`,
          error: `Parent category not found: ${subCategoryData.categorySlug}`,
        })
        continue
      }

      // Check if exists (unique by slug + categoryId)
      const existing = await prisma.subCategory.findFirst({
        where: {
          slug: subCategoryData.slug,
          categoryId: parentCategory.id,
        },
      })

      if (existing && skipExisting) {
        result.stats.subCategories.skipped++
        onProgress?.(
          `⏭️  Skipping existing sub-category: ${subCategoryData.name.he}`,
          i + 1,
          subCategories.length
        )
        continue
      }

      // Generate detailed content using Gemini
      onProgress?.(
        `🤖 Generating content for sub-category: ${subCategoryData.name.he} / ${subCategoryData.name.en}`,
        i + 1,
        subCategories.length
      )

      const detailedContent = await generateSubCategoryContent(
        subCategoryData.name,
        parentCategory.name,
        {
          period: subCategoryData.period,
        }
      )

      // Generate images if requested
      let images: string[] = []
      if (options.generateImages) {
        onProgress?.(
          `🖼️  Generating ${options.imagesPerEntity || 3} images for sub-category: ${subCategoryData.name.he}`,
          i + 1,
          subCategories.length
        )

        try {
          images = await generateAndUploadImages({
            entityType: 'subcategory',
            entityName: subCategoryData.name,
            description: {
              he: detailedContent.he.description || '',
              en: detailedContent.en.description || '',
            },
            period: subCategoryData.period,
            numberOfImages: options.imagesPerEntity || 3,
          })
        } catch (error) {
          onProgress?.(
            `⚠️  Warning: Failed to generate images for ${subCategoryData.name.he}: ${error instanceof Error ? error.message : String(error)}`,
            i + 1,
            subCategories.length
          )
        }
      }

      if (dryRun) {
        onProgress?.(
          `[DRY RUN] Would create/update sub-category: ${subCategoryData.name.he}${images.length > 0 ? ` with ${images.length} images` : ''}`,
          i + 1,
          subCategories.length
        )
        result.stats.subCategories.created++
        continue
      }

      // Create or update
      if (existing) {
        const updated = await prisma.subCategory.update({
          where: { id: existing.id },
          data: {
            name: subCategoryData.name,
            description: {
              he: detailedContent.he.introduction || '',
              en: detailedContent.en.introduction || '',
            },
            order: subCategoryData.order,
            ...(images.length > 0 && { images }),
            detailedContent,
          },
        })
        result.stats.subCategories.updated++
        onProgress?.(
          `✏️  Updated sub-category: ${updated.name.he}`,
          i + 1,
          subCategories.length
        )
      } else {
        const created = await prisma.subCategory.create({
          data: {
            slug: subCategoryData.slug,
            name: subCategoryData.name,
            description: {
              he: detailedContent.he.introduction || '',
              en: detailedContent.en.introduction || '',
            },
            order: subCategoryData.order,
            categoryId: parentCategory.id,
            images,
            detailedContent,
          },
        })
        result.stats.subCategories.created++
        onProgress?.(
          `✅ Created sub-category: ${created.name.he}`,
          i + 1,
          subCategories.length
        )
      }
    } catch (error) {
      result.errors.push({
        entity: `subCategory:${subCategoryData.slug}`,
        error: error instanceof Error ? error.message : String(error),
      })
      onProgress?.(
        `❌ Error with sub-category ${subCategoryData.name.he}: ${error instanceof Error ? error.message : String(error)}`,
        i + 1,
        subCategories.length
      )
    }
  }
}

/**
 * Seed styles with AI-powered selection and comprehensive room profiles
 *
 * For each sub-category:
 * 1. AI selects optimal approach and color
 * 2. Generates hybrid poetic + factual content
 * 3. Generates 3 general style images
 * 4. Generates room profiles for all 24 room types
 * 5. Generates 3 images per room type
 */
export async function seedStyles(
  options: SeedOptions & {
    categoryFilter?: string
    subCategoryFilter?: string
    generateRoomProfiles?: boolean
    roomTypeFilter?: string[]  // Filter specific room types (slugs)
    executionId?: string // For tracking in SeedExecution table
    onStyleCompleted?: (styleId: string, styleName: { he: string; en: string }) => Promise<void>
    // Manual generation mode
    manualMode?: boolean
    approachId?: string
    colorId?: string
    // Phase 2: Price level control
    priceLevel?: 'REGULAR' | 'LUXURY' | 'RANDOM'
    // Phase 2: Full image generation (60 rooms + 25 materials + 15 textures + composite + anchor)
    phase2FullGeneration?: boolean
    // Phase 2: Image generation counts (when phase2FullGeneration is true)
    roomImageCount?: number // Default: 60
    materialImageCount?: number // Default: 25
    textureImageCount?: number // Default: 15
  } = {}
): Promise<SeedResult> {
  const {
    skipExisting = true,
    limit,
    onProgress,
    dryRun = false,
    generateRoomProfiles = true,
    roomTypeFilter,
    executionId,
    onStyleCompleted,
    manualMode = false,
    approachId,
    colorId,
    phase2FullGeneration = false,
    roomImageCount = 60,
    materialImageCount = 25,
    textureImageCount = 15,
  } = options

  const result: SeedResult = {
    success: true,
    stats: {
      categories: { created: 0, updated: 0, skipped: 0 },
      subCategories: { created: 0, updated: 0, skipped: 0 },
      approaches: { created: 0, updated: 0, skipped: 0 },
      roomTypes: { created: 0, updated: 0, skipped: 0 },
      styles: { created: 0, updated: 0, skipped: 0 },
    },
    errors: [],
  }

  try {
    // Step 0: Check if resuming and find incomplete style
    let resumingStyleId: string | null = null
    let resumingStyleRoomIndex = 0

    if (executionId) {
      onProgress?.('🔍 Checking for incomplete style to resume...')
      console.log('🔍 Seed service checking execution:', executionId)

      const execution = await prisma.seedExecution.findUnique({
        where: { id: executionId },
      })

      console.log('📊 Execution data:', {
        found: !!execution,
        generatedStylesCount: execution?.generatedStyles?.length || 0,
        status: execution?.status,
      })

      if (execution && execution.generatedStyles.length > 0) {
        // Get the last style that was being worked on
        const lastGeneratedStyleRef = execution.generatedStyles[execution.generatedStyles.length - 1]
        const lastStyle = await prisma.style.findUnique({
          where: { id: lastGeneratedStyleRef.styleId },
        })

        if (lastStyle) {
          const currentRoomCount = (lastStyle.roomProfiles as any[])?.length || 0
          const totalRoomsExpected = roomTypeFilter && roomTypeFilter.length > 0
            ? roomTypeFilter.length
            : (await prisma.roomType.count())

          // If the last style has incomplete room profiles, resume from there
          if (currentRoomCount < totalRoomsExpected) {
            resumingStyleId = lastStyle.id
            resumingStyleRoomIndex = currentRoomCount
            onProgress?.(`✅ Found incomplete style: ${lastStyle.name.en} (${currentRoomCount}/${totalRoomsExpected} rooms)`)
            onProgress?.(`   Will continue from room ${currentRoomCount + 1}`)
          }
        }
      }
    }

    // Step 1: Query all required data from database
    onProgress?.('📊 Querying database for sub-categories, approaches, colors, and room types...')

    const [subCategories, approaches, colors, roomTypes] = await Promise.all([
      prisma.subCategory.findMany({
        where: options.subCategoryFilter
          ? { slug: options.subCategoryFilter }
          : options.categoryFilter
          ? { category: { slug: options.categoryFilter } }
          : {},
        include: { category: true },
      }),
      prisma.approach.findMany(),
      prisma.color.findMany({
        where: { organizationId: null }, // Only global colors
      }),
      prisma.roomType.findMany({
        where: roomTypeFilter && roomTypeFilter.length > 0
          ? { slug: { in: roomTypeFilter } }
          : {},
      }),
    ])

    onProgress?.(
      `✅ Found ${subCategories.length} sub-categories, ${approaches.length} approaches, ${colors.length} colors, ${roomTypes.length} room types`
    )

    // Step 1.5: Auto-filter sub-categories that already have styles (prevent duplicates)
    onProgress?.('🔍 Checking for existing styles to prevent duplicates...')

    const existingStyles = await prisma.style.findMany({
      select: { subCategoryId: true },
      distinct: ['subCategoryId'],
    })

    const alreadyGeneratedIds = new Set(existingStyles.map((s) => s.subCategoryId))

    // Filter out sub-categories that already have styles
    const pendingSubCategories = subCategories.filter(
      (sc) => !alreadyGeneratedIds.has(sc.id)
    )

    onProgress?.(
      `✅ Status: ${alreadyGeneratedIds.size}/${subCategories.length} sub-categories already have styles, ${pendingSubCategories.length} pending generation`
    )

    if (pendingSubCategories.length === 0) {
      onProgress?.('✨ All sub-categories already have generated styles! No work to do.')
      result.success = true
      return result
    }

    // Apply limit to pending sub-categories only
    const subCatsToProcess = limit
      ? pendingSubCategories.slice(0, limit)
      : pendingSubCategories

    onProgress?.(
      `📝 Will generate ${subCatsToProcess.length} styles from pending sub-categories`
    )

    // Update result stats with totals
    result.stats.styles.totalSubCategories = subCategories.length
    result.stats.styles.alreadyGenerated = alreadyGeneratedIds.size
    result.stats.styles.pendingBeforeSeed = pendingSubCategories.length

    // Import AI selection and generation functions (AI SDK based)
    const { selectOptimalApproachAndColor, batchSelectOptimalCombinations, batchGenerateRoomProfiles } =
      await import('../ai')
    // Note: generateGoldenScenes and generateStyleRoomImages imported at top level now

    // Step 2: Batch AI selection OR manual selection
    let selections: Map<string, { approachId: string; colorId: string; confidence: number; reasoning: { he: string; en: string } }>

    if (manualMode && approachId && colorId) {
      // MANUAL MODE: Use user-provided approach & color
      onProgress?.('✅ Using manual approach & color selection')
      selections = new Map()

      // Validate that approach and color exist
      const selectedApproach = approaches.find((a) => a.id === approachId)
      const selectedColor = colors.find((c) => c.id === colorId)

      if (!selectedApproach || !selectedColor) {
        throw new Error(
          `Invalid manual selection: Approach ${approachId} or Color ${colorId} not found`
        )
      }

      // Apply same approach/color to all sub-categories being processed
      subCatsToProcess.forEach((sc) => {
        selections.set(sc.id, {
          approachId: approachId,
          colorId: colorId,
          confidence: 1.0,
          reasoning: {
            he: 'בחירה ידנית על ידי המשתמש',
            en: 'Manual selection by user',
          },
        })
      })

      onProgress?.(
        `   Using: ${selectedApproach.name.en} + ${selectedColor.name.en} for ${subCatsToProcess.length} style(s)`
      )
    } else {
      // AI MODE: Batch select optimal combinations
      onProgress?.(
        `🤖 AI selecting optimal approach & color combinations for ${subCatsToProcess.length} sub-categories...`,
        0,
        subCatsToProcess.length
      )

      selections = await batchSelectOptimalCombinations(
        subCatsToProcess,
        approaches,
        colors,
        (message, current, total) => {
          onProgress?.(message, current, total)
        }
      )

      onProgress?.('✅ AI selections complete!')
    }

    // Step 2.5: Handle resuming incomplete style first
    if (resumingStyleId) {
      onProgress?.('🔄 Resuming incomplete style generation...')

      const resumingStyle = await prisma.style.findUnique({
        where: { id: resumingStyleId },
        include: {
          subCategory: {
            include: { category: true }
          },
          approach: true,
          color: true,
        },
      })

      if (resumingStyle) {
        try {
          await resumeStyleRoomGeneration({
            style: resumingStyle,
            startRoomIndex: resumingStyleRoomIndex,
            roomTypes,
            onProgress,
            subCatsToProcess,
            dryRun,
            result,
            onStyleCompleted,
            generateImages: options.generateImages,
          })
        } catch (error) {
          onProgress?.(`❌ Error resuming style: ${error instanceof Error ? error.message : String(error)}`)
          result.errors.push({
            entity: `style:${resumingStyle.slug}`,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }
    }

    // Step 3: Generate styles one by one
    for (let i = 0; i < subCatsToProcess.length; i++) {
      const subCategory = subCatsToProcess[i]
      const selection = selections.get(subCategory.id)

      if (!selection) {
        result.errors.push({
          entity: `style:${subCategory.slug}`,
          error: 'No AI selection available',
        })
        continue
      }

      const selectedApproach = approaches.find((a) => a.id === selection.approachId)
      const selectedColor = colors.find((c) => c.id === selection.colorId)

      if (!selectedApproach || !selectedColor) {
        result.errors.push({
          entity: `style:${subCategory.slug}`,
          error: 'Selected approach or color not found',
        })
        continue
      }

      try {
        // Generate style name and slug
        const styleName = {
          he: `${subCategory.name.he} ${selectedApproach.name.he} ${selectedColor.name.he}`,
          en: `${subCategory.name.en} ${selectedApproach.name.en} in ${selectedColor.name.en}`,
        }
        const styleSlug = `${subCategory.slug}-${selectedApproach.slug}-${selectedColor.name.en
          .toLowerCase()
          .replace(/\s+/g, '-')}`

        onProgress?.(
          `\n🎨 [${i + 1}/${subCatsToProcess.length}] Processing: ${styleName.en}`,
          i + 1,
          subCatsToProcess.length
        )

        // Note: No need to check if style exists - we already filtered to only
        // process sub-categories that have NO styles (lines 808-810)

        // Phase 2: Determine price level for this style
        let stylePriceLevel: 'REGULAR' | 'LUXURY'
        if (options.priceLevel === 'RANDOM') {
          stylePriceLevel = Math.random() > 0.5 ? 'LUXURY' : 'REGULAR'
        } else {
          stylePriceLevel = options.priceLevel || 'REGULAR'
        }

        // Act 1: The Script
        onProgress?.(
          `   📜 Act 1: The Script - Generating hybrid content (poetic + factual) [${stylePriceLevel}]...`,
          i + 1,
          subCatsToProcess.length
        )

        let detailedContent = await generateStyleContent(styleName, {
          category: { name: subCategory.category.name },
          subCategory: {
            name: subCategory.name,
            description: subCategory.description,
            detailedContent: subCategory.detailedContent,
          },
          approach: {
            name: selectedApproach.name,
            description: selectedApproach.description,
            detailedContent: selectedApproach.detailedContent,
          },
          color: {
            name: selectedColor.name,
            hex: selectedColor.hex,
            category: selectedColor.category,
            description: selectedColor.description,
          },
          priceLevel: stylePriceLevel // Phase 2: Pass price level
        })

        // Act 2: Asset Stubbing
        onProgress?.(
            `   🧱 Act 2: The Asset Prep - Ensuring assets exist (Materials/Colors)...`,
            i + 1,
            subCatsToProcess.length
        )
        const matNames = (detailedContent.he as any).requiredMaterials || []
        const colNames = (detailedContent.he as any).requiredColors || []
        await ensureAssetsExist(matNames, colNames, styleName.en, stylePriceLevel)

        // Clean up AI-generated content to match Prisma schema
        // Remove any extra fields that Gemini might have added (like imagePrompt, quote, paragraph5 in poeticIntro)
        // Note: keywords is valid and optional in the schema
        if (detailedContent.he?.poeticIntro) {
          const {
            imagePrompt: _heImagePrompt,
            quote: _heQuote,
            paragraph5: _heParagraph5,
            paragraph6: _heParagraph6,
            paragraph7: _heParagraph7,
            paragraph8: _heParagraph8,
            paragraph9: _heParagraph9,
            paragraph10: _heParagraph10,
            ...cleanHePoetic
          } = detailedContent.he.poeticIntro as any
          detailedContent.he.poeticIntro = cleanHePoetic
        }
        if (detailedContent.en?.poeticIntro) {
          const {
            imagePrompt: _enImagePrompt,
            quote: _enQuote,
            paragraph5: _enParagraph5,
            paragraph6: _enParagraph6,
            paragraph7: _enParagraph7,
            paragraph8: _enParagraph8,
            paragraph9: _enParagraph9,
            paragraph10: _enParagraph10,
            ...cleanEnPoetic
          } = detailedContent.en.poeticIntro as any
          detailedContent.en.poeticIntro = cleanEnPoetic
        }

        // Extract visual context from sub-category detailedContent
        // This will be used for both general images and room images
        const visualContext = subCategory.detailedContent?.en
          ? {
              characteristics: subCategory.detailedContent.en.characteristics || [],
              visualElements: subCategory.detailedContent.en.visualElements || [],
              materialGuidance: subCategory.detailedContent.en.materialGuidance,
              colorGuidance: subCategory.detailedContent.en.colorGuidance,
            }
          : undefined

        // Act 3: The Golden Scenes
        let galleryItems: any[] = []
        if (options.generateImages) {
          onProgress?.(
            `   🖼️  Act 3: The Golden Scenes - Generating 6 varied views...`,
            i + 1,
            subCatsToProcess.length
          )

          try {
            const scenes = await generateGoldenScenes(
              styleName,
              {
                subCategoryName: subCategory.name.en,
                approachName: selectedApproach.name.en,
                colorName: selectedColor.name.en,
                colorHex: selectedColor.hex,
              },
              GOLDEN_SCENES,
              (current, total, name) => {
                onProgress?.(
                  `      Scene ${current}/${total}: ${name}`,
                  i + 1,
                  subCatsToProcess.length
                )
              }
            )
            
            // Convert to StyleGalleryItem format
            galleryItems = scenes.map(s => ({
                id: crypto.randomUUID(),
                url: s.url,
                type: 'scene',
                sceneName: s.sceneName,
                complementaryColor: s.complement,
                createdAt: new Date()
            }))

          } catch (error) {
            onProgress?.(
              `   ⚠️  Warning: Scene generation failed`,
              i + 1,
              subCatsToProcess.length
            )
          }
        }

        if (dryRun) {
          onProgress?.(
            `   [DRY RUN] Would create style: ${styleName.en}`,
            i + 1,
            subCatsToProcess.length
          )
          onProgress?.(
            `      - ${galleryItems.length} golden scenes`,
            i + 1,
            subCatsToProcess.length
          )
          result.stats.styles.created++
          continue
        }

        // Step 3c: IMMEDIATELY save style to database
        onProgress?.(
          `   💾 Saving new style to database...`,
          i + 1,
          subCatsToProcess.length
        )

        // Analyze gallery items for any remaining base64 URLs
        const urlAnalysis = analyzeUrls(galleryItems.map((g: any) => g.url))
        if (urlAnalysis.base64 > 0) {
          onProgress?.(
            `   🔄 Converting ${urlAnalysis.base64} base64 images to storage URLs...`,
            i + 1,
            subCatsToProcess.length
          )
          // Convert any remaining base64 URLs to GCP storage
          const conversionResult = await convertGalleryItems(galleryItems, {
            entityType: 'style',
            entityId: 'seed-' + styleSlug,
            filenamePrefix: styleName.en,
            maxRetries: 3,
            onProgress: (current, total, status) => {
              onProgress?.(`   🔄 ${status}`, i + 1, subCatsToProcess.length)
            },
          })
          galleryItems = conversionResult.items
          if (conversionResult.result.failedCount > 0) {
            onProgress?.(
              `   ⚠️  ${conversionResult.result.failedCount} images failed to upload, using placeholders`,
              i + 1,
              subCatsToProcess.length
            )
          }
        }

        // Final safety filter - ensure NO base64 URLs make it to MongoDB
        const safeGalleryItems = filterGalleryItemsForStorage(galleryItems, `[${styleName.en}] `)

        // Create new style
        let style = await prisma.style.create({
          data: {
            organizationId: null,
            slug: styleSlug,
            name: styleName,
            categoryId: subCategory.categoryId,
            subCategoryId: subCategory.id,
            approachId: selectedApproach.id,
            colorId: selectedColor.id,
            // Use safe gallery items (no base64, only HTTP URLs)
            gallery: safeGalleryItems,
            priceLevel: stylePriceLevel, // Phase 2: Use determined price level
            detailedContent,
            roomProfiles: [],
            metadata: {
              version: '1.0.0',
              isPublic: false,
              tags: [
                subCategory.slug,
                selectedApproach.slug,
                selectedColor.name.en.toLowerCase(),
                stylePriceLevel.toLowerCase(), // Phase 2: Add price level tag
              ],
              usage: 0,
              aiGenerated: true,
              aiSelection: {
                approachConfidence: selection.confidence,
                reasoning: selection.reasoning,
              },
              isComplete: false,
            },
          },
        })

        onProgress?.(
          `   ✅ Style saved to database (ID: ${style.id})`,
          i + 1,
          subCatsToProcess.length
        )

        // Phase 2: Generate textures, materials, and special images
        if (options.generateImages) {
          // Check if Phase 2 Full Generation is enabled
          if (phase2FullGeneration) {
            // Use the comprehensive Phase 2 generator
            onProgress?.(
              `   🚀 Phase 2 Full Generation - Generating ${roomImageCount} rooms + ${materialImageCount} materials + ${textureImageCount} textures...`,
              i + 1,
              subCatsToProcess.length
            )

            try {
              const { generatePhase2Images } = await import('./phase2-image-generator')

              const phase2Result = await generatePhase2Images({
                styleId: style.id,
                styleName,
                priceLevel: stylePriceLevel,
                styleContext: {
                  subCategoryName: subCategory.name.en,
                  approachName: selectedApproach.name.en,
                  colorName: selectedColor.name.en,
                  colorHex: selectedColor.hex,
                },
                visualContext,
                roomImageCount,
                materialImageCount,
                textureImageCount,
                onProgress: (msg, current, total) => {
                  onProgress?.(`   ${msg}`, i + 1, subCatsToProcess.length)
                },
                onRoomComplete: (roomSlug, imageCount) => {
                  onProgress?.(
                    `   ✅ Room ${roomSlug}: ${imageCount} images`,
                    i + 1,
                    subCatsToProcess.length
                  )
                },
              })

              onProgress?.(
                `   ✅ Phase 2 Complete: ${phase2Result.totalImages} images (${phase2Result.roomImages} rooms, ${phase2Result.materialImages} materials, ${phase2Result.textureImages} textures)`,
                i + 1,
                subCatsToProcess.length
              )

              if (phase2Result.errors.length > 0) {
                onProgress?.(
                  `   ⚠️  ${phase2Result.errors.length} errors during Phase 2 generation`,
                  i + 1,
                  subCatsToProcess.length
                )
              }

              // Phase 2: Generate room profiles with embedded views
              if (generateRoomProfiles) {
                onProgress?.(
                  `   🏠 Generating room profiles with embedded views...`,
                  i + 1,
                  subCatsToProcess.length
                )

                try {
                  const { generatePhase2RoomViews, PHASE2_ROOM_TYPES } = await import('./phase2-image-generator')
                  const { generateRoomProfileContent } = await import('../ai')

                  // Generate room views (returns RoomViewsResult[] with roomTypeId and views)
                  const roomViewResults = await generatePhase2RoomViews({
                    styleName,
                    priceLevel: stylePriceLevel,
                    styleContext: {
                      subCategoryName: subCategory.name.en,
                      approachName: selectedApproach.name.en,
                      colorName: selectedColor.name.en,
                      colorHex: selectedColor.hex,
                    },
                    visualContext,
                    referenceImages: subCategory.images || [],
                    onProgress: (msg, current, total) => {
                      onProgress?.(`      ${msg}`, i + 1, subCatsToProcess.length)
                    },
                    onRoomComplete: (roomSlug, imageCount) => {
                      onProgress?.(
                        `      ✅ Room ${roomSlug}: ${imageCount} views`,
                        i + 1,
                        subCatsToProcess.length
                      )
                    },
                  })

                  // Prepare AI content context
                  const availableMaterials = await prisma.material.findMany({
                    select: { name: true, sku: true },
                  })

                  const aiStyleContext = {
                    name: styleName,
                    description: {
                      he: detailedContent.he.description,
                      en: detailedContent.en.description,
                    },
                    characteristics: detailedContent.he.characteristics || [],
                    visualElements: detailedContent.he.visualElements || [],
                    materialGuidance: {
                      he: detailedContent.he.materialGuidance,
                      en: detailedContent.en.materialGuidance,
                    },
                    primaryColor: {
                      name: selectedColor.name,
                      hex: selectedColor.hex,
                    },
                  }

                  // Generate room profiles with AI content + embedded views
                  let roomProfilesGenerated = 0
                  for (const roomViewResult of roomViewResults) {
                    // Find matching room type from database
                    const matchingDbRoomType = roomTypes.find(rt => rt.slug === roomViewResult.roomSlug)
                    const matchingPhase2Room = PHASE2_ROOM_TYPES.find(r => r.slug === roomViewResult.roomSlug)

                    if (!matchingDbRoomType || !matchingPhase2Room) {
                      console.warn(`Room type not found: ${roomViewResult.roomSlug}`)
                      continue
                    }

                    try {
                      // Generate AI content for room profile
                      const roomProfile = await generateRoomProfileContent(
                        matchingDbRoomType,
                        aiStyleContext,
                        availableMaterials
                      )

                      // Convert and add views
                      const convertedProfile = await convertRoomProfileToIds({
                        ...roomProfile,
                        views: roomViewResult.views,
                      })

                      // Push to style's roomProfiles
                      style = await prisma.style.update({
                        where: { id: style.id },
                        data: { roomProfiles: { push: convertedProfile } },
                      })

                      roomProfilesGenerated++
                    } catch (roomError) {
                      console.error(`Room profile generation failed for ${roomViewResult.roomSlug}:`, roomError)
                      result.errors.push({
                        entity: `style:${styleSlug}:room:${roomViewResult.roomSlug}`,
                        error: roomError instanceof Error ? roomError.message : String(roomError),
                      })
                    }
                  }

                  onProgress?.(
                    `   ✅ Room profiles: ${roomProfilesGenerated}/${roomViewResults.length}`,
                    i + 1,
                    subCatsToProcess.length
                  )
                } catch (roomViewError) {
                  onProgress?.(
                    `   ❌ Room view generation failed: ${roomViewError instanceof Error ? roomViewError.message : String(roomViewError)}`,
                    i + 1,
                    subCatsToProcess.length
                  )
                }
              }
            } catch (error) {
              onProgress?.(
                `   ❌ Phase 2 generation failed: ${error instanceof Error ? error.message : String(error)}`,
                i + 1,
                subCatsToProcess.length
              )
            }
          } else {
            // Original Phase 2 partial generation (texture entities + material images + special images)
            // Import Phase 2 generators
            const { generateTexturesForStyle } = await import('./texture-generator')
            const { generateMaterialImages } = await import('./material-generator')
            const { generateSpecialImages } = await import('./special-image-generator')

            // Act 3.5: Texture Generation
            if (detailedContent.en.materialGuidance) {
              onProgress?.(
                `   🧱 Act 3.5: Texture Generation - Creating reusable texture entities...`,
                i + 1,
                subCatsToProcess.length
              )

              try {
                await generateTexturesForStyle(
                  style.id,
                  detailedContent.en.materialGuidance,
                  stylePriceLevel,
                  {
                    maxTextures: 5,
                    generateImages: true, // Generate texture close-up images
                  }
                )
              } catch (error) {
                onProgress?.(
                  `   ⚠️  Warning: Texture generation failed`,
                  i + 1,
                  subCatsToProcess.length
                )
              }
            }

            // Act 3.55: Material Entity Creation & Style Links
            if (detailedContent.en.requiredMaterials && detailedContent.en.requiredMaterials.length > 0) {
              onProgress?.(
                `   🧱 Act 3.55: Material Entities - Creating materials & linking to style...`,
                i + 1,
                subCatsToProcess.length
              )

              try {
                const { findOrCreateMaterialsForStyle } = await import('./material-generator')
                await findOrCreateMaterialsForStyle(
                  style.id,
                  detailedContent.en.requiredMaterials,
                  {
                    priceLevel: stylePriceLevel,
                    generateImages: true, // Generate material images
                    maxMaterials: 10,
                  }
                )
              } catch (error) {
                onProgress?.(
                  `   ⚠️  Warning: Material entity creation failed`,
                  i + 1,
                  subCatsToProcess.length
                )
              }
            }

            // Act 3.6: Material Close-Up Images (StyleImage records)
            if (detailedContent.en.requiredMaterials && detailedContent.en.requiredMaterials.length > 0) {
              onProgress?.(
                `   🔬 Act 3.6: Material Images - Generating close-up material photos...`,
                i + 1,
                subCatsToProcess.length
              )

              try {
                await generateMaterialImages({
                  styleId: style.id,
                  styleName,
                  requiredMaterials: detailedContent.en.requiredMaterials,
                  priceLevel: stylePriceLevel,
                  maxImages: 5,
                  tags: [styleSlug],
                })
              } catch (error) {
                onProgress?.(
                  `   ⚠️  Warning: Material image generation failed`,
                  i + 1,
                  subCatsToProcess.length
                )
              }
            }

            // Act 3.7: Special Images (Composite & Anchor)
            onProgress?.(
              `   ✨ Act 3.7: Special Images - Creating composite and anchor shots...`,
              i + 1,
              subCatsToProcess.length
            )

            try {
              await generateSpecialImages({
                styleId: style.id,
                styleName,
                description: {
                  he: detailedContent.he.description,
                  en: detailedContent.en.description,
                },
                styleContext: {
                  subCategoryName: subCategory.name.en,
                  approachName: selectedApproach.name.en,
                  colorName: selectedColor.name.en,
                  colorHex: selectedColor.hex,
                },
                tags: [styleSlug, stylePriceLevel.toLowerCase()],
              })
            } catch (error) {
              onProgress?.(
                `   ⚠️  Warning: Special image generation failed`,
                i + 1,
                subCatsToProcess.length
              )
            }
          }
        }

        // Step 3d: Mark style as complete
        // Room images are now generated via Phase 2 (generatePhase2RoomViews)
        // Legacy Act 4 has been removed - Phase 2 handles all room image generation
        await prisma.style.update({
          where: { id: style.id },
          data: {
            metadata: {
              ...(style.metadata as any),
              isComplete: true,
            },
          },
        })

        if (onStyleCompleted) {
          await onStyleCompleted(style.id, styleName)
        }

        // Always count as created (we filtered out existing sub-categories earlier)
        result.stats.styles.created++
        onProgress?.(
          `   ✅ Created style: ${style.name.en}`,
          i + 1,
          subCatsToProcess.length
        )

        // Summary of what was saved
        const finalRoomProfileCount = (style.roomProfiles as any[])?.length || 0
        onProgress?.(
          `      Summary: ${galleryItems.length} golden scenes, ${finalRoomProfileCount} room profiles saved`,
          i + 1,
          subCatsToProcess.length
        )
      } catch (error) {
        // Enhanced error logging for debugging
        const errorMessage = error instanceof Error ? error.message : String(error)
        const errorStack = error instanceof Error ? error.stack : undefined

        console.error(`Error processing style for ${subCategory.slug}:`, {
          error: errorMessage,
          stack: errorStack,
          subCategory: subCategory.slug,
          selection,
        })

        result.errors.push({
          entity: `style:${subCategory.slug}`,
          error: errorMessage,
        })
        onProgress?.(
          `   ❌ Error: ${errorMessage}`,
          i + 1,
          subCatsToProcess.length
        )
      }
    }

    onProgress?.(`\n✅ Style seeding completed!`)
    onProgress?.(
      `   Created: ${result.stats.styles.created}, Updated: ${result.stats.styles.updated}, Skipped: ${result.stats.styles.skipped}, Errors: ${result.errors.length}`
    )

    result.success = result.errors.length === 0
  } catch (error) {
    result.success = false
    result.errors.push({
      entity: 'styles-global',
      error: error instanceof Error ? error.message : String(error),
    })
    onProgress?.(`❌ Fatal error: ${error instanceof Error ? error.message : String(error)}`)
  } finally {
    await prisma.$disconnect()
  }

  return result
}

/**
 * Helper function to resume room generation for an incomplete style
 * NOTE: This is LEGACY code for non-Phase2 generation. When Phase 2 is enabled,
 * room images are handled by phase2-image-generator.ts instead.
 * @deprecated Use Phase 2 generation instead
 */
async function resumeStyleRoomGeneration({
  style,
  startRoomIndex,
  roomTypes,
  onProgress,
  subCatsToProcess,
  dryRun,
  result,
  onStyleCompleted,
  generateImages,
}: {
  style: any
  startRoomIndex: number
  roomTypes: any[]
  onProgress?: (message: string, current?: number, total?: number) => void
  subCatsToProcess: any[]
  dryRun?: boolean
  result: SeedResult
  onStyleCompleted?: (styleId: string, styleName: { he: string; en: string }) => Promise<void>
  generateImages?: boolean
}) {
  // LEGACY: This function is only used for non-Phase2 resume scenarios
  // Phase 2 handles room images via StyleImage table, not embedded roomProfiles
  onProgress?.(`⚠️  [Legacy] Resume function - consider using Phase 2 for new generations`)

  const styleName = style.name
  const selectedColor = style.color
  const subCategory = style.subCategory
  const detailedContent = style.detailedContent

  if (!generateImages) {
    onProgress?.('⚠️  Image generation disabled')
    return
  }

  const { generateRoomProfileContent, generateStyleRoomImages } = await import('../ai')

  const availableMaterials = await prisma.material.findMany({
    select: { name: true, sku: true },
  })

  const styleContext = {
    name: styleName,
    description: { he: detailedContent.he.description, en: detailedContent.en.description },
    characteristics: detailedContent.he.characteristics || [],
    visualElements: detailedContent.he.visualElements || [],
    materialGuidance: { he: detailedContent.he.materialGuidance, en: detailedContent.en.materialGuidance },
    primaryColor: { name: selectedColor.name, hex: selectedColor.hex },
  }

  const visualContext = subCategory.detailedContent?.en
    ? {
        characteristics: subCategory.detailedContent.en.characteristics || [],
        visualElements: subCategory.detailedContent.en.visualElements || [],
        materialGuidance: subCategory.detailedContent.en.materialGuidance,
        colorGuidance: subCategory.detailedContent.en.colorGuidance,
      }
    : undefined

  for (let j = startRoomIndex; j < roomTypes.length; j++) {
    const roomType = roomTypes[j]

    try {
      const roomProfile = await generateRoomProfileContent(roomType, styleContext, availableMaterials)

      let roomViews: any[] = []
      try {
        const rawViews = await generateStyleRoomImages(
          styleName, roomType.name.en, selectedColor.hex, visualContext, subCategory.images || []
        )
        roomViews = rawViews.map(v => ({
          id: crypto.randomUUID(), url: v.url, orientation: v.orientation, status: 'COMPLETED', createdAt: new Date()
        }))
      } catch (error) {
        console.error(`Room image generation failed for ${roomType.name.en}:`, error)
      }

      const convertedRoomProfile = await convertRoomProfileToIds({ ...roomProfile, views: roomViews })

      if (!dryRun) {
        await prisma.style.update({
          where: { id: style.id },
          data: { roomProfiles: { push: convertedRoomProfile } },
        })
      }

      if (j === roomTypes.length - 1) {
        await prisma.style.update({
          where: { id: style.id },
          data: { metadata: { ...(style.metadata as any), isComplete: true } },
        })
        if (onStyleCompleted) await onStyleCompleted(style.id, styleName)
      }

      if (j < roomTypes.length - 1) await new Promise(resolve => setTimeout(resolve, 500))
    } catch (error) {
      result.errors.push({
        entity: `style:${style.slug}:room:${roomType.slug}`,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
}
