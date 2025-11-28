/**
 * Phase 2: Special Image Generator Module
 *
 * Generates COMPOSITE and ANCHOR images for styles:
 * - COMPOSITE: Artistic mood board / flat-lay composition
 * - ANCHOR: Hero/signature shot representing the style
 */

import { PrismaClient, ImageCategory } from '@prisma/client'
import { generateAndUploadImages } from '@/lib/ai'

const prisma = new PrismaClient()

export interface SpecialImageOptions {
  styleId: string
  styleName: { he: string; en: string }
  description?: { he: string; en: string }
  styleContext: {
    subCategoryName: string
    approachName: string
    colorName: string
    colorHex: string
  }
  tags?: string[]
}

/**
 * Generate COMPOSITE image (mood board / artistic composition)
 */
export async function generateCompositeImage(
  options: SpecialImageOptions
): Promise<string | null> {
  const {
    styleId,
    styleName,
    description,
    styleContext,
    tags = [],
  } = options

  console.log(`\n🎨 Generating COMPOSITE image for style: ${styleName.en}`)

  try {
    // Generate composite image
    const imageUrls = await generateAndUploadImages({
      entityType: 'composite',
      entityName: styleName,
      description,
      numberOfImages: 1,
      styleContext,
      aspectRatio: '4:3', // Landscape for mood board
    })

    if (imageUrls.length === 0) {
      console.error(`   ❌ No composite image generated`)
      return null
    }

    const imageUrl = imageUrls[0]

    // Create StyleImage record
    const styleImage = await prisma.styleImage.create({
      data: {
        styleId,
        url: imageUrl,
        imageCategory: 'COMPOSITE' as ImageCategory,
        displayOrder: 0, // High priority
        description: `Artistic composition representing ${styleName.en} style`,
        tags: ['composite', 'mood-board', 'artistic', ...tags],
      }
    })

    console.log(`   ✅ Composite image created: ${styleImage.id}`)

    // Update style with compositeImageUrl
    await prisma.style.update({
      where: { id: styleId },
      data: { compositeImageUrl: imageUrl }
    })

    return imageUrl

  } catch (error) {
    console.error(`   ❌ Failed to generate composite image:`, error)
    return null
  }
}

/**
 * Generate ANCHOR image (hero/signature shot)
 */
export async function generateAnchorImage(
  options: SpecialImageOptions
): Promise<string | null> {
  const {
    styleId,
    styleName,
    description,
    styleContext,
    tags = [],
  } = options

  console.log(`\n⚓ Generating ANCHOR image for style: ${styleName.en}`)

  try {
    // Generate anchor image
    const imageUrls = await generateAndUploadImages({
      entityType: 'anchor',
      entityName: styleName,
      description,
      numberOfImages: 1,
      styleContext,
      aspectRatio: '16:9', // Cinematic hero shot
    })

    if (imageUrls.length === 0) {
      console.error(`   ❌ No anchor image generated`)
      return null
    }

    const imageUrl = imageUrls[0]

    // Create StyleImage record
    const styleImage = await prisma.styleImage.create({
      data: {
        styleId,
        url: imageUrl,
        imageCategory: 'ANCHOR' as ImageCategory,
        displayOrder: 0, // Highest priority
        description: `Hero shot representing ${styleName.en} style`,
        tags: ['anchor', 'hero', 'signature', ...tags],
      }
    })

    console.log(`   ✅ Anchor image created: ${styleImage.id}`)

    // Update style with anchorImageUrl
    await prisma.style.update({
      where: { id: styleId },
      data: { anchorImageUrl: imageUrl }
    })

    return imageUrl

  } catch (error) {
    console.error(`   ❌ Failed to generate anchor image:`, error)
    return null
  }
}

/**
 * Generate both COMPOSITE and ANCHOR images
 */
export async function generateSpecialImages(
  options: SpecialImageOptions
): Promise<{ composite: string | null; anchor: string | null }> {
  console.log(`\n✨ Generating special images for style: ${options.styleName.en}`)

  // Generate composite image
  const composite = await generateCompositeImage(options)

  // Add delay between generations
  await new Promise(resolve => setTimeout(resolve, 3000))

  // Generate anchor image
  const anchor = await generateAnchorImage(options)

  console.log(`   ✅ Special images: Composite=${!!composite}, Anchor=${!!anchor}`)

  return { composite, anchor }
}

/**
 * Get composite image for a style
 */
export async function getStyleCompositeImage(styleId: string) {
  return await prisma.styleImage.findFirst({
    where: {
      styleId,
      imageCategory: 'COMPOSITE'
    }
  })
}

/**
 * Get anchor image for a style
 */
export async function getStyleAnchorImage(styleId: string) {
  return await prisma.styleImage.findFirst({
    where: {
      styleId,
      imageCategory: 'ANCHOR'
    }
  })
}

/**
 * Delete special image
 */
export async function deleteSpecialImage(imageId: string) {
  const image = await prisma.styleImage.findUnique({
    where: { id: imageId }
  })

  if (!image) {
    throw new Error('Image not found')
  }

  // Clear reference in Style model
  if (image.imageCategory === 'COMPOSITE') {
    await prisma.style.update({
      where: { id: image.styleId },
      data: { compositeImageUrl: null }
    })
  } else if (image.imageCategory === 'ANCHOR') {
    await prisma.style.update({
      where: { id: image.styleId },
      data: { anchorImageUrl: null }
    })
  }

  // Delete StyleImage record
  await prisma.styleImage.delete({
    where: { id: imageId }
  })
}

/**
 * Update special image metadata
 */
export async function updateSpecialImage(
  imageId: string,
  updates: {
    description?: string
    tags?: string[]
  }
) {
  return await prisma.styleImage.update({
    where: { id: imageId },
    data: updates
  })
}
