/**
 * Phase 2: Texture Generator Module
 *
 * Generates and manages texture entities during style generation:
 * 1. Parse material guidance from AI content
 * 2. Find or create texture entities
 * 3. Generate texture images
 * 4. Link textures to styles
 */

import { PrismaClient } from '@prisma/client'
import { generateAndUploadImages } from '@/lib/ai/image-generation'

const prisma = new PrismaClient()

/**
 * Material keyword to texture category mapping
 */
const MATERIAL_TO_TEXTURE_CATEGORY: Record<string, string> = {
  // Wall finishes
  'paint': 'wall-finishes',
  'plaster': 'wall-finishes',
  'wallpaper': 'wall-finishes',
  'stucco': 'wall-finishes',

  // Wood
  'wood': 'wood-finishes',
  'oak': 'wood-finishes',
  'walnut': 'wood-finishes',
  'maple': 'wood-finishes',
  'teak': 'wood-finishes',
  'pine': 'wood-finishes',
  'mahogany': 'wood-finishes',
  'cherry': 'wood-finishes',
  'veneer': 'wood-finishes',

  // Metal
  'metal': 'metal-finishes',
  'steel': 'metal-finishes',
  'iron': 'metal-finishes',
  'brass': 'metal-finishes',
  'copper': 'metal-finishes',
  'bronze': 'metal-finishes',
  'aluminum': 'metal-finishes',
  'nickel': 'metal-finishes',
  'chrome': 'metal-finishes',

  // Fabric
  'fabric': 'fabric-textures',
  'cotton': 'fabric-textures',
  'linen': 'fabric-textures',
  'silk': 'fabric-textures',
  'velvet': 'fabric-textures',
  'leather': 'fabric-textures',
  'suede': 'fabric-textures',
  'wool': 'fabric-textures',

  // Stone
  'stone': 'stone-finishes',
  'marble': 'stone-finishes',
  'granite': 'stone-finishes',
  'limestone': 'stone-finishes',
  'travertine': 'stone-finishes',
  'concrete': 'stone-finishes',
  'terrazzo': 'stone-finishes',
}

/**
 * Finish keyword to texture finish type mapping
 */
const FINISH_KEYWORDS: Record<string, string> = {
  'matte': 'matte',
  'flat': 'matte',
  'glossy': 'glossy',
  'gloss': 'glossy',
  'shiny': 'glossy',
  'satin': 'satin',
  'semi-gloss': 'satin',
  'rough': 'rough',
  'textured': 'rough',
  'smooth': 'smooth',
  'polished': 'polished',
  'brushed': 'brushed',
  'natural': 'natural',
  'lacquered': 'lacquered',
  'oiled': 'oiled',
}

export interface ParsedMaterial {
  name: string
  categorySlug: string
  finish: string
  keywords: string[]
}

/**
 * Parse material guidance text to extract textures
 */
export function parseMaterialGuidance(
  materialGuidance: string,
  priceLevel: 'REGULAR' | 'LUXURY' = 'REGULAR'
): ParsedMaterial[] {
  const materials: ParsedMaterial[] = []

  // Split by common separators
  const items = materialGuidance
    .toLowerCase()
    .split(/[,;.\n]/)
    .map(s => s.trim())
    .filter(s => s.length > 3)

  for (const item of items) {
    // Try to match material keywords
    let categorySlug = 'wall-finishes' // default
    let materialName = ''

    for (const [keyword, category] of Object.entries(MATERIAL_TO_TEXTURE_CATEGORY)) {
      if (item.includes(keyword)) {
        categorySlug = category
        materialName = keyword
        break
      }
    }

    if (!materialName) continue // Skip if no material found

    // Try to match finish keywords
    let finish = 'natural' // default
    for (const [keyword, finishType] of Object.entries(FINISH_KEYWORDS)) {
      if (item.includes(keyword)) {
        finish = finishType
        break
      }
    }

    // Extract additional keywords (adjectives)
    const keywords = item.split(/\s+/).filter(word =>
      word.length > 3 &&
      !MATERIAL_TO_TEXTURE_CATEGORY[word] &&
      !FINISH_KEYWORDS[word]
    )

    materials.push({
      name: materialName.charAt(0).toUpperCase() + materialName.slice(1),
      categorySlug,
      finish,
      keywords: [priceLevel, ...keywords],
    })
  }

  return materials
}

/**
 * Find or create a texture entity
 */
export async function findOrCreateTexture(
  material: ParsedMaterial,
  priceLevel: 'REGULAR' | 'LUXURY',
  options: {
    organizationId?: string
    generateImage?: boolean
  } = {}
): Promise<string> {
  try {
    // Find texture category
    const category = await prisma.textureCategory.findUnique({
      where: { slug: material.categorySlug }
    })

    if (!category) {
      console.error(`❌ Texture category not found: ${material.categorySlug}`)
      throw new Error(`Texture category not found: ${material.categorySlug}`)
    }

    // Try to find existing texture
    const existing = await prisma.texture.findFirst({
      where: {
        name: {
          path: ['en'],
          equals: material.name
        },
        categoryId: category.id,
        finish: material.finish,
        organizationId: options.organizationId || null,
      }
    })

    if (existing) {
      console.log(`   ♻️  Reusing existing texture: ${material.name} (${material.finish})`)
      return existing.id
    }

    // Create new texture
    console.log(`   ✨ Creating new texture: ${material.name} (${material.finish})`)

    let imageUrl: string | undefined

    // Generate image if requested
    if (options.generateImage) {
      try {
        console.log(`   🎨 Generating texture image...`)
        const images = await generateAndUploadImages({
          entityType: 'texture',
          entityName: {
            he: material.name, // TODO: Add Hebrew translation
            en: material.name
          },
          priceLevel,
          numberOfImages: 1,
          finish: material.finish,
        } as any)

        if (images.length > 0) {
          imageUrl = images[0]
          console.log(`   ✅ Texture image generated: ${imageUrl}`)
        }
      } catch (error) {
        console.error(`   ⚠️  Failed to generate texture image:`, error)
        // Continue without image
      }
    }

    // Create texture entity
    const texture = await prisma.texture.create({
      data: {
        organizationId: options.organizationId || null,
        name: {
          he: material.name, // TODO: Add proper Hebrew translation
          en: material.name
        },
        categoryId: category.id,
        finish: material.finish,
        isAbstract: false,
        imageUrl,
        tags: material.keywords,
        usage: 0,
      }
    })

    console.log(`   ✅ Created texture: ${texture.id}`)
    return texture.id

  } catch (error) {
    console.error(`❌ Error creating texture:`, error)
    throw error
  }
}

/**
 * Generate textures for a style based on material guidance
 */
export async function generateTexturesForStyle(
  styleId: string,
  materialGuidance: string,
  priceLevel: 'REGULAR' | 'LUXURY',
  options: {
    organizationId?: string
    maxTextures?: number
    generateImages?: boolean
  } = {}
): Promise<string[]> {
  const maxTextures = options.maxTextures || 5
  const textureIds: string[] = []

  console.log(`\n🧱 Generating textures for style ${styleId}...`)
  console.log(`   Material Guidance: ${materialGuidance.substring(0, 100)}...`)
  console.log(`   Price Level: ${priceLevel}`)

  // Parse material guidance
  const parsedMaterials = parseMaterialGuidance(materialGuidance, priceLevel)
  console.log(`   📝 Parsed ${parsedMaterials.length} materials`)

  // Limit to maxTextures
  const materialsToCreate = parsedMaterials.slice(0, maxTextures)

  // Find or create textures
  for (const material of materialsToCreate) {
    try {
      const textureId = await findOrCreateTexture(material, priceLevel, {
        organizationId: options.organizationId,
        generateImage: options.generateImages,
      })

      textureIds.push(textureId)

      // Create link between style and texture
      const existing = await prisma.styleTexture.findFirst({
        where: {
          styleId,
          textureId,
        }
      })

      if (!existing) {
        await prisma.styleTexture.create({
          data: {
            styleId,
            textureId,
          }
        })
        console.log(`   🔗 Linked texture ${textureId} to style ${styleId}`)
      }

      // Increment usage count
      await prisma.texture.update({
        where: { id: textureId },
        data: {
          usage: { increment: 1 }
        }
      })

      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000))

    } catch (error) {
      console.error(`   ⚠️  Failed to create/link texture:`, error)
      // Continue with next material
    }
  }

  console.log(`   ✅ Generated ${textureIds.length} textures`)
  return textureIds
}

/**
 * Get linked textures for a style
 */
export async function getStyleTextures(styleId: string) {
  return await prisma.styleTexture.findMany({
    where: { styleId },
    include: {
      texture: {
        include: {
          category: true,
        }
      }
    }
  })
}

/**
 * Unlink texture from style
 */
export async function unlinkTextureFromStyle(styleId: string, textureId: string) {
  await prisma.styleTexture.deleteMany({
    where: {
      styleId,
      textureId,
    }
  })

  // Decrement usage count
  await prisma.texture.update({
    where: { id: textureId },
    data: {
      usage: { decrement: 1 }
    }
  })
}
