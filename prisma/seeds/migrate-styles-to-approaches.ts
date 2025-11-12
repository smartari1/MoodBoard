/**
 * Migration Script: Convert legacy Style materialSet/roomProfiles into Approach records.
 *
 * Usage:
 *   pnpm tsx prisma/seeds/migrate-styles-to-approaches.ts
 *
 * Safe to run multiple times – skips styles that already have approaches.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type RawStyle = {
  _id: { $oid: string }
  name?: { he?: string; en?: string }
  slug?: string
  materialSet?: any
  roomProfiles?: any[]
  metadata?: any
  approaches?: any[]
}

const DEFAULT_APPROACH_SLUG = 'default'

function toObjectId(raw: { $oid?: string } | string): string {
  if (!raw) {
    throw new Error('Missing ObjectId value')
  }

  if (typeof raw === 'string') {
    return raw
  }

  if (raw.$oid) {
    return raw.$oid
  }

  throw new Error(`Unable to convert ObjectId from value: ${JSON.stringify(raw)}`)
}

function generateDefaultApproachName(styleName?: { he?: string; en?: string }) {
  return {
    he: styleName?.he ? `${styleName.he} - ברירת מחדל` : 'גישה ברירת מחדל',
    en: styleName?.en ? `${styleName.en} - Default` : 'Default Approach',
  }
}

async function migrate() {
  console.log('🚀 Starting style → approach migration')

  const rawStyles = (await prisma.style.aggregateRaw({
    pipeline: [
      {
        $project: {
          _id: 1,
          name: 1,
          slug: 1,
          materialSet: 1,
          roomProfiles: 1,
          metadata: 1,
        },
      },
    ],
  })) as RawStyle[]

  console.log(`📦 Found ${rawStyles.length} style documents`)

  for (const styleDoc of rawStyles) {
    const styleId = toObjectId(styleDoc._id)
    const style = await prisma.style.findUnique({
      where: { id: styleId },
      include: { approaches: true },
    })

    if (!style) {
      console.warn(`⚠️  Style not found in Prisma model (id: ${styleId}), skipping`)
      continue
    }

    if (style.approaches.length > 0) {
      console.log(`➡️  Style ${style.slug} already has ${style.approaches.length} approach(es), skipping`)
      continue
    }

    const materialSet = styleDoc.materialSet ?? { defaults: [], alternatives: [] }
    const roomProfiles = Array.isArray(styleDoc.roomProfiles) ? styleDoc.roomProfiles : []

    console.log(`✨ Creating default approach for style ${style.slug} (${styleId})`)

    await prisma.approach.create({
      data: {
        styleId,
        slug: DEFAULT_APPROACH_SLUG,
        name: generateDefaultApproachName(styleDoc.name),
        order: 0,
        materialSet: materialSet as any,
        roomProfiles: roomProfiles as any,
        metadata: {
          isDefault: true,
          version: styleDoc?.metadata?.version ?? '1.0.0',
          tags: styleDoc?.metadata?.tags ?? [],
          usage: styleDoc?.metadata?.usage ?? 0,
        },
      },
    })

    await prisma.$runCommandRaw({
      update: 'styles',
      updates: [
        {
          q: { _id: { $oid: styleId } },
          u: {
            $unset: {
              materialSet: '',
              roomProfiles: '',
            },
          },
        },
      ],
    })

    console.log(`   ✅ Default approach created and legacy fields removed`)
  }

  console.log('🎉 Migration completed successfully')
}

migrate()
  .catch((error) => {
    console.error('❌ Migration failed', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

