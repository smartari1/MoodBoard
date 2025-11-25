#!/usr/bin/env tsx
/**
 * Seed Base Materials Script
 *
 * Creates global base materials matching existing room profile data
 *
 * Usage:
 *   npx tsx scripts/seed-base-materials.ts
 *   npx tsx scripts/seed-base-materials.ts --dry-run
 */

import { PrismaClient } from '@prisma/client'
import { Command } from 'commander'
import chalk from 'chalk'

const prisma = new PrismaClient()

const program = new Command()

program
  .name('seed-base-materials')
  .description('Seed global base materials')
  .option('-d, --dry-run', 'Dry run - don\'t save changes')
  .option('-v, --verbose', 'Verbose output')
  .parse(process.argv)

const options = program.opts()

// Base materials data (using actual type slugs from database)
const BASE_MATERIALS = [
  {
    sku: 'MAT-WOOD-SOLID',
    name: { he: 'עץ מלא', en: 'Solid Wood' },
    categorySlug: 'furniture-materials',
    typeSlug: 'solid-wood',  // Actual slug from DB
    subType: 'Solid hardwood',
    finish: ['natural', 'oiled', 'varnished'],
    texture: 'Natural wood grain',
    pricing: { cost: 300, retail: 450, unit: 'sqm', currency: 'ILS' },
  },
  {
    sku: 'MAT-FABRIC-VELVET',
    name: { he: 'קטיפה', en: 'Velvet' },
    categorySlug: 'fabrics-textiles',
    typeSlug: 'upholstery-fabrics',  // Actual slug from DB
    subType: 'Velvet',
    finish: ['smooth', 'brushed'],
    texture: 'Soft, plush pile',
    pricing: { cost: 150, retail: 250, unit: 'linearM', currency: 'ILS' },
  },
  {
    sku: 'MAT-FABRIC-SILK',
    name: { he: 'משי', en: 'Silk' },
    categorySlug: 'fabrics-textiles',
    typeSlug: 'upholstery-fabrics',  // Actual slug from DB
    subType: 'Silk',
    finish: ['smooth', 'satin'],
    texture: 'Smooth, luxurious',
    pricing: { cost: 200, retail: 350, unit: 'linearM', currency: 'ILS' },
  },
  {
    sku: 'MAT-METAL-GENERAL',
    name: { he: 'מתכת', en: 'Metal' },
    categorySlug: 'furniture-materials',
    typeSlug: 'metal',  // Actual slug from DB
    subType: 'Steel',
    finish: ['brushed', 'polished', 'matte'],
    texture: 'Smooth metallic',
    pricing: { cost: 100, retail: 180, unit: 'unit', currency: 'ILS' },
  },
  {
    sku: 'MAT-GLASS-CLEAR',
    name: { he: 'זכוכית', en: 'Glass' },
    categorySlug: 'furniture-materials',
    typeSlug: 'glass',  // Actual slug from DB
    subType: 'Tempered glass',
    finish: ['clear', 'frosted'],
    texture: 'Smooth, transparent',
    pricing: { cost: 250, retail: 400, unit: 'sqm', currency: 'ILS' },
  },
  {
    sku: 'MAT-STONE-MARBLE',
    name: { he: 'שיש', en: 'Marble' },
    categorySlug: 'countertops',
    typeSlug: 'marble',  // Actual slug from DB
    subType: 'Natural marble',
    finish: ['polished', 'honed', 'brushed'],
    texture: 'Smooth, veined',
    pricing: { cost: 500, retail: 800, unit: 'sqm', currency: 'ILS' },
  },
  {
    sku: 'MAT-FABRIC-LEATHER',
    name: { he: 'עור', en: 'Leather' },
    categorySlug: 'fabrics-textiles',
    typeSlug: 'upholstery-fabrics',  // Actual slug from DB
    subType: 'Genuine leather',
    finish: ['natural', 'treated', 'embossed'],
    texture: 'Smooth, supple',
    pricing: { cost: 180, retail: 320, unit: 'sqm', currency: 'ILS' },
  },
  {
    sku: 'MAT-FABRIC-LINEN',
    name: { he: 'פשתן', en: 'Linen' },
    categorySlug: 'fabrics-textiles',
    typeSlug: 'upholstery-fabrics',  // Actual slug from DB
    subType: 'Natural linen',
    finish: ['natural', 'washed'],
    texture: 'Textured, breathable',
    pricing: { cost: 120, retail: 200, unit: 'linearM', currency: 'ILS' },
  },
  {
    sku: 'MAT-FABRIC-COTTON',
    name: { he: 'כותנה', en: 'Cotton' },
    categorySlug: 'fabrics-textiles',
    typeSlug: 'upholstery-fabrics',  // Actual slug from DB
    subType: 'Pure cotton',
    finish: ['natural', 'dyed'],
    texture: 'Soft, breathable',
    pricing: { cost: 80, retail: 150, unit: 'linearM', currency: 'ILS' },
  },
  {
    sku: 'MAT-WOOD-OAK',
    name: { he: 'אלון', en: 'Oak' },
    categorySlug: 'furniture-materials',
    typeSlug: 'solid-wood',  // Actual slug from DB
    subType: 'Oak hardwood',
    finish: ['natural', 'stained', 'whitewashed'],
    texture: 'Distinctive grain',
    pricing: { cost: 350, retail: 550, unit: 'sqm', currency: 'ILS' },
  },
  {
    sku: 'MAT-WOOD-WALNUT',
    name: { he: 'אגוז', en: 'Walnut' },
    categorySlug: 'furniture-materials',
    typeSlug: 'solid-wood',  // Actual slug from DB
    subType: 'Walnut hardwood',
    finish: ['natural', 'oiled'],
    texture: 'Rich, dark grain',
    pricing: { cost: 400, retail: 650, unit: 'sqm', currency: 'ILS' },
  },
  {
    sku: 'MAT-METAL-BRASS',
    name: { he: 'פליז', en: 'Brass' },
    categorySlug: 'furniture-materials',
    typeSlug: 'metal',  // Actual slug from DB
    subType: 'Brass',
    finish: ['polished', 'brushed', 'antique'],
    texture: 'Smooth metallic',
    pricing: { cost: 150, retail: 280, unit: 'unit', currency: 'ILS' },
  },
]

async function seedBaseMaterials() {
  console.log(chalk.cyan.bold('\n📦 Base Materials Seeder\n'))
  console.log(chalk.gray('Creating global base materials...\n'))

  if (options.dryRun) {
    console.log(chalk.yellow('⚠️  DRY RUN MODE - No changes will be saved\n'))
  }

  console.log(chalk.gray('─'.repeat(60)))
  console.log('')

  try {
    // Fetch all categories and types
    console.log(chalk.blue('📦 Loading material categories and types...'))
    const categories = await prisma.materialCategory.findMany({
      include: { types: true }
    })

    const categoryMap = new Map(categories.map(c => [c.slug, c]))
    const typeMap = new Map()
    categories.forEach(cat => {
      cat.types.forEach(type => {
        typeMap.set(`${cat.slug}:${type.slug}`, type)
      })
    })

    console.log(chalk.green(`✓ Loaded ${categories.length} categories\n`))

    let createdCount = 0
    let skippedCount = 0
    let errorCount = 0

    for (const materialData of BASE_MATERIALS) {
      try {
        const materialName = `${materialData.name.he} / ${materialData.name.en}`
        console.log(chalk.cyan(`\n📦 Processing: ${materialName}`))

        // Check if already exists
        const existing = await prisma.material.findUnique({
          where: { sku: materialData.sku }
        })

        if (existing) {
          console.log(chalk.gray(`  ⏭️  Already exists`))
          skippedCount++
          continue
        }

        // Get category
        const category = categoryMap.get(materialData.categorySlug)
        if (!category) {
          console.error(chalk.red(`  ❌ Category not found: ${materialData.categorySlug}`))
          errorCount++
          continue
        }

        // Get type
        const typeKey = `${materialData.categorySlug}:${materialData.typeSlug}`
        const type = typeMap.get(typeKey)
        if (!type) {
          console.error(chalk.red(`  ❌ Type not found: ${typeKey}`))
          errorCount++
          continue
        }

        if (options.dryRun) {
          console.log(chalk.yellow(`  [DRY RUN] Would create material`))
          createdCount++
          continue
        }

        // Create material (global material - no suppliers)
        const material = await prisma.material.create({
          data: {
            sku: materialData.sku,
            name: materialData.name,
            categoryId: category.id,
            // No suppliers = global material
            properties: {
              typeId: type.id,
              subType: materialData.subType,
              finish: materialData.finish,
              texture: materialData.texture,
              colorIds: [], // Empty for now
              technical: {
                durability: 8,
                maintenance: 5,  // Int: 1-10 scale
                sustainability: 7,  // Int: 1-10 scale
              },
            },
            pricing: {
              cost: materialData.pricing.cost,
              retail: materialData.pricing.retail,
              unit: materialData.pricing.unit,
              currency: materialData.pricing.currency,
              bulkDiscounts: [],
            },
            availability: {
              inStock: true,
              leadTime: 7,
              minOrder: 1,
            },
            assets: {
              thumbnail: '',  // Required field (empty string for now)
              images: []
            },
          },
        })

        createdCount++
        console.log(chalk.green(`  ✅ Created successfully`))

      } catch (error) {
        errorCount++
        console.error(chalk.red(`  ❌ Error: ${error}`))
      }
    }

    // Summary
    console.log(chalk.cyan.bold('\n\n📊 Seeding Summary\n'))
    console.log(chalk.gray('─'.repeat(60)))
    console.log(chalk.green(`✓ Materials created: ${createdCount}`))
    console.log(chalk.gray(`⏭️  Skipped (existing): ${skippedCount}`))
    if (errorCount > 0) {
      console.log(chalk.red(`✗ Errors: ${errorCount}`))
    }
    console.log('')

  } catch (error) {
    console.error(chalk.red('\n❌ Seeding failed:'), error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run seeding
seedBaseMaterials()
  .then(() => {
    console.log(chalk.green.bold('\n✅ Seeding completed!\n'))
    process.exit(0)
  })
  .catch((error) => {
    console.error(chalk.red('\n❌ Seeding failed:'), error)
    process.exit(1)
  })
