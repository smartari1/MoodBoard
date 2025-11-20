/**
 * Phase 2: Material Image Generator Module
 *
 * Generates close-up MATERIAL images for styles:
 * 1. Parse required materials from AI content
 * 2. Generate high-quality material close-up images
 * 3. Create StyleImage records with MATERIAL category
 */

import { PrismaClient, ImageCategory } from '@prisma/client'
import { generateAndUploadImages } from '@/lib/ai/image-generation'

const prisma = new PrismaClient()

export interface MaterialImageOptions {
  styleId: string
  styleName: { he: string; en: string }
  requiredMaterials: string[] // From AI factual details
  priceLevel: 'REGULAR' | 'LUXURY'
  maxImages?: number
  tags?: string[]
}

/**
 * Generate material close-up images for a style
 */
export async function generateMaterialImages(
  options: MaterialImageOptions
): Promise<string[]> {
  const {
    styleId,
    styleName,
    requiredMaterials,
    priceLevel,
    maxImages = 5,
    tags = [],
  } = options

  console.log(`\n🔬 Generating MATERIAL images for style: ${styleName.en}`)
  console.log(`   Required Materials: ${requiredMaterials.length}`)
  console.log(`   Price Level: ${priceLevel}`)
  console.log(`   Max Images: ${maxImages}`)

  const createdImageUrls: string[] = []

  // Select most important materials (up to maxImages)
  const materialsToGenerate = requiredMaterials.slice(0, maxImages)

  for (let i = 0; i < materialsToGenerate.length; i++) {
    const material = materialsToGenerate[i]

    try {
      console.log(`\n   📸 Generating material ${i + 1}/${materialsToGenerate.length}: ${material}`)

      // Generate material close-up image
      const imageUrls = await generateAndUploadImages({
        entityType: 'material',
        entityName: {
          he: material, // TODO: Add Hebrew translation
          en: material
        },
        description: {
          he: `חומר: ${material}`,
          en: `Material: ${material}`
        },
        priceLevel,
        numberOfImages: 1,
        aspectRatio: '1:1', // Square for material library
      })

      if (imageUrls.length > 0) {
        const imageUrl = imageUrls[0]

        // Create StyleImage record
        const styleImage = await prisma.styleImage.create({
          data: {
            styleId,
            url: imageUrl,
            imageCategory: 'MATERIAL' as ImageCategory,
            displayOrder: i,
            description: `${material} material close-up`,
            tags: [priceLevel, material.toLowerCase(), ...tags],
          }
        })

        createdImageUrls.push(imageUrl)
        console.log(`   ✅ Material image created: ${styleImage.id}`)
      }

      // Add delay to avoid rate limiting
      if (i < materialsToGenerate.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }

    } catch (error) {
      console.error(`   ❌ Failed to generate material image for "${material}":`, error)
      // Continue with next material
    }
  }

  console.log(`   ✅ Generated ${createdImageUrls.length} material images`)
  return createdImageUrls
}

/**
 * Get material images for a style
 */
export async function getStyleMaterialImages(styleId: string) {
  return await prisma.styleImage.findMany({
    where: {
      styleId,
      imageCategory: 'MATERIAL'
    },
    orderBy: {
      displayOrder: 'asc'
    }
  })
}

/**
 * Delete material image
 */
export async function deleteMaterialImage(imageId: string) {
  await prisma.styleImage.delete({
    where: { id: imageId }
  })
}

/**
 * Update material image metadata
 */
export async function updateMaterialImage(
  imageId: string,
  updates: {
    description?: string
    tags?: string[]
    displayOrder?: number
  }
) {
  return await prisma.styleImage.update({
    where: { id: imageId },
    data: updates
  })
}
