/**
 * Seed Service
 *
 * Main service for seeding the database with detailed content
 * using Gemini AI to generate comprehensive descriptions
 */

import { PrismaClient } from '@prisma/client'
import {
  generateCategoryContent,
  generateSubCategoryContent,
  generateStyleContent,
  generateApproachContent,
  generateRoomTypeContent,
  type LocalizedDetailedContent,
} from '../ai/gemini'
import { generateAndUploadImages } from '../ai/image-generation'
import { parseAllBaseData, type ParsedData } from './parser'
import { convertRoomProfileToIds } from './room-profile-converter'

const prisma = new PrismaClient()

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
    colorId
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

    // Import AI selection and generation functions
    const { selectOptimalApproachAndColor, batchSelectOptimalCombinations } =
      await import('../ai/style-selector')
    const { generateStyleImages, generateStyleRoomImages } = await import('../ai/image-generation')
    const { batchGenerateRoomProfiles } = await import('../ai/gemini')

    // Step 2: Batch AI selection OR manual selection
    let selections: Map<string, { approachId: string; colorId: string; confidence: number; reasoning: string }>

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

        // Step 3a: Generate hybrid content (poetic + factual)
        onProgress?.(
          `   📝 Generating hybrid content (poetic + factual)...`,
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
        })

        // Clean up AI-generated content to match Prisma schema
        // Remove any extra fields that Gemini might have added (like imagePrompt, quote in poeticIntro)
        // Note: keywords is valid and optional in the schema
        if (detailedContent.he?.poeticIntro) {
          const { imagePrompt: _heImagePrompt, quote: _heQuote, ...cleanHePoetic } = detailedContent.he.poeticIntro as any
          detailedContent.he.poeticIntro = cleanHePoetic
        }
        if (detailedContent.en?.poeticIntro) {
          const { imagePrompt: _enImagePrompt, quote: _enQuote, ...cleanEnPoetic } = detailedContent.en.poeticIntro as any
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

        // Step 3b: Generate 3 general style images
        let generalImages: string[] = []
        if (options.generateImages) {
          onProgress?.(
            `   🖼️  Generating 3 general images (wide angle, detail, furniture)...`,
            i + 1,
            subCatsToProcess.length
          )

          try {
            generalImages = await generateStyleImages(
              styleName,
              {
                subCategoryName: subCategory.name.en,
                approachName: selectedApproach.name.en,
                colorName: selectedColor.name.en,
                colorHex: selectedColor.hex,
              },
              visualContext,
              subCategory.images || [], // Pass sub-category reference images
              (current, total, type) => {
                onProgress?.(
                  `      Image ${current}/${total}: ${type}`,
                  i + 1,
                  subCatsToProcess.length
                )
              }
            )
          } catch (error) {
            onProgress?.(
              `   ⚠️  Warning: Image generation failed, using placeholders`,
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
            `      - ${generalImages.length} general images`,
            i + 1,
            subCatsToProcess.length
          )
          result.stats.styles.created++
          continue
        }

        // Step 3c: IMMEDIATELY save style to database (before room profiles)
        // This ensures we don't lose work if crash happens during room generation
        onProgress?.(
          `   💾 Saving new style to database (basic content + general images)...`,
          i + 1,
          subCatsToProcess.length
        )

        // Create new style (we know it doesn't exist because sub-category was filtered)
        let style = await prisma.style.create({
          data: {
            organizationId: null, // Global style (not organization-specific)
            slug: styleSlug,
            name: styleName,
            categoryId: subCategory.categoryId,
            subCategoryId: subCategory.id,
            approachId: selectedApproach.id,
            colorId: selectedColor.id,
            images: generalImages,
            detailedContent,
            roomProfiles: [], // Start with empty, will add incrementally
            metadata: {
              version: '1.0.0',
              isPublic: false,
              tags: [
                subCategory.slug,
                selectedApproach.slug,
                selectedColor.name.en.toLowerCase(),
              ],
              usage: 0,
              aiGenerated: true,
              aiSelection: {
                approachConfidence: selection.confidence,
                reasoning: selection.reasoning,
              },
              isComplete: false, // Mark as incomplete initially
            },
          },
        })

        onProgress?.(
          `   ✅ Style saved to database (ID: ${style.id})`,
          i + 1,
          subCatsToProcess.length
        )

        // Step 3d: Generate room profiles ONE BY ONE with immediate saves
        if (generateRoomProfiles && options.generateImages) {
          onProgress?.(
            `   🏠 Generating ${roomTypes.length} room profiles (incremental saves)...`,
            i + 1,
            subCatsToProcess.length
          )

          const { generateRoomProfileContent } = await import('../ai/gemini')
          const roomProfilesGenerated: any[] = []

          // Fetch available materials for AI to use (CRITICAL: prevents material mismatch warnings)
          const availableMaterials = await prisma.material.findMany({
            select: {
              name: true,
              sku: true,
            },
          })

          onProgress?.(
            `   📦 Loaded ${availableMaterials.length} available materials for AI selection`,
            i + 1,
            subCatsToProcess.length
          )

          const styleContext = {
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

          for (let j = 0; j < roomTypes.length; j++) {
            const roomType = roomTypes[j]

            try {
              onProgress?.(
                `      Room ${j + 1}/${roomTypes.length}: ${roomType.name.en} - Generating content...`,
                i + 1,
                subCatsToProcess.length
              )

              // Generate room profile content (with available materials to prevent mismatches)
              const roomProfile = await generateRoomProfileContent(roomType, styleContext, availableMaterials)

              onProgress?.(
                `      Room ${j + 1}/${roomTypes.length}: ${roomType.name.en} - Generating 3 images...`,
                i + 1,
                subCatsToProcess.length
              )

              // Generate room-specific images
              let roomImages: string[] = []
              try {
                onProgress?.(
                  `      🎨 Room ${j + 1}/${roomTypes.length}: ${roomType.name.en} - Starting image generation (visualContext: ${!!visualContext}, referenceImages: ${subCategory.images?.length || 0})...`,
                  i + 1,
                  subCatsToProcess.length
                )

                roomImages = await generateStyleRoomImages(
                  styleName,
                  roomType.name.en,
                  selectedColor.hex,
                  visualContext, // Use same visual context from sub-category
                  subCategory.images || [] // Pass sub-category reference images
                )

                onProgress?.(
                  `      ✅ Room ${j + 1}/${roomTypes.length}: ${roomType.name.en} - Generated ${roomImages.length} images`,
                  i + 1,
                  subCatsToProcess.length
                )
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error)
                console.error(`Room image generation failed for ${roomType.name.en}:`, error)
                onProgress?.(
                  `      ⚠️  Room ${j + 1}/${roomTypes.length}: ${roomType.name.en} - Image generation failed: ${errorMessage}`,
                  i + 1,
                  subCatsToProcess.length
                )
              }

              const completeRoomProfile = {
                ...roomProfile,
                images: roomImages,
              }

              // Convert AI-generated room profile to use Color and Material IDs
              onProgress?.(
                `      Room ${j + 1}/${roomTypes.length}: ${roomType.name.en} - Converting to IDs...`,
                i + 1,
                subCatsToProcess.length
              )

              const convertedRoomProfile = await convertRoomProfileToIds(completeRoomProfile)

              // Append new room profile to style
              // (No duplicate check needed - we're processing a new style from an empty sub-category)
              onProgress?.(
                `      Room ${j + 1}/${roomTypes.length}: ${roomType.name.en} - Saving to database...`,
                i + 1,
                subCatsToProcess.length
              )

              style = await prisma.style.update({
                where: { id: style.id },
                data: {
                  roomProfiles: {
                    push: convertedRoomProfile,
                  },
                },
              })

              roomProfilesGenerated.push(completeRoomProfile)

              onProgress?.(
                `      ✅ Room ${j + 1}/${roomTypes.length}: ${roomType.name.en} - Saved!`,
                i + 1,
                subCatsToProcess.length
              )

              // Mark style as complete when last room is saved
              if (j === roomTypes.length - 1) {
                // Last room completed - mark style as complete
                await prisma.style.update({
                  where: { id: style.id },
                  data: {
                    metadata: {
                      ...(style.metadata as any),
                      isComplete: true,
                    },
                  },
                })
                onProgress?.(
                  `   🎉 Style fully completed with all ${roomTypes.length} room profiles!`,
                  i + 1,
                  subCatsToProcess.length
                )

                // Notify about completion if callback provided
                if (onStyleCompleted) {
                  await onStyleCompleted(style.id, styleName)
                }
              }

              // Small delay to avoid rate limiting
              if (j < roomTypes.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 500))
              }

            } catch (error) {
              onProgress?.(
                `      ❌ Room ${j + 1}/${roomTypes.length}: ${roomType.name.en} - Error: ${error instanceof Error ? error.message : String(error)}`,
                i + 1,
                subCatsToProcess.length
              )
              result.errors.push({
                entity: `style:${styleSlug}:room:${roomType.slug}`,
                error: error instanceof Error ? error.message : String(error),
              })
              // Continue with next room even if this one failed
            }
          }

          onProgress?.(
            `   ✅ All room profiles saved incrementally (${roomProfilesGenerated.length}/${roomTypes.length} successful)`,
            i + 1,
            subCatsToProcess.length
          )
        } else {
          // No room profiles requested - mark style as complete immediately
          await prisma.style.update({
            where: { id: style.id },
            data: {
              metadata: {
                ...(style.metadata as any),
                isComplete: true, // Complete even without room profiles
              },
            },
          })

          // Notify style completion
          if (onStyleCompleted) {
            await onStyleCompleted(style.id, styleName)
          }
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
          `      Summary: ${generalImages.length} general images, ${finalRoomProfileCount} room profiles saved`,
          i + 1,
          subCatsToProcess.length
        )
      } catch (error) {
        result.errors.push({
          entity: `style:${subCategory.slug}`,
          error: error instanceof Error ? error.message : String(error),
        })
        onProgress?.(
          `   ❌ Error: ${error instanceof Error ? error.message : String(error)}`,
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
  const styleName = style.name
  const selectedColor = style.color
  const selectedApproach = style.approach
  const subCategory = style.subCategory
  const detailedContent = style.detailedContent

  onProgress?.(
    `🔄 Resuming: ${styleName.en}`,
    0,
    subCatsToProcess.length
  )

  onProgress?.(
    `   📍 Starting from room ${startRoomIndex + 1}/${roomTypes.length}`,
    0,
    subCatsToProcess.length
  )

  if (!generateImages) {
    onProgress?.('⚠️  Image generation disabled, skipping room profile generation')
    return
  }

  const { generateRoomProfileContent } = await import('../ai/gemini')

  // Fetch available materials for AI to use
  const availableMaterials = await prisma.material.findMany({
    select: {
      name: true,
      sku: true,
    },
  })

  onProgress?.(
    `   📦 Loaded ${availableMaterials.length} available materials for AI selection`,
    0,
    subCatsToProcess.length
  )

  const styleContext = {
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

  // Extract visual context from sub-category
  const visualContext = subCategory.detailedContent?.en
    ? {
        characteristics: subCategory.detailedContent.en.characteristics || [],
        visualElements: subCategory.detailedContent.en.visualElements || [],
        materialGuidance: subCategory.detailedContent.en.materialGuidance,
        colorGuidance: subCategory.detailedContent.en.colorGuidance,
      }
    : undefined

  const { generateStyleRoomImages } = await import('../ai/image-generation')

  // Continue generating rooms from where we left off
  for (let j = startRoomIndex; j < roomTypes.length; j++) {
    const roomType = roomTypes[j]

    try {
      onProgress?.(
        `      Room ${j + 1}/${roomTypes.length}: ${roomType.name.en} - Generating content...`,
        0,
        subCatsToProcess.length
      )

      // Generate room profile content
      const roomProfile = await generateRoomProfileContent(roomType, styleContext, availableMaterials)

      onProgress?.(
        `      Room ${j + 1}/${roomTypes.length}: ${roomType.name.en} - Generating 3 images...`,
        0,
        subCatsToProcess.length
      )

      // Generate room-specific images
      let roomImages: string[] = []
      try {
        onProgress?.(
          `      🎨 Room ${j + 1}/${roomTypes.length}: ${roomType.name.en} - Starting image generation...`,
          0,
          subCatsToProcess.length
        )

        roomImages = await generateStyleRoomImages(
          styleName,
          roomType.name.en,
          selectedColor.hex,
          visualContext,
          subCategory.images || []
        )

        onProgress?.(
          `      ✅ Room ${j + 1}/${roomTypes.length}: ${roomType.name.en} - Generated ${roomImages.length} images`,
          0,
          subCatsToProcess.length
        )
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error(`Room image generation failed for ${roomType.name.en}:`, error)
        onProgress?.(
          `      ⚠️  Room ${j + 1}/${roomTypes.length}: ${roomType.name.en} - Image generation failed: ${errorMessage}`,
          0,
          subCatsToProcess.length
        )
      }

      const completeRoomProfile = {
        ...roomProfile,
        images: roomImages,
      }

      // Convert AI-generated room profile to use Color and Material IDs
      onProgress?.(
        `      Room ${j + 1}/${roomTypes.length}: ${roomType.name.en} - Converting to IDs...`,
        0,
        subCatsToProcess.length
      )

      const convertedRoomProfile = await convertRoomProfileToIds(completeRoomProfile)

      if (dryRun) {
        onProgress?.(
          `      [DRY RUN] Would save room: ${roomType.name.en}`,
          0,
          subCatsToProcess.length
        )
      } else {
        // Append new room profile to style
        onProgress?.(
          `      Room ${j + 1}/${roomTypes.length}: ${roomType.name.en} - Saving to database...`,
          0,
          subCatsToProcess.length
        )

        await prisma.style.update({
          where: { id: style.id },
          data: {
            roomProfiles: {
              push: convertedRoomProfile,
            },
          },
        })

        onProgress?.(
          `      ✅ Room ${j + 1}/${roomTypes.length}: ${roomType.name.en} - Saved!`,
          0,
          subCatsToProcess.length
        )
      }

      // Mark style as complete when last room is saved
      if (j === roomTypes.length - 1) {
        // Last room completed - mark style as complete
        await prisma.style.update({
          where: { id: style.id },
          data: {
            metadata: {
              ...(style.metadata as any),
              isComplete: true,
            },
          },
        })
        onProgress?.(
          `   🎉 Style fully completed with all ${roomTypes.length} room profiles!`,
          0,
          subCatsToProcess.length
        )

        // Notify about completion if callback provided
        if (onStyleCompleted) {
          await onStyleCompleted(style.id, styleName)
        }
      }

      // Small delay to avoid rate limiting
      if (j < roomTypes.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }

    } catch (error) {
      onProgress?.(
        `      ❌ Room ${j + 1}/${roomTypes.length}: ${roomType.name.en} - Error: ${error instanceof Error ? error.message : String(error)}`,
        0,
        subCatsToProcess.length
      )
      result.errors.push({
        entity: `style:${style.slug}:room:${roomType.slug}`,
        error: error instanceof Error ? error.message : String(error),
      })
      // Continue with next room even if this one failed
    }
  }

  const finalRoomProfileCount = startRoomIndex + (roomTypes.length - startRoomIndex)
  onProgress?.(
    `   ✅ Resumed and completed ${finalRoomProfileCount - startRoomIndex} remaining room profiles`,
    0,
    subCatsToProcess.length
  )
}
