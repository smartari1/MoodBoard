#!/usr/bin/env tsx
/**
 * Seed Colors CLI Script
 *
 * Generate and seed colors for interior design
 * using Gemini AI for descriptions
 *
 * Usage:
 *   npm run seed:colors                    # Seed all colors with descriptions
 *   npm run seed:colors -- --limit 5       # Seed first 5 colors
 *   npm run seed:colors -- --dry-run       # Test without saving
 *   npm run seed:colors -- --quick         # Seed without AI descriptions (fast)
 *   npm run seed:colors -- --help          # Show help
 */

import { seedColors, seedColorsQuick } from '../src/lib/seed/seed-colors'
import { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'

const program = new Command()

program
  .name('seed-colors')
  .description('Generate and seed colors using Gemini AI')
  .option('-l, --limit <number>', 'Limit number of colors (useful for testing)', parseInt)
  .option('-s, --skip-existing', 'Skip existing colors (default: true)', true)
  .option('-f, --force', 'Force update existing colors')
  .option('-d, --dry-run', 'Dry run - don\'t save to database')
  .option('-v, --verbose', 'Verbose output')
  .option('-q, --quick', 'Quick mode - skip AI description generation')
  .parse(process.argv)

const options = program.opts()

// Validate GEMINI_API_KEY (only if not in quick mode)
if (!options.quick && !process.env.GEMINI_API_KEY) {
  console.error(chalk.red('❌ Error: GEMINI_API_KEY environment variable is required'))
  console.error(chalk.yellow('💡 Set it in your .env.local file or export it:'))
  console.error(chalk.cyan('   export GEMINI_API_KEY="your-api-key-here"'))
  console.error(chalk.gray('   Or use --quick mode to skip AI generation'))
  process.exit(1)
}

// Banner
console.log(chalk.cyan.bold('\n🎨 MoodB Color Seeder\n'))
console.log(chalk.gray('Seeding colors with professional descriptions...\n'))

// Show configuration
if (options.dryRun) {
  console.log(chalk.yellow('⚠️  DRY RUN MODE - No data will be saved\n'))
}

if (options.quick) {
  console.log(chalk.blue('⚡ QUICK MODE - Skipping AI description generation\n'))
}

if (options.limit) {
  console.log(chalk.blue(`🔢 Limiting to ${options.limit} colors\n`))
}

console.log(chalk.gray('─'.repeat(60)))
console.log('')

// Progress spinner
let spinner: ReturnType<typeof ora> | null = null

const seedOptions = {
  skipExisting: options.force ? false : options.skipExisting,
  limit: options.limit,
  dryRun: options.dryRun,
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
    const result = options.quick
      ? await seedColorsQuick(seedOptions)
      : await seedColors(seedOptions)

    if (spinner) {
      spinner.stop()
    }

    console.log('')
    console.log(chalk.gray('─'.repeat(60)))
    console.log('')

    // Show results
    console.log(chalk.cyan.bold('📊 Seeding Results:\n'))

    const statsTable = [
      ['Action', 'Count'],
      ['─'.repeat(15), '─'.repeat(7)],
      ['Created', chalk.green(result.stats.created.toString())],
      ['Updated', chalk.yellow(result.stats.updated.toString())],
      ['Skipped', chalk.gray(result.stats.skipped.toString())],
      ['─'.repeat(15), '─'.repeat(7)],
      ['Total', chalk.bold((result.stats.created + result.stats.updated + result.stats.skipped).toString())],
    ]

    // Format table
    statsTable.forEach((row, index) => {
      if (index === 0) {
        console.log(chalk.bold(row.map((col, i) => col.padEnd(i === 0 ? 15 : 7)).join('  ')))
      } else {
        console.log(row.map((col, i) => col.padEnd(i === 0 ? 15 : 7)).join('  '))
      }
    })

    console.log('')

    // Show errors if any
    if (result.errors.length > 0) {
      console.log(chalk.red.bold(`❌ ${result.errors.length} Errors:\n`))
      result.errors.forEach((error) => {
        console.log(chalk.red(`  • ${error.color}: ${error.error}`))
      })
      console.log('')
    }

    // Show timing
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log(chalk.gray(`⏱️  Completed in ${duration}s`))

    // Success message
    if (result.success && result.errors.length === 0) {
      console.log('')
      console.log(chalk.green.bold('✨ Color seeding completed successfully!'))
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
