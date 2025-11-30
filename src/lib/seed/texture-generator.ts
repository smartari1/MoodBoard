/**
 * @deprecated This module is deprecated. Use the E2E Texture Sub-Agent instead.
 *
 * Import from:
 *   import { processStyleTextures } from '@/lib/ai'
 *
 * The new sub-agent consolidates all texture operations:
 * - Material guidance parsing
 * - Context loading with caching
 * - Heuristic + AI semantic matching
 * - Texture entity creation
 * - Image generation
 * - StyleTexture linking
 * - Progress reporting and error tracking
 *
 * See: src/lib/ai/sub-agents/texture-sub-agent.ts
 *
 * ============================================================================
 * LEGACY CODE BELOW - Kept for reference only
 * ============================================================================
 *
 * Phase 2: Texture Generator Module (DEPRECATED)
 *
 * Generates and manages texture entities during style generation:
 * 1. Parse material guidance from AI content
 * 2. Find or create texture entities with AI-powered matching
 * 3. Generate texture images
 * 4. Link textures to styles
 *
 * Enhanced with AI Sub-Agent:
 * - Semantic texture name matching (e.g., "Brushed Oak" → "Oak")
 * - Cross-language support (Hebrew ↔ English)
 * - Automatic category inference
 */

import { PrismaClient } from '@prisma/client'
import {
  generateAndUploadImages,
  smartMatchTexture,
  heuristicTextureMatch,
  TEXTURE_MATCH_CONFIG,
  type AvailableTextureForMatch,
  type AvailableCategoryForTexture,
  type TextureMatchContext,
} from '@/lib/ai'
import { getMaterialNameHebrew } from './material-generator'

const prisma = new PrismaClient()

// =============================================================================
// Context Cache for AI Matching
// =============================================================================

interface TextureMatchContextCache {
  textures: AvailableTextureForMatch[]
  categories: AvailableCategoryForTexture[]
  timestamp: number
}

let textureMatchContextCache: TextureMatchContextCache | null = null
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Get texture match context (cached for performance)
 */
async function getTextureMatchContext(): Promise<Omit<TextureMatchContext, 'texturesToMatch' | 'styleContext' | 'priceLevel'>> {
  const now = Date.now()

  // Check if cache is valid
  if (textureMatchContextCache && (now - textureMatchContextCache.timestamp) < CACHE_TTL_MS) {
    return {
      availableTextures: textureMatchContextCache.textures,
      availableCategories: textureMatchContextCache.categories,
    }
  }

  console.log('   [Texture Context] Loading fresh context from database...')

  // Fetch all textures with their category info
  const textures = await prisma.texture.findMany({
    select: {
      id: true,
      name: true,
      finish: true,
      sheen: true,
      materialCategories: {
        include: {
          materialCategory: {
            select: {
              slug: true,
              name: true,
            }
          }
        }
      }
    },
    take: 200, // Limit for performance
  })

  // Fetch all material categories
  const categories = await prisma.materialCategory.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
    }
  })

  // Format for AI context
  const formattedTextures: AvailableTextureForMatch[] = textures.map(t => ({
    id: t.id,
    name: t.name as { he: string; en: string },
    finish: t.finish || undefined,
    sheen: t.sheen || undefined,
    categorySlug: t.materialCategories[0]?.materialCategory?.slug,
    categoryName: t.materialCategories[0]?.materialCategory?.name as { he: string; en: string } | undefined,
  }))

  const formattedCategories: AvailableCategoryForTexture[] = categories.map(c => ({
    id: c.id,
    name: c.name as { he: string; en: string },
    slug: c.slug,
  }))

  // Update cache
  textureMatchContextCache = {
    textures: formattedTextures,
    categories: formattedCategories,
    timestamp: now,
  }

  console.log(`   [Texture Context] Loaded ${formattedTextures.length} textures, ${formattedCategories.length} categories`)

  return {
    availableTextures: formattedTextures,
    availableCategories: formattedCategories,
  }
}

/**
 * Clear texture match context cache
 * Call this when textures or categories are modified
 */
export function clearTextureMatchContextCache(): void {
  textureMatchContextCache = null
  console.log('   [Texture Context] Cache cleared')
}

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
 * Enhanced with AI-powered semantic matching:
 * 1. Exact match by name (free)
 * 2. Heuristic pre-filter (free) - catches obvious matches
 * 3. AI semantic match - handles variants and cross-language
 * 4. Create new texture with AI-inferred properties + image
 */
export async function findOrCreateTexture(
  material: ParsedMaterial,
  priceLevel: 'REGULAR' | 'LUXURY',
  options: {
    organizationId?: string
    generateImage?: boolean
    styleContext?: string
  } = {}
): Promise<string> {
  try {
    // =========================================================================
    // Step 1: Exact match by name (FREE)
    // =========================================================================
    const existing = await prisma.texture.findFirst({
      where: {
        OR: [
          { name: { is: { en: material.name } } },
          { name: { is: { he: material.name } } },
        ]
      }
    })

    if (existing) {
      console.log(`   ♻️  Exact match found: ${material.name} (ID: ${existing.id})`)
      return existing.id
    }

    // =========================================================================
    // Step 2: Heuristic Pre-filter (FREE - no AI call)
    // =========================================================================
    const context = await getTextureMatchContext()
    const heuristic = heuristicTextureMatch(material.name, context.availableTextures)

    if (heuristic.matched && heuristic.confidence >= TEXTURE_MATCH_CONFIG.CONFIDENCE_THRESHOLD_HEURISTIC) {
      console.log(`   ♻️  Heuristic match: "${material.name}" → ${heuristic.textureId} (${(heuristic.confidence * 100).toFixed(0)}% confidence)`)
      return heuristic.textureId!
    }

    // =========================================================================
    // Step 3: AI Semantic Match (GEMINI_FLASH_LITE)
    // =========================================================================
    console.log(`   🤖 Using AI to match texture: "${material.name}"`)
    const match = await smartMatchTexture(material.name, {
      availableTextures: context.availableTextures,
      availableCategories: context.availableCategories,
      styleContext: options.styleContext,
      priceLevel,
    })

    // If AI found a match, use it
    if (match.action === 'link' && match.matchedTextureId) {
      console.log(`   ♻️  AI linked: "${material.name}" → ${match.matchedTextureId} (${(match.confidence * 100).toFixed(0)}% confidence)`)
      console.log(`      Reason: ${match.reasoning}`)
      return match.matchedTextureId
    }

    // =========================================================================
    // Step 4: Create new texture with AI-inferred properties
    // =========================================================================
    if (match.action !== 'create' || !match.newTexture) {
      // Fallback: create with parsed material properties
      console.log(`   ⚠️  AI match unclear, using fallback creation for: ${material.name}`)
      return await createTextureWithFallback(material, priceLevel, options)
    }

    console.log(`   ✨ AI creating new texture: ${match.newTexture.name.en} (${match.newTexture.finish || material.finish})`)
    console.log(`      Reason: ${match.reasoning}`)

    // Generate image if requested (BEFORE creating entity)
    let imageUrl: string | undefined
    if (options.generateImage) {
      try {
        console.log(`   🎨 Generating texture image...`)
        const images = await generateAndUploadImages({
          entityType: 'texture',
          entityName: match.newTexture.name,
          priceLevel,
          numberOfImages: 1,
          finish: match.newTexture.finish || material.finish,
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

    // Create texture entity with AI-inferred properties
    const texture = await prisma.texture.create({
      data: {
        organizationId: options.organizationId || null,
        name: match.newTexture.name,  // Bilingual from AI
        finish: match.newTexture.finish || material.finish,
        sheen: match.newTexture.sheen || undefined,
        baseColor: match.newTexture.baseColor || undefined,
        isAbstract: true,  // Mark as AI-generated
        generationStatus: 'COMPLETED',
        aiDescription: `AI-generated texture for ${match.newTexture.name.en}`,
        imageUrl,
        tags: material.keywords,
        usage: 0,
      }
    })

    // Link texture to MaterialCategory via join table
    if (match.newTexture.categoryId) {
      await prisma.textureMaterialCategory.create({
        data: {
          textureId: texture.id,
          materialCategoryId: match.newTexture.categoryId,
        }
      })
      console.log(`   🔗 Linked texture to category: ${match.newTexture.categoryId}`)
    }

    // Clear cache since we added a new texture
    clearTextureMatchContextCache()

    console.log(`   ✅ Created texture: ${texture.id}`)
    return texture.id

  } catch (error) {
    console.error(`❌ Error in findOrCreateTexture:`, error)
    throw error
  }
}

/**
 * Fallback creation when AI match is unclear
 * Uses keyword-based inference (original logic)
 */
async function createTextureWithFallback(
  material: ParsedMaterial,
  priceLevel: 'REGULAR' | 'LUXURY',
  options: {
    organizationId?: string
    generateImage?: boolean
  } = {}
): Promise<string> {
  // Find material category by slug
  const materialCategory = await prisma.materialCategory.findFirst({
    where: { slug: material.categorySlug }
  })

  // Get default category if specific one not found
  const defaultCategory = materialCategory || await prisma.materialCategory.findFirst()

  if (!defaultCategory) {
    console.error(`❌ No material categories exist in database`)
    throw new Error(`No material categories exist in database`)
  }

  let imageUrl: string | undefined

  // Generate image if requested
  if (options.generateImage) {
    try {
      console.log(`   🎨 Generating texture image (fallback)...`)
      const images = await generateAndUploadImages({
        entityType: 'texture',
        entityName: {
          he: getMaterialNameHebrew(material.name),
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
    }
  }

  // Create texture entity
  const nameHe = getMaterialNameHebrew(material.name)
  const texture = await prisma.texture.create({
    data: {
      organizationId: options.organizationId || null,
      name: {
        he: nameHe,
        en: material.name
      },
      finish: material.finish,
      isAbstract: true,
      generationStatus: 'COMPLETED',
      aiDescription: `AI-generated texture for ${material.name}`,
      imageUrl,
      tags: material.keywords,
      usage: 0,
    }
  })

  // Link texture to MaterialCategory via join table
  await prisma.textureMaterialCategory.create({
    data: {
      textureId: texture.id,
      materialCategoryId: defaultCategory.id,
    }
  })

  // Clear cache since we added a new texture
  clearTextureMatchContextCache()

  console.log(`   ✅ Created texture (fallback): ${texture.id} (linked to category: ${defaultCategory.slug || defaultCategory.id})`)
  return texture.id
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
          materialCategories: {
            include: {
              materialCategory: true,
            }
          }
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
