/**
 * Color Seeding Service
 * Seeds global colors with AI-generated descriptions
 */

import { PrismaClient } from '@prisma/client'
import { generateColorDescription } from '../ai'
import { COLORS_DATA, type ColorData } from './colors-data'

const prisma = new PrismaClient()

export interface ColorSeedOptions {
  skipExisting?: boolean
  limit?: number
  onProgress?: (message: string, current?: number, total?: number) => void
  dryRun?: boolean
  generateDescriptions?: boolean
}

export interface ColorSeedResult {
  success: boolean
  stats: {
    created: number
    updated: number
    skipped: number
  }
  errors: Array<{ color: string; error: string }>
}

/**
 * Seed colors to database
 */
export async function seedColors(options: ColorSeedOptions = {}): Promise<ColorSeedResult> {
  const {
    skipExisting = true,
    limit,
    onProgress,
    dryRun = false,
    generateDescriptions = true,
  } = options

  const result: ColorSeedResult = {
    success: true,
    stats: {
      created: 0,
      updated: 0,
      skipped: 0,
    },
    errors: [],
  }

  try {
    const colorsToSeed = limit ? COLORS_DATA.slice(0, limit) : COLORS_DATA

    onProgress?.(`🎨 Seeding ${colorsToSeed.length} colors...`)

    for (let i = 0; i < colorsToSeed.length; i++) {
      const colorData = colorsToSeed[i]

      try {
        onProgress?.(
          `Processing color ${i + 1}/${colorsToSeed.length}: ${colorData.name.he} / ${colorData.name.en}`,
          i + 1,
          colorsToSeed.length
        )

        // Check if color already exists (by hex)
        const existing = await prisma.color.findUnique({
          where: { hex: colorData.hex },
        })

        if (existing && skipExisting) {
          onProgress?.(
            `⏭️  Skipping existing color: ${colorData.name.he} / ${colorData.name.en}`,
            i + 1,
            colorsToSeed.length
          )
          result.stats.skipped++
          continue
        }

        // Generate description if requested
        let description: { he: string; en: string } | undefined

        if (generateDescriptions) {
          onProgress?.(
            `🤖 Generating description for: ${colorData.name.he} / ${colorData.name.en}`,
            i + 1,
            colorsToSeed.length
          )

          try {
            description = await generateColorDescription(colorData.name, {
              hex: colorData.hex,
              category: colorData.category,
            })
          } catch (error) {
            onProgress?.(
              `⚠️  Warning: Failed to generate description for ${colorData.name.he}: ${error instanceof Error ? error.message : String(error)}`,
              i + 1,
              colorsToSeed.length
            )
            // Continue without description
          }
        }

        if (dryRun) {
          onProgress?.(
            `[DRY RUN] Would ${existing ? 'update' : 'create'} color: ${colorData.name.he}${description ? ' with description' : ''}`,
            i + 1,
            colorsToSeed.length
          )
          if (existing) {
            result.stats.updated++
          } else {
            result.stats.created++
          }
          continue
        }

        // Create or update color
        const color = await prisma.color.upsert({
          where: { hex: colorData.hex },
          create: {
            name: colorData.name,
            hex: colorData.hex,
            pantone: colorData.pantone,
            category: colorData.category,
            role: colorData.role,
            description,
            usage: 0,
            organizationId: null, // Global color
          },
          update: {
            name: colorData.name,
            pantone: colorData.pantone,
            category: colorData.category,
            role: colorData.role,
            ...(description && { description }),
          },
        })

        if (existing) {
          result.stats.updated++
          onProgress?.(
            `✏️  Updated color: ${color.name.he}`,
            i + 1,
            colorsToSeed.length
          )
        } else {
          result.stats.created++
          onProgress?.(
            `✅ Created color: ${color.name.he}`,
            i + 1,
            colorsToSeed.length
          )
        }

        // Add delay to avoid rate limiting
        if (i < colorsToSeed.length - 1 && generateDescriptions) {
          await new Promise((resolve) => setTimeout(resolve, 1000))
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        result.errors.push({
          color: `${colorData.name.he} / ${colorData.name.en}`,
          error: errorMsg,
        })
        onProgress?.(
          `❌ Error processing color ${colorData.name.he}: ${errorMsg}`,
          i + 1,
          colorsToSeed.length
        )
      }
    }

    onProgress?.('✅ Color seeding completed!')
    result.success = true
  } catch (error) {
    result.success = false
    result.errors.push({
      color: 'global',
      error: error instanceof Error ? error.message : String(error),
    })
  } finally {
    await prisma.$disconnect()
  }

  return result
}

/**
 * Seed colors without descriptions (fast mode)
 */
export async function seedColorsQuick(options: ColorSeedOptions = {}): Promise<ColorSeedResult> {
  return seedColors({
    ...options,
    generateDescriptions: false,
  })
}
