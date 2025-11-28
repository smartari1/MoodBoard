/**
 * Populate Images for Categories and Sub-Categories
 *
 * This script generates and uploads images for all categories and sub-categories
 * that currently have empty images arrays using Gemini AI image generation service.
 *
 * Usage:
 *   npx tsx scripts/populate-category-images.ts
 *   npx tsx scripts/populate-category-images.ts --dry-run
 *   npx tsx scripts/populate-category-images.ts --limit 5
 *   npx tsx scripts/populate-category-images.ts --categories-only
 *   npx tsx scripts/populate-category-images.ts --subcategories-only
 */

import { PrismaClient } from '@prisma/client'
import { generateAndUploadImages } from '../src/lib/ai'

const prisma = new PrismaClient()

interface ScriptOptions {
  dryRun: boolean
  limit?: number
  imagesPerEntity: number
  categoriesOnly: boolean
  subCategoriesOnly: boolean
  forceRegenerate: boolean // Regenerate even if images exist
}

interface ScriptStats {
  categories: {
    total: number
    withImages: number
    withoutImages: number
    processed: number
    succeeded: number
    failed: number
  }
  subCategories: {
    total: number
    withImages: number
    withoutImages: number
    processed: number
    succeeded: number
    failed: number
  }
  totalImagesGenerated: number
}

/**
 * Parse command line arguments
 */
function parseArgs(): ScriptOptions {
  const args = process.argv.slice(2)

  return {
    dryRun: args.includes('--dry-run'),
    limit: args.includes('--limit')
      ? parseInt(args[args.indexOf('--limit') + 1], 10)
      : undefined,
    imagesPerEntity: args.includes('--images')
      ? parseInt(args[args.indexOf('--images') + 1], 10)
      : 3,
    categoriesOnly: args.includes('--categories-only'),
    subCategoriesOnly: args.includes('--subcategories-only'),
    forceRegenerate: args.includes('--force'),
  }
}

/**
 * Populate images for categories
 */
async function populateCategoryImages(
  options: ScriptOptions,
  stats: ScriptStats
): Promise<void> {
  console.log('\n📚 Processing Categories...')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  // Fetch all categories
  const categories = await prisma.category.findMany({
    orderBy: { order: 'asc' },
  })

  stats.categories.total = categories.length

  // Filter categories that need images
  const categoriesToProcess = options.forceRegenerate
    ? categories
    : categories.filter(cat => !cat.images || cat.images.length === 0)

  stats.categories.withImages = categories.length - categoriesToProcess.length
  stats.categories.withoutImages = categoriesToProcess.length

  console.log(`📊 Status:`)
  console.log(`   Total: ${stats.categories.total}`)
  console.log(`   With images: ${stats.categories.withImages}`)
  console.log(`   Without images: ${stats.categories.withoutImages}`)

  if (categoriesToProcess.length === 0) {
    console.log('   ✨ All categories already have images!')
    return
  }

  // Apply limit if specified
  const categoriesToGenerate = options.limit
    ? categoriesToProcess.slice(0, options.limit)
    : categoriesToProcess

  console.log(`\n🎨 Will process ${categoriesToGenerate.length} categories`)

  if (options.dryRun) {
    console.log('\n⚠️  DRY RUN MODE - No changes will be saved to database\n')
  }

  // Process each category
  for (let i = 0; i < categoriesToGenerate.length; i++) {
    const category = categoriesToGenerate[i]

    console.log(`\n[${i + 1}/${categoriesToGenerate.length}] ${category.name.en} (${category.name.he})`)
    console.log('─'.repeat(70))

    stats.categories.processed++

    try {
      // Extract ALL data from category for rich prompt generation
      const description = category.description || undefined

      // Extract detailedContent (use English version for prompts)
      const detailedContent = (category.detailedContent as any)?.en || {}
      const period = detailedContent?.period ||
                     (category.detailedContent as any)?.he?.period ||
                     undefined

      console.log(`   📝 Name: ${category.name.en}`)
      console.log(`   🔖 Slug: ${category.slug}`)
      if (period) {
        console.log(`   📅 Period: ${period}`)
      }
      if (detailedContent?.characteristics?.length > 0) {
        console.log(`   ✨ Characteristics: ${detailedContent.characteristics.length} items`)
      }
      if (detailedContent?.visualElements?.length > 0) {
        console.log(`   🎨 Visual Elements: ${detailedContent.visualElements.length} items`)
      }

      // Generate images with FULL detailed content
      console.log(`   🖼️  Generating ${options.imagesPerEntity} images with rich context...`)

      const images = await generateAndUploadImages({
        entityType: 'category',
        entityName: category.name,
        description,
        period,
        detailedContent: {
          introduction: detailedContent?.introduction,
          description: detailedContent?.description,
          period: detailedContent?.period,
          characteristics: detailedContent?.characteristics || [],
          visualElements: detailedContent?.visualElements || [],
          philosophy: detailedContent?.philosophy,
          colorGuidance: detailedContent?.colorGuidance,
          materialGuidance: detailedContent?.materialGuidance,
          applications: detailedContent?.applications || [],
          historicalContext: detailedContent?.historicalContext,
          culturalContext: detailedContent?.culturalContext,
        },
        numberOfImages: options.imagesPerEntity,
      })

      console.log(`   ✅ Generated ${images.length} images`)

      // Log first image URL for verification
      if (images.length > 0) {
        console.log(`   🔗 First image: ${images[0].substring(0, 80)}...`)
      }

      stats.totalImagesGenerated += images.length

      // Save to database
      if (!options.dryRun) {
        console.log(`   💾 Saving to database...`)

        await prisma.category.update({
          where: { id: category.id },
          data: { images },
        })

        console.log(`   ✅ Saved to database`)
        stats.categories.succeeded++
      } else {
        console.log(`   [DRY RUN] Would save ${images.length} images to database`)
        stats.categories.succeeded++
      }

      // Add delay between requests to avoid rate limiting
      if (i < categoriesToGenerate.length - 1) {
        console.log(`   ⏳ Waiting 3 seconds before next category...`)
        await new Promise(resolve => setTimeout(resolve, 3000))
      }

    } catch (error) {
      stats.categories.failed++
      console.error(`   ❌ Error: ${error instanceof Error ? error.message : String(error)}`)

      // Continue with next category
      continue
    }
  }
}

/**
 * Populate images for sub-categories
 */
async function populateSubCategoryImages(
  options: ScriptOptions,
  stats: ScriptStats
): Promise<void> {
  console.log('\n\n📂 Processing Sub-Categories...')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  // Fetch all sub-categories with their parent categories
  const subCategories = await prisma.subCategory.findMany({
    include: {
      category: true,
    },
    orderBy: [
      { categoryId: 'asc' },
      { order: 'asc' },
    ],
  })

  stats.subCategories.total = subCategories.length

  // Filter sub-categories that need images
  const subCategoriesToProcess = options.forceRegenerate
    ? subCategories
    : subCategories.filter(subCat => !subCat.images || subCat.images.length === 0)

  stats.subCategories.withImages = subCategories.length - subCategoriesToProcess.length
  stats.subCategories.withoutImages = subCategoriesToProcess.length

  console.log(`📊 Status:`)
  console.log(`   Total: ${stats.subCategories.total}`)
  console.log(`   With images: ${stats.subCategories.withImages}`)
  console.log(`   Without images: ${stats.subCategories.withoutImages}`)

  if (subCategoriesToProcess.length === 0) {
    console.log('   ✨ All sub-categories already have images!')
    return
  }

  // Apply limit if specified
  const subCategoriesToGenerate = options.limit
    ? subCategoriesToProcess.slice(0, options.limit)
    : subCategoriesToProcess

  console.log(`\n🎨 Will process ${subCategoriesToGenerate.length} sub-categories`)

  if (options.dryRun) {
    console.log('\n⚠️  DRY RUN MODE - No changes will be saved to database\n')
  }

  // Process each sub-category
  for (let i = 0; i < subCategoriesToGenerate.length; i++) {
    const subCategory = subCategoriesToGenerate[i]

    console.log(`\n[${i + 1}/${subCategoriesToGenerate.length}] ${subCategory.name.en} (${subCategory.name.he})`)
    console.log('─'.repeat(70))
    console.log(`   📁 Category: ${subCategory.category.name.en}`)

    stats.subCategories.processed++

    try {
      // Extract ALL data from sub-category for rich prompt generation
      const description = subCategory.description || undefined

      // Extract detailedContent (use English version for prompts)
      const detailedContent = (subCategory.detailedContent as any)?.en || {}
      const period = detailedContent?.period ||
                     (subCategory.detailedContent as any)?.he?.period ||
                     undefined

      console.log(`   📝 Name: ${subCategory.name.en}`)
      console.log(`   🔖 Slug: ${subCategory.slug}`)
      if (period) {
        console.log(`   📅 Period: ${period}`)
      }
      if (detailedContent?.characteristics?.length > 0) {
        console.log(`   ✨ Characteristics: ${detailedContent.characteristics.length} items`)
      }
      if (detailedContent?.visualElements?.length > 0) {
        console.log(`   🎨 Visual Elements: ${detailedContent.visualElements.length} items`)
      }
      if (detailedContent?.philosophy) {
        console.log(`   💭 Design Philosophy: Yes`)
      }

      // Generate images with FULL detailed content
      console.log(`   🖼️  Generating ${options.imagesPerEntity} images with rich context...`)

      const images = await generateAndUploadImages({
        entityType: 'subcategory',
        entityName: subCategory.name,
        description,
        period,
        detailedContent: {
          introduction: detailedContent?.introduction,
          description: detailedContent?.description,
          period: detailedContent?.period,
          characteristics: detailedContent?.characteristics || [],
          visualElements: detailedContent?.visualElements || [],
          philosophy: detailedContent?.philosophy,
          colorGuidance: detailedContent?.colorGuidance,
          materialGuidance: detailedContent?.materialGuidance,
          applications: detailedContent?.applications || [],
          historicalContext: detailedContent?.historicalContext,
          culturalContext: detailedContent?.culturalContext,
        },
        numberOfImages: options.imagesPerEntity,
      })

      console.log(`   ✅ Generated ${images.length} images`)

      // Log first image URL for verification
      if (images.length > 0) {
        console.log(`   🔗 First image: ${images[0].substring(0, 80)}...`)
      }

      stats.totalImagesGenerated += images.length

      // Save to database
      if (!options.dryRun) {
        console.log(`   💾 Saving to database...`)

        await prisma.subCategory.update({
          where: { id: subCategory.id },
          data: { images },
        })

        console.log(`   ✅ Saved to database`)
        stats.subCategories.succeeded++
      } else {
        console.log(`   [DRY RUN] Would save ${images.length} images to database`)
        stats.subCategories.succeeded++
      }

      // Add delay between requests to avoid rate limiting
      if (i < subCategoriesToGenerate.length - 1) {
        console.log(`   ⏳ Waiting 3 seconds before next sub-category...`)
        await new Promise(resolve => setTimeout(resolve, 3000))
      }

    } catch (error) {
      stats.subCategories.failed++
      console.error(`   ❌ Error: ${error instanceof Error ? error.message : String(error)}`)

      // Continue with next sub-category
      continue
    }
  }
}

/**
 * Print final statistics
 */
function printStats(stats: ScriptStats, options: ScriptOptions): void {
  console.log('\n\n')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📊 FINAL STATISTICS')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  if (!options.subCategoriesOnly) {
    console.log('\n📚 CATEGORIES:')
    console.log(`   Total: ${stats.categories.total}`)
    console.log(`   Already had images: ${stats.categories.withImages}`)
    console.log(`   Needed images: ${stats.categories.withoutImages}`)
    console.log(`   Processed: ${stats.categories.processed}`)
    console.log(`   ✅ Succeeded: ${stats.categories.succeeded}`)
    console.log(`   ❌ Failed: ${stats.categories.failed}`)
  }

  if (!options.categoriesOnly) {
    console.log('\n📂 SUB-CATEGORIES:')
    console.log(`   Total: ${stats.subCategories.total}`)
    console.log(`   Already had images: ${stats.subCategories.withImages}`)
    console.log(`   Needed images: ${stats.subCategories.withoutImages}`)
    console.log(`   Processed: ${stats.subCategories.processed}`)
    console.log(`   ✅ Succeeded: ${stats.subCategories.succeeded}`)
    console.log(`   ❌ Failed: ${stats.subCategories.failed}`)
  }

  console.log('\n🎨 IMAGES:')
  console.log(`   Total generated: ${stats.totalImagesGenerated}`)

  if (options.dryRun) {
    console.log('\n⚠️  DRY RUN MODE - No changes were saved to database')
  } else {
    console.log('\n✅ All changes saved to database')
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

/**
 * Main script execution
 */
async function main() {
  console.log('🎨 Category & Sub-Category Image Population Script')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const options = parseArgs()

  console.log('\n⚙️  Options:')
  console.log(`   Dry Run: ${options.dryRun ? 'YES' : 'NO'}`)
  console.log(`   Limit: ${options.limit || 'None'}`)
  console.log(`   Images per entity: ${options.imagesPerEntity}`)
  console.log(`   Categories only: ${options.categoriesOnly ? 'YES' : 'NO'}`)
  console.log(`   Sub-categories only: ${options.subCategoriesOnly ? 'YES' : 'NO'}`)
  console.log(`   Force regenerate: ${options.forceRegenerate ? 'YES' : 'NO'}`)

  const stats: ScriptStats = {
    categories: {
      total: 0,
      withImages: 0,
      withoutImages: 0,
      processed: 0,
      succeeded: 0,
      failed: 0,
    },
    subCategories: {
      total: 0,
      withImages: 0,
      withoutImages: 0,
      processed: 0,
      succeeded: 0,
      failed: 0,
    },
    totalImagesGenerated: 0,
  }

  try {
    // Check if GEMINI_API_KEY is set
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable is not set!')
    }

    // Process categories
    if (!options.subCategoriesOnly) {
      await populateCategoryImages(options, stats)
    }

    // Process sub-categories
    if (!options.categoriesOnly) {
      await populateSubCategoryImages(options, stats)
    }

    // Print final statistics
    printStats(stats, options)

    console.log('\n✅ Script completed successfully!\n')
    process.exit(0)

  } catch (error) {
    console.error('\n❌ Fatal error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
main()
