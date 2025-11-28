/**
 * Link Orphaned GCP Images Script
 *
 * This script:
 * 1. Lists all images in the GCP bucket
 * 2. Finds all styles in MongoDB and their linked images
 * 3. Identifies orphaned images (in GCP but not linked to any style)
 * 4. Attempts to match orphaned images to styles based on naming patterns
 * 5. Updates styles to include the matched orphaned images
 *
 * Usage: npx tsx scripts/link-orphaned-gcp-images.ts [--dry-run] [--verbose]
 */

import { Storage } from '@google-cloud/storage'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GCP Configuration
const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID || 'moodboard-476922'
const GCP_BUCKET_NAME = process.env.GCP_BUCKET_NAME || 'moodb-assets'
const GCP_PUBLIC_URL = `https://storage.googleapis.com/${GCP_BUCKET_NAME}`

// Initialize GCP Storage
const storage = new Storage({
  projectId: GCP_PROJECT_ID,
  ...(process.env.GCP_SERVICE_ACCOUNT_KEY
    ? { credentials: JSON.parse(process.env.GCP_SERVICE_ACCOUNT_KEY) }
    : {}),
})

const bucket = storage.bucket(GCP_BUCKET_NAME)

interface GCPImage {
  name: string // Full path in bucket
  url: string // Public URL
  size: number
  created: Date
  folder: string // Top-level folder (styles, scene, materials, etc.)
  entityId?: string // Extracted entity ID if applicable
  styleName?: string // Extracted style name from filename
}

interface StyleImageInfo {
  styleId: string
  styleName: string
  styleSlug: string
  galleryUrls: string[]
  roomProfileUrls: string[]
}

/**
 * List all images in the GCP bucket
 */
async function listAllGCPImages(): Promise<GCPImage[]> {
  console.log('📂 Listing all images in GCP bucket...')

  const [files] = await bucket.getFiles()

  const images: GCPImage[] = []

  for (const file of files) {
    // Only process image files
    if (!file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      continue
    }

    const [metadata] = await file.getMetadata()
    const pathParts = file.name.split('/')
    const folder = pathParts[0]

    // Extract entity ID from path (e.g., styles/123abc/image.png -> 123abc)
    let entityId: string | undefined
    let styleName: string | undefined

    if (pathParts.length >= 2) {
      entityId = pathParts[1]
    }

    // Try to extract style name from filename
    // Pattern: <style-name>-<number>-<timestamp>.<ext>
    const filename = pathParts[pathParts.length - 1]
    const nameMatch = filename.match(/^(.+?)-\d+-\d+\.(jpg|jpeg|png|gif|webp)$/i)
    if (nameMatch) {
      styleName = nameMatch[1].replace(/-/g, ' ')
    }

    images.push({
      name: file.name,
      url: `${GCP_PUBLIC_URL}/${file.name}`,
      size: Number(metadata.size) || 0,
      created: new Date(metadata.timeCreated || Date.now()),
      folder,
      entityId,
      styleName,
    })
  }

  console.log(`   Found ${images.length} images in GCP bucket`)
  return images
}

/**
 * Get all styles with their linked images from MongoDB
 */
async function getAllStylesWithImages(): Promise<StyleImageInfo[]> {
  console.log('📊 Fetching all styles from MongoDB...')

  const styles = await prisma.style.findMany({
    select: {
      id: true,
      slug: true,
      name: true,
      gallery: true,
      roomProfiles: true,
    },
  })

  const styleInfos: StyleImageInfo[] = styles.map((style) => {
    // Extract URLs from gallery
    const galleryUrls: string[] = []
    if (Array.isArray(style.gallery)) {
      for (const item of style.gallery as any[]) {
        if (item?.url && typeof item.url === 'string') {
          galleryUrls.push(item.url)
        }
      }
    }

    // Extract URLs from room profiles
    const roomProfileUrls: string[] = []
    if (Array.isArray(style.roomProfiles)) {
      for (const profile of style.roomProfiles as any[]) {
        if (Array.isArray(profile?.views)) {
          for (const view of profile.views) {
            if (view?.imageUrl && typeof view.imageUrl === 'string') {
              roomProfileUrls.push(view.imageUrl)
            }
          }
        }
      }
    }

    return {
      styleId: style.id,
      styleName: style.name?.en || style.slug,
      styleSlug: style.slug,
      galleryUrls,
      roomProfileUrls,
    }
  })

  console.log(`   Found ${styles.length} styles in MongoDB`)

  let totalLinked = 0
  for (const style of styleInfos) {
    totalLinked += style.galleryUrls.length + style.roomProfileUrls.length
  }
  console.log(`   Total linked images: ${totalLinked}`)

  return styleInfos
}

/**
 * Find orphaned images (in GCP but not linked to any style)
 */
function findOrphanedImages(
  gcpImages: GCPImage[],
  styles: StyleImageInfo[]
): GCPImage[] {
  console.log('🔍 Finding orphaned images...')

  // Create a Set of all linked URLs for fast lookup
  const linkedUrls = new Set<string>()
  for (const style of styles) {
    for (const url of style.galleryUrls) {
      linkedUrls.add(url)
    }
    for (const url of style.roomProfileUrls) {
      linkedUrls.add(url)
    }
  }

  // Filter to only style-related images that are not linked
  const orphaned = gcpImages.filter((img) => {
    // Only check style-related folders
    if (!['styles', 'scene'].includes(img.folder)) {
      return false
    }
    return !linkedUrls.has(img.url)
  })

  console.log(`   Found ${orphaned.length} orphaned images`)
  return orphaned
}

/**
 * Match orphaned images to styles based on naming patterns
 */
function matchOrphanedToStyles(
  orphanedImages: GCPImage[],
  styles: StyleImageInfo[]
): Map<string, GCPImage[]> {
  console.log('🔗 Matching orphaned images to styles...')

  const matches = new Map<string, GCPImage[]>()

  // Create lookup maps for styles
  const styleBySlug = new Map<string, StyleImageInfo>()
  const styleByName = new Map<string, StyleImageInfo>()

  for (const style of styles) {
    styleBySlug.set(style.styleSlug.toLowerCase(), style)
    styleByName.set(style.styleName.toLowerCase(), style)
  }

  for (const img of orphanedImages) {
    let matchedStyle: StyleImageInfo | undefined

    // Try to match by entity ID in path
    if (img.entityId) {
      // Check if entityId looks like a MongoDB ObjectId
      if (img.entityId.match(/^[a-f0-9]{24}$/i)) {
        const style = styles.find((s) => s.styleId === img.entityId)
        if (style) {
          matchedStyle = style
        }
      }

      // Check if entityId matches a slug pattern (seed-<slug>)
      if (!matchedStyle && img.entityId.startsWith('seed-')) {
        const slug = img.entityId.replace('seed-', '')
        matchedStyle = styleBySlug.get(slug.toLowerCase())
      }
    }

    // Try to match by style name in filename
    if (!matchedStyle && img.styleName) {
      const normalizedName = img.styleName.toLowerCase()
      matchedStyle = styleByName.get(normalizedName)

      // Also try slug version
      if (!matchedStyle) {
        const slugVersion = normalizedName.replace(/\s+/g, '-')
        matchedStyle = styleBySlug.get(slugVersion)
      }
    }

    if (matchedStyle) {
      const existing = matches.get(matchedStyle.styleId) || []
      existing.push(img)
      matches.set(matchedStyle.styleId, existing)
    }
  }

  let totalMatched = 0
  for (const [, imgs] of matches) {
    totalMatched += imgs.length
  }
  console.log(`   Matched ${totalMatched} orphaned images to ${matches.size} styles`)

  return matches
}

/**
 * Update styles to include orphaned images
 */
async function linkOrphanedImages(
  matches: Map<string, GCPImage[]>,
  styles: StyleImageInfo[],
  dryRun: boolean
): Promise<void> {
  console.log(`\n${dryRun ? '🔍 [DRY RUN] ' : ''}Linking orphaned images to styles...`)

  const styleById = new Map<string, StyleImageInfo>()
  for (const style of styles) {
    styleById.set(style.styleId, style)
  }

  for (const [styleId, orphanedImages] of matches) {
    const style = styleById.get(styleId)
    if (!style) continue

    console.log(`\n📌 Style: ${style.styleName} (${style.styleSlug})`)
    console.log(`   Current gallery images: ${style.galleryUrls.length}`)
    console.log(`   Orphaned images to add: ${orphanedImages.length}`)

    // Create new gallery items from orphaned images
    // Only include fields that exist in StyleGalleryItem schema
    const newGalleryItems = orphanedImages.map((img, index) => ({
      id: `recovered-${Date.now()}-${index}`,
      url: img.url,
      type: 'scene',
      sceneName: img.styleName || 'recovered',
      prompt: `Recovered orphaned image from GCP bucket`,
      createdAt: new Date(),
    }))

    if (dryRun) {
      console.log(`   Would add ${newGalleryItems.length} images:`)
      for (const item of newGalleryItems.slice(0, 5)) {
        console.log(`     - ${item.url.substring(item.url.lastIndexOf('/') + 1)}`)
      }
      if (newGalleryItems.length > 5) {
        console.log(`     ... and ${newGalleryItems.length - 5} more`)
      }
    } else {
      // Fetch current style data
      const currentStyle = await prisma.style.findUnique({
        where: { id: styleId },
        select: { gallery: true },
      })

      if (!currentStyle) {
        console.log(`   ⚠️  Style not found in database, skipping`)
        continue
      }

      // Merge existing gallery with new items
      const existingGallery = Array.isArray(currentStyle.gallery)
        ? (currentStyle.gallery as any[])
        : []
      const mergedGallery = [...existingGallery, ...newGalleryItems]

      // Update the style (MongoDB composite types need { set: [...] } wrapper)
      await prisma.style.update({
        where: { id: styleId },
        data: {
          gallery: { set: mergedGallery },
        },
      })

      console.log(`   ✅ Added ${newGalleryItems.length} images to gallery`)
    }
  }
}

/**
 * Print summary of orphaned images
 */
function printOrphanedSummary(
  orphaned: GCPImage[],
  matches: Map<string, GCPImage[]>,
  styles: StyleImageInfo[]
): void {
  console.log('\n' + '='.repeat(60))
  console.log('📊 ORPHANED IMAGES SUMMARY')
  console.log('='.repeat(60))

  console.log(`\nTotal orphaned images: ${orphaned.length}`)

  // Group by folder
  const byFolder = new Map<string, GCPImage[]>()
  for (const img of orphaned) {
    const existing = byFolder.get(img.folder) || []
    existing.push(img)
    byFolder.set(img.folder, existing)
  }

  console.log('\nBy folder:')
  for (const [folder, images] of byFolder) {
    console.log(`  ${folder}/: ${images.length} images`)
  }

  // Count matched vs unmatched
  let matchedCount = 0
  for (const [, imgs] of matches) {
    matchedCount += imgs.length
  }
  const unmatchedCount = orphaned.length - matchedCount

  console.log(`\nMatched to styles: ${matchedCount}`)
  console.log(`Unmatched (truly orphaned): ${unmatchedCount}`)

  // List unmatched images
  if (unmatchedCount > 0) {
    console.log('\nUnmatched orphaned images:')
    const matchedUrls = new Set<string>()
    for (const [, imgs] of matches) {
      for (const img of imgs) {
        matchedUrls.add(img.url)
      }
    }

    const unmatched = orphaned.filter((img) => !matchedUrls.has(img.url))
    for (const img of unmatched.slice(0, 20)) {
      console.log(`  - ${img.name}`)
    }
    if (unmatched.length > 20) {
      console.log(`  ... and ${unmatched.length - 20} more`)
    }
  }

  // Size statistics
  const totalSize = orphaned.reduce((sum, img) => sum + img.size, 0)
  console.log(`\nTotal orphaned size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`)
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const verbose = args.includes('--verbose')

  console.log('='.repeat(60))
  console.log('🔗 LINK ORPHANED GCP IMAGES')
  console.log('='.repeat(60))
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE (will update database)'}`)
  console.log('')

  try {
    // Step 1: List all GCP images
    const gcpImages = await listAllGCPImages()

    if (verbose) {
      console.log('\nGCP Images by folder:')
      const byFolder = new Map<string, number>()
      for (const img of gcpImages) {
        byFolder.set(img.folder, (byFolder.get(img.folder) || 0) + 1)
      }
      for (const [folder, count] of byFolder) {
        console.log(`  ${folder}/: ${count}`)
      }
    }

    // Step 2: Get all styles from MongoDB
    const styles = await getAllStylesWithImages()

    // Step 3: Find orphaned images
    const orphaned = findOrphanedImages(gcpImages, styles)

    if (orphaned.length === 0) {
      console.log('\n✅ No orphaned images found! All GCP images are linked.')
      return
    }

    // Step 4: Match orphaned to styles
    const matches = matchOrphanedToStyles(orphaned, styles)

    // Step 5: Print summary
    printOrphanedSummary(orphaned, matches, styles)

    // Step 6: Link matched images (if not dry run)
    if (matches.size > 0) {
      await linkOrphanedImages(matches, styles, dryRun)
    }

    console.log('\n' + '='.repeat(60))
    if (dryRun) {
      console.log('✅ DRY RUN COMPLETE - No changes made')
      console.log('   Run without --dry-run to apply changes')
    } else {
      console.log('✅ COMPLETE - Orphaned images have been linked')
    }
    console.log('='.repeat(60))
  } catch (error) {
    console.error('\n❌ Error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
