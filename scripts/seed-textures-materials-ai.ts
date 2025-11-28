/**
 * AI Seed Script: Generate Textures and Material Images
 *
 * This script uses Gemini AI to generate:
 * 1. Textures for styles based on materialGuidance
 * 2. Material thumbnail images
 * 3. Links materials to matching textures
 *
 * Run with: npx tsx scripts/seed-textures-materials-ai.ts
 */

import { PrismaClient } from '@prisma/client'
import { generateTexturesForStyle } from '../src/lib/seed/texture-generator'
import { generateAndUploadImages } from '../src/lib/ai'

const prisma = new PrismaClient()

// Configuration
const CONFIG = {
  maxTexturesPerStyle: 8,
  maxMaterialsToProcess: 30,
  generateImages: true,
  delayBetweenGenerations: 3000, // 3 seconds
}

async function generateTexturesForStyles() {
  console.log('\n' + '='.repeat(60))
  console.log('🧱 PHASE 1: Generating Textures for Styles')
  console.log('='.repeat(60))

  // Get styles with materialGuidance
  const styles = await prisma.style.findMany({
    select: {
      id: true,
      name: true,
      priceLevel: true,
      detailedContent: true,
      textureLinks: { select: { id: true } }
    }
  })

  let texturesGenerated = 0

  for (const style of styles) {
    const detailedContent = style.detailedContent as any
    const materialGuidance = detailedContent?.en?.materialGuidance

    if (!materialGuidance) {
      console.log(`⏭️  Skipping "${style.name?.en}" - no materialGuidance`)
      continue
    }

    // Skip if already has textures
    if (style.textureLinks.length > 0) {
      console.log(`⏭️  Skipping "${style.name?.en}" - already has ${style.textureLinks.length} textures`)
      continue
    }

    console.log(`\n📦 Processing: ${style.name?.en}`)
    console.log(`   Price Level: ${style.priceLevel}`)
    console.log(`   Material Guidance: ${materialGuidance.substring(0, 100)}...`)

    try {
      const textureIds = await generateTexturesForStyle(
        style.id,
        materialGuidance,
        style.priceLevel as 'REGULAR' | 'LUXURY',
        {
          maxTextures: CONFIG.maxTexturesPerStyle,
          generateImages: CONFIG.generateImages,
        }
      )

      texturesGenerated += textureIds.length
      console.log(`   ✅ Generated ${textureIds.length} textures`)

      // Delay between styles
      await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenGenerations))
    } catch (error) {
      console.error(`   ❌ Error generating textures:`, error)
    }
  }

  console.log(`\n📊 Textures Generated: ${texturesGenerated}`)
  return texturesGenerated
}

async function generateMaterialImages() {
  console.log('\n' + '='.repeat(60))
  console.log('🎨 PHASE 2: Generating Material Images')
  console.log('='.repeat(60))

  // Get abstract materials (AI-generated) and filter those without thumbnails
  const allMaterials = await prisma.material.findMany({
    where: {
      isAbstract: true,
    },
    select: {
      id: true,
      name: true,
      isAbstract: true,
      assets: true,
      category: { select: { name: true } }
    },
  })

  // Filter materials without thumbnails in JS
  const materials = allMaterials.filter(m => {
    const assets = m.assets as any
    return !assets?.thumbnail || assets.thumbnail === ''
  }).slice(0, CONFIG.maxMaterialsToProcess)

  console.log(`\nMaterials without thumbnails: ${materials.length}`)

  let imagesGenerated = 0

  for (const material of materials) {
    const materialName = (material.name as any)?.en || 'Unknown Material'
    const categoryName = (material.category?.name as any)?.en || 'Material'

    console.log(`\n🖼️  Generating image for: ${materialName}`)
    console.log(`   Category: ${categoryName}`)
    console.log(`   isAbstract: ${material.isAbstract}`)

    try {
      const images = await generateAndUploadImages({
        entityType: 'material',
        entityName: material.name as { he: string; en: string },
        description: {
          he: `חומר: ${materialName}`,
          en: `Material: ${materialName} - ${categoryName}`
        },
        priceLevel: 'REGULAR',
        numberOfImages: 1,
        aspectRatio: '1:1',
      })

      if (images.length > 0) {
        // Update material with new image
        const currentAssets = (material.assets as any) || {}
        await prisma.material.update({
          where: { id: material.id },
          data: {
            assets: {
              ...currentAssets,
              thumbnail: images[0],
              images: [images[0], ...(currentAssets.images || [])]
            }
          }
        })

        imagesGenerated++
        console.log(`   ✅ Image generated and saved`)
      }

      // Delay between generations
      await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenGenerations))
    } catch (error) {
      console.error(`   ❌ Error generating image:`, error)
    }
  }

  console.log(`\n📊 Material Images Generated: ${imagesGenerated}`)
  return imagesGenerated
}

async function linkMaterialsToTextures() {
  console.log('\n' + '='.repeat(60))
  console.log('🔗 PHASE 3: Linking Materials to Textures')
  console.log('='.repeat(60))

  // Get materials without texture links
  const materials = await prisma.material.findMany({
    where: { textureId: null },
    select: {
      id: true,
      name: true,
    }
  })

  // Get all textures for matching
  const allTextures = await prisma.texture.findMany({
    select: {
      id: true,
      name: true,
    }
  })

  console.log(`\nMaterials without texture links: ${materials.length}`)
  console.log(`Available textures: ${allTextures.length}`)

  let linked = 0

  for (const material of materials) {
    const materialName = ((material.name as any)?.en || '').toLowerCase()
    const materialNameHe = ((material.name as any)?.he || '').toLowerCase()

    // Find matching texture by name (case-insensitive contains)
    const matchingTexture = allTextures.find(t => {
      const textureName = ((t.name as any)?.en || '').toLowerCase()
      const textureNameHe = ((t.name as any)?.he || '').toLowerCase()
      return (
        materialName.includes(textureName) ||
        textureName.includes(materialName) ||
        materialNameHe.includes(textureNameHe) ||
        textureNameHe.includes(materialNameHe)
      )
    })

    if (matchingTexture) {
      await prisma.material.update({
        where: { id: material.id },
        data: { textureId: matchingTexture.id }
      })
      linked++
      console.log(`   🔗 Linked "${materialName}" to texture "${(matchingTexture.name as any)?.en}"`)
    }
  }

  console.log(`\n📊 Materials Linked to Textures: ${linked}`)
  return linked
}

async function printSummary() {
  console.log('\n' + '='.repeat(60))
  console.log('📈 FINAL DATABASE STATS')
  console.log('='.repeat(60))

  // Get all materials to count those with images
  const allMaterials = await prisma.material.findMany({
    select: { assets: true }
  })
  const materialsWithImage = allMaterials.filter(m => {
    const assets = m.assets as any
    return assets?.thumbnail && assets.thumbnail !== ''
  }).length

  const stats = {
    textures: await prisma.texture.count(),
    styleTextures: await prisma.styleTexture.count(),
    materials: await prisma.material.count(),
    abstractMaterials: await prisma.material.count({ where: { isAbstract: true } }),
    styleMaterials: await prisma.styleMaterial.count(),
    materialsWithTexture: await prisma.material.count({ where: { textureId: { not: null } } }),
    materialsWithImage,
  }

  console.log(`
   Textures:                ${stats.textures}
   StyleTexture links:      ${stats.styleTextures}
   Materials (total):       ${stats.materials}
   Materials (abstract):    ${stats.abstractMaterials}
   StyleMaterial links:     ${stats.styleMaterials}
   Materials with texture:  ${stats.materialsWithTexture}
   Materials with image:    ${stats.materialsWithImage}
  `)
}

async function main() {
  console.log('🚀 AI Seed Script Starting...')
  console.log(`   Config:`)
  console.log(`   - Max textures per style: ${CONFIG.maxTexturesPerStyle}`)
  console.log(`   - Max materials to process: ${CONFIG.maxMaterialsToProcess}`)
  console.log(`   - Generate images: ${CONFIG.generateImages}`)
  console.log(`   - Delay between generations: ${CONFIG.delayBetweenGenerations}ms`)

  try {
    // Phase 1: Generate textures
    await generateTexturesForStyles()

    // Phase 2: Generate material images
    await generateMaterialImages()

    // Phase 3: Link materials to textures
    await linkMaterialsToTextures()

    // Print summary
    await printSummary()

    console.log('\n✅ AI Seed Script Complete!')
  } catch (error) {
    console.error('\n❌ Script failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
