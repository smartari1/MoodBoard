#!/usr/bin/env tsx
/**
 * Check RoomColorPalette Structure
 *
 * Inspects the actual structure of colorPalette fields in the database
 */

import { PrismaClient } from '@prisma/client'
import chalk from 'chalk'

const prisma = new PrismaClient()

async function checkColorPaletteStructure() {
  console.log(chalk.cyan.bold('\n🔍 Checking RoomColorPalette Structure\n'))

  try {
    // Get styles with room profiles using raw MongoDB query
    const styles = await prisma.style.findMany({
      select: {
        id: true,
        name: true,
        roomProfiles: true,
      },
      take: 10, // Limit to first 10 styles for inspection
    })

    console.log(chalk.blue(`Found ${styles.length} styles\n`))

    for (const style of styles) {
      if (!style.roomProfiles || style.roomProfiles.length === 0) continue

      console.log(chalk.cyan(`\n📋 Style: ${style.name.he || style.name.en}`))
      console.log(chalk.gray(`   ID: ${style.id}`))

      for (let i = 0; i < style.roomProfiles.length; i++) {
        const profile = style.roomProfiles[i] as any
        console.log(chalk.yellow(`\n   Room Profile ${i + 1}:`))
        console.log(chalk.gray(`   Room Type ID: ${profile.roomTypeId}`))

        if (profile.colorPalette) {
          console.log(chalk.magenta(`   Color Palette:`))
          console.log(chalk.gray(`     ${JSON.stringify(profile.colorPalette, null, 2)}`))

          // Check for old format fields
          const hasOldFormat = 'primary' in profile.colorPalette ||
                               'secondary' in profile.colorPalette ||
                               'accent' in profile.colorPalette

          // Check for new format fields
          const hasNewFormat = 'primaryId' in profile.colorPalette ||
                               'secondaryIds' in profile.colorPalette ||
                               'accentIds' in profile.colorPalette

          if (hasOldFormat && hasNewFormat) {
            console.log(chalk.red(`     ⚠️ HAS BOTH OLD AND NEW FORMAT!`))
          } else if (hasOldFormat) {
            console.log(chalk.yellow(`     ℹ️ Using old format (primary, secondary, accent)`))
          } else if (hasNewFormat) {
            console.log(chalk.green(`     ✓ Using new format (primaryId, secondaryIds, accentIds)`))
          } else {
            console.log(chalk.gray(`     ℹ️ Empty color palette`))
          }
        } else {
          console.log(chalk.gray(`   No color palette`))
        }
      }
    }

    console.log(chalk.green.bold('\n✅ Inspection complete!\n'))

  } catch (error) {
    console.error(chalk.red('\n❌ Error:'), error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

checkColorPaletteStructure()
  .catch((error) => {
    console.error(chalk.red('\n❌ Failed:'), error)
    process.exit(1)
  })
