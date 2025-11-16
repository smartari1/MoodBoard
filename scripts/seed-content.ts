#!/usr/bin/env tsx
/**
 * Seed Content CLI Script
 *
 * Generate and seed detailed content for all style engine entities
 * using Gemini AI
 *
 * Usage:
 *   npm run seed:content                    # Seed everything
 *   npm run seed:content -- --only categories  # Seed only categories
 *   npm run seed:content -- --limit 5       # Limit to 5 items per entity
 *   npm run seed:content -- --dry-run       # Test without saving
 *   npm run seed:content -- --help          # Show help
 */

import { seedAllContent, type SeedOptions } from '../src/lib/seed/seed-service'
import { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'

const program = new Command()

program
  .name('seed-content')
  .description('Generate and seed detailed content using Gemini AI')
  .option('-o, --only <types...>', 'Only seed specific types (categories, subCategories, approaches, roomTypes, styles)')
  .option('-l, --limit <number>', 'Limit number of items per type (useful for testing)', parseInt)
  .option('-s, --skip-existing', 'Skip existing entities (default: true)', true)
  .option('-f, --force', 'Force update existing entities')
  .option('-d, --dry-run', 'Dry run - don\'t save to database')
  .option('-v, --verbose', 'Verbose output')
  .option('-i, --images', 'Generate images for entities (uses placeholders until image API is integrated)')
  .option('-n, --images-count <number>', 'Number of images to generate per entity (default: 3)', parseInt)
  .parse(process.argv)

const options = program.opts()

// Validate GEMINI_API_KEY
if (!process.env.GEMINI_API_KEY) {
  console.error(chalk.red('❌ Error: GEMINI_API_KEY environment variable is required'))
  console.error(chalk.yellow('💡 Set it in your .env.local file or export it:'))
  console.error(chalk.cyan('   export GEMINI_API_KEY="your-api-key-here"'))
  process.exit(1)
}

// Banner
console.log(chalk.cyan.bold('\n🎨 MoodB Content Seeder\n'))
console.log(chalk.gray('Generating detailed content using Gemini AI...\n'))

// Show configuration
if (options.dryRun) {
  console.log(chalk.yellow('⚠️  DRY RUN MODE - No data will be saved\n'))
}

if (options.only) {
  console.log(chalk.blue(`📋 Only seeding: ${options.only.join(', ')}\n`))
}

if (options.limit) {
  console.log(chalk.blue(`🔢 Limiting to ${options.limit} items per type\n`))
}

if (options.images) {
  const count = options.imagesCount || 3
  console.log(chalk.blue(`🖼️  Generating ${count} images per entity (using placeholders)\n`))
}

console.log(chalk.gray('─'.repeat(60)))
console.log('')

// Progress spinner
let spinner: ReturnType<typeof ora> | null = null
let lastProgress = { current: 0, total: 0 }

const seedOptions: SeedOptions = {
  skipExisting: options.force ? false : options.skipExisting,
  only: options.only,
  limit: options.limit,
  dryRun: options.dryRun,
  generateImages: options.images || false,
  imagesPerEntity: options.imagesCount || 3,
  onProgress: (message: string, current?: number, total?: number) => {
    if (options.verbose) {
      if (spinner) {
        spinner.stop()
      }
      console.log(chalk.gray(`[${new Date().toISOString()}]`), message)
      return
    }

    // Handle progress with spinner
    if (current !== undefined && total !== undefined) {
      lastProgress = { current, total }
      const percentage = Math.round((current / total) * 100)

      if (spinner) {
        spinner.text = `${message} (${current}/${total} - ${percentage}%)`
      } else {
        spinner = ora({
          text: `${message} (${current}/${total} - ${percentage}%)`,
          spinner: 'dots',
        }).start()
      }

      if (current === total && spinner) {
        spinner.succeed()
        spinner = null
      }
    } else {
      if (spinner) {
        spinner.stop()
      }

      // Check message type
      if (message.startsWith('✅')) {
        console.log(chalk.green(message))
      } else if (message.startsWith('❌')) {
        console.log(chalk.red(message))
      } else if (message.startsWith('⚠️')) {
        console.log(chalk.yellow(message))
      } else if (message.startsWith('🤖')) {
        spinner = ora({
          text: message,
          spinner: 'dots',
        }).start()
      } else {
        console.log(chalk.blue(message))
      }
    }
  },
}

// Run seeding
;(async () => {
  const startTime = Date.now()

  try {
    const result = await seedAllContent(seedOptions)

    if (spinner) {
      spinner.stop()
    }

    console.log('')
    console.log(chalk.gray('─'.repeat(60)))
    console.log('')

    // Show results
    console.log(chalk.cyan.bold('📊 Seeding Results:\n'))

    const statsTable = [
      ['Entity', 'Created', 'Updated', 'Skipped', 'Total'],
      ['─'.repeat(15), '─'.repeat(7), '─'.repeat(7), '─'.repeat(7), '─'.repeat(7)],
      [
        'Categories',
        result.stats.categories.created.toString(),
        result.stats.categories.updated.toString(),
        result.stats.categories.skipped.toString(),
        (result.stats.categories.created + result.stats.categories.updated + result.stats.categories.skipped).toString(),
      ],
      [
        'SubCategories',
        result.stats.subCategories.created.toString(),
        result.stats.subCategories.updated.toString(),
        result.stats.subCategories.skipped.toString(),
        (result.stats.subCategories.created + result.stats.subCategories.updated + result.stats.subCategories.skipped).toString(),
      ],
      [
        'Approaches',
        result.stats.approaches.created.toString(),
        result.stats.approaches.updated.toString(),
        result.stats.approaches.skipped.toString(),
        (result.stats.approaches.created + result.stats.approaches.updated + result.stats.approaches.skipped).toString(),
      ],
      [
        'Room Types',
        result.stats.roomTypes.created.toString(),
        result.stats.roomTypes.updated.toString(),
        result.stats.roomTypes.skipped.toString(),
        (result.stats.roomTypes.created + result.stats.roomTypes.updated + result.stats.roomTypes.skipped).toString(),
      ],
    ]

    // Format table
    statsTable.forEach((row, index) => {
      if (index === 0) {
        console.log(chalk.bold(row.map((col, i) => col.padEnd(i === 0 ? 15 : 7)).join('  ')))
      } else if (index === 1) {
        console.log(chalk.gray(row.map((col, i) => col.padEnd(i === 0 ? 15 : 7)).join('  ')))
      } else {
        const colored = row.map((col, i) => {
          if (i === 0) return chalk.cyan(col.padEnd(15))
          if (i === 1) return chalk.green(col.padEnd(7))
          if (i === 2) return chalk.yellow(col.padEnd(7))
          if (i === 3) return chalk.gray(col.padEnd(7))
          return chalk.bold(col.padEnd(7))
        })
        console.log(colored.join('  '))
      }
    })

    console.log('')

    // Show errors if any
    if (result.errors.length > 0) {
      console.log(chalk.red.bold(`❌ ${result.errors.length} Errors:\n`))
      result.errors.forEach((error) => {
        console.log(chalk.red(`  • ${error.entity}: ${error.error}`))
      })
      console.log('')
    }

    // Show timing
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log(chalk.gray(`⏱️  Completed in ${duration}s`))

    // Success message
    if (result.success && result.errors.length === 0) {
      console.log('')
      console.log(chalk.green.bold('✨ Seeding completed successfully!'))
    } else if (result.errors.length > 0) {
      console.log('')
      console.log(chalk.yellow.bold('⚠️  Seeding completed with errors'))
      process.exit(1)
    } else {
      console.log('')
      console.log(chalk.red.bold('❌ Seeding failed'))
      process.exit(1)
    }
  } catch (error) {
    if (spinner) {
      spinner.fail()
    }

    console.error('')
    console.error(chalk.red.bold('❌ Fatal Error:'))
    console.error(chalk.red(error instanceof Error ? error.message : String(error)))

    if (error instanceof Error && error.stack) {
      console.error('')
      console.error(chalk.gray(error.stack))
    }

    process.exit(1)
  }
})()
