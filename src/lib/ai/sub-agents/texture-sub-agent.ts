/**
 * E2E Texture Sub-Agent
 *
 * Single entry point for all texture operations during style generation:
 * 1. Parse material guidance for texture keywords
 * 2. Load context (textures, categories) - cached
 * 3. For each texture:
 *    - Heuristic match → AI semantic match → Create new
 *    - Generate image if new entity created
 *    - Create StyleTexture link
 * 4. Return unified result with stats
 */

import { PrismaClient } from '@prisma/client'
import pLimit from 'p-limit'
import {
  generateAndUploadImages,
  smartMatchTexture,
  heuristicTextureMatch,
  TEXTURE_MATCH_CONFIG,
  type AvailableTextureForMatch,
  type AvailableCategoryForTexture,
} from '@/lib/ai'

const prisma = new PrismaClient()

// =============================================================================
// Configuration
// =============================================================================

const CONCURRENCY_LIMIT = 5 // Parallel processing limit
const CONTEXT_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// =============================================================================
// Types
// =============================================================================

export interface TextureSubAgentOptions {
  styleId: string
  styleName: { he: string; en: string }
  materialGuidance: string
  priceLevel: 'REGULAR' | 'LUXURY'
  generateImages?: boolean
  maxTextures?: number
  styleContext?: string
  onProgress?: (message: string) => void
}

export interface TextureSubAgentResult {
  success: boolean
  textureIds: string[]
  stats: {
    matched: number
    created: number
    images: number
    errors: number
  }
  errors: Array<{ texture: string; error: string }>
}

// =============================================================================
// Context Cache
// =============================================================================

interface TextureMatchContextCache {
  textures: AvailableTextureForMatch[]
  categories: AvailableCategoryForTexture[]
  loadedAt: number
}

let contextCache: TextureMatchContextCache | null = null

/**
 * Load or get cached context for AI texture matching
 */
async function getMatchContext(): Promise<{
  availableTextures: AvailableTextureForMatch[]
  availableCategories: AvailableCategoryForTexture[]
}> {
  // Check if cache is still valid
  if (contextCache && Date.now() - contextCache.loadedAt < CONTEXT_CACHE_TTL) {
    return {
      availableTextures: contextCache.textures,
      availableCategories: contextCache.categories,
    }
  }

  console.log('   [Texture Sub-Agent] Loading context from database...')

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
            },
          },
        },
      },
    },
    take: 200,
  })

  // Fetch all material categories
  const categories = await prisma.materialCategory.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
    },
  })

  // Format for AI context
  const availableTextures: AvailableTextureForMatch[] = textures.map((t) => ({
    id: t.id,
    name: t.name as { he: string; en: string },
    finish: t.finish || undefined,
    sheen: t.sheen || undefined,
    categorySlug: t.materialCategories[0]?.materialCategory?.slug,
    categoryName: t.materialCategories[0]?.materialCategory?.name as
      | { he: string; en: string }
      | undefined,
  }))

  const availableCategories: AvailableCategoryForTexture[] = categories.map((c) => ({
    id: c.id,
    name: c.name as { he: string; en: string },
    slug: c.slug,
  }))

  // Update cache
  contextCache = {
    textures: availableTextures,
    categories: availableCategories,
    loadedAt: Date.now(),
  }

  console.log(
    `   [Texture Sub-Agent] Loaded: ${availableTextures.length} textures, ${availableCategories.length} categories`
  )

  return { availableTextures, availableCategories }
}

/**
 * Clear context cache
 */
export function clearTextureSubAgentCache(): void {
  contextCache = null
  console.log('   [Texture Sub-Agent] Cache cleared')
}

// =============================================================================
// Material Name Translations (reused from material sub-agent)
// =============================================================================

const MATERIAL_TRANSLATIONS: Record<string, string> = {
  wood: 'עץ',
  oak: 'אלון',
  walnut: 'אגוז',
  maple: 'מייפל',
  teak: 'טיק',
  pine: 'אורן',
  mahogany: 'מהגוני',
  metal: 'מתכת',
  steel: 'פלדה',
  iron: 'ברזל',
  brass: 'פליז',
  copper: 'נחושת',
  bronze: 'ארד',
  stone: 'אבן',
  marble: 'שיש',
  granite: 'גרניט',
  limestone: 'אבן גיר',
  concrete: 'בטון',
  fabric: 'בד',
  cotton: 'כותנה',
  linen: 'פשתן',
  silk: 'משי',
  velvet: 'קטיפה',
  leather: 'עור',
  wool: 'צמר',
  paint: 'צבע',
  plaster: 'טיח',
  wallpaper: 'טפט',
  ceramic: 'קרמיקה',
  porcelain: 'פורצלן',
  glass: 'זכוכית',
}

function getMaterialNameHebrew(englishName: string): string {
  const nameLower = englishName.toLowerCase().trim()

  if (MATERIAL_TRANSLATIONS[nameLower]) {
    return MATERIAL_TRANSLATIONS[nameLower]
  }

  for (const [en, he] of Object.entries(MATERIAL_TRANSLATIONS)) {
    if (nameLower.includes(en) || en.includes(nameLower)) {
      return he
    }
  }

  return englishName
}

// =============================================================================
// Parsing & Category Inference
// =============================================================================

const MATERIAL_TO_TEXTURE_CATEGORY: Record<string, string> = {
  // Wall finishes
  paint: 'wall-finishes',
  plaster: 'wall-finishes',
  wallpaper: 'wall-finishes',
  stucco: 'wall-finishes',
  // Wood
  wood: 'wood-finishes',
  oak: 'wood-finishes',
  walnut: 'wood-finishes',
  maple: 'wood-finishes',
  teak: 'wood-finishes',
  pine: 'wood-finishes',
  mahogany: 'wood-finishes',
  cherry: 'wood-finishes',
  veneer: 'wood-finishes',
  // Metal
  metal: 'metal-finishes',
  steel: 'metal-finishes',
  iron: 'metal-finishes',
  brass: 'metal-finishes',
  copper: 'metal-finishes',
  bronze: 'metal-finishes',
  aluminum: 'metal-finishes',
  nickel: 'metal-finishes',
  chrome: 'metal-finishes',
  // Fabric
  fabric: 'fabric-textures',
  cotton: 'fabric-textures',
  linen: 'fabric-textures',
  silk: 'fabric-textures',
  velvet: 'fabric-textures',
  leather: 'fabric-textures',
  suede: 'fabric-textures',
  wool: 'fabric-textures',
  // Stone
  stone: 'stone-finishes',
  marble: 'stone-finishes',
  granite: 'stone-finishes',
  limestone: 'stone-finishes',
  travertine: 'stone-finishes',
  concrete: 'stone-finishes',
  terrazzo: 'stone-finishes',
}

const FINISH_KEYWORDS: Record<string, string> = {
  matte: 'matte',
  flat: 'matte',
  glossy: 'glossy',
  gloss: 'glossy',
  shiny: 'glossy',
  satin: 'satin',
  'semi-gloss': 'satin',
  rough: 'rough',
  textured: 'rough',
  smooth: 'smooth',
  polished: 'polished',
  brushed: 'brushed',
  natural: 'natural',
  lacquered: 'lacquered',
  oiled: 'oiled',
}

interface ParsedTexture {
  name: string
  categorySlug: string
  finish: string
  keywords: string[]
}

/**
 * Parse material guidance text to extract textures
 */
function parseMaterialGuidance(
  materialGuidance: string,
  priceLevel: 'REGULAR' | 'LUXURY'
): ParsedTexture[] {
  const textures: ParsedTexture[] = []

  // Split by common separators
  const items = materialGuidance
    .toLowerCase()
    .split(/[,;.\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 3)

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

    // Extract additional keywords
    const keywords = item.split(/\s+/).filter(
      (word) =>
        word.length > 3 &&
        !MATERIAL_TO_TEXTURE_CATEGORY[word] &&
        !FINISH_KEYWORDS[word]
    )

    textures.push({
      name: materialName.charAt(0).toUpperCase() + materialName.slice(1),
      categorySlug,
      finish,
      keywords: [priceLevel, ...keywords],
    })
  }

  // Remove duplicates by name
  const uniqueTextures = textures.filter(
    (t, index, self) => index === self.findIndex((x) => x.name === t.name)
  )

  return uniqueTextures
}

// =============================================================================
// Core Functions
// =============================================================================

/**
 * Generate texture image
 */
async function generateTextureImage(
  name: { he: string; en: string },
  priceLevel: 'REGULAR' | 'LUXURY',
  finish?: string
): Promise<string | undefined> {
  try {
    console.log(`      🎨 Generating image for ${name.en}...`)
    const images = await generateAndUploadImages({
      entityType: 'texture',
      entityName: name,
      priceLevel,
      numberOfImages: 1,
      finish,
    } as any)

    if (images.length > 0) {
      console.log(`      ✅ Image generated`)
      return images[0]
    }
  } catch (error) {
    console.error(`      ⚠️  Failed to generate image:`, error)
  }
  return undefined
}

/**
 * Create StyleTexture link if doesn't exist
 */
async function linkTextureToStyle(textureId: string, styleId: string): Promise<void> {
  const existingLink = await prisma.styleTexture.findFirst({
    where: { styleId, textureId },
  })

  if (!existingLink) {
    await prisma.styleTexture.create({
      data: { styleId, textureId },
    })
    console.log(`      🔗 Linked to style`)
  }

  // Increment usage count
  await prisma.texture.update({
    where: { id: textureId },
    data: { usage: { increment: 1 } },
  })
}

/**
 * Process a single texture: match → create if needed → link → image
 */
async function processSingleTexture(
  parsedTexture: ParsedTexture,
  styleId: string,
  priceLevel: 'REGULAR' | 'LUXURY',
  generateImages: boolean,
  context: Awaited<ReturnType<typeof getMatchContext>>,
  styleContext?: string
): Promise<{
  textureId: string | null
  matched: boolean
  created: boolean
  imageGenerated: boolean
  error?: string
}> {
  try {
    const { name: textureName, categorySlug, finish, keywords } = parsedTexture
    const nameHe = getMaterialNameHebrew(textureName)

    // Step 1: Try exact DB match
    const existing = await prisma.texture.findFirst({
      where: {
        OR: [{ name: { is: { en: textureName } } }, { name: { is: { he: nameHe } } }],
      },
    })

    if (existing) {
      console.log(`   ♻️  Exact match: ${textureName}`)
      await linkTextureToStyle(existing.id, styleId)
      return { textureId: existing.id, matched: true, created: false, imageGenerated: false }
    }

    // Step 2: Try heuristic match (free)
    const heuristic = heuristicTextureMatch(textureName, context.availableTextures)
    if (
      heuristic.matched &&
      heuristic.confidence >= TEXTURE_MATCH_CONFIG.CONFIDENCE_THRESHOLD_HEURISTIC
    ) {
      console.log(`   ♻️  Heuristic match: ${textureName} → ${heuristic.textureId}`)
      await linkTextureToStyle(heuristic.textureId!, styleId)
      return {
        textureId: heuristic.textureId!,
        matched: true,
        created: false,
        imageGenerated: false,
      }
    }

    // Step 3: Try AI semantic match
    const match = await smartMatchTexture(textureName, {
      availableTextures: context.availableTextures,
      availableCategories: context.availableCategories,
      styleContext,
      priceLevel,
    })

    if (match.action === 'link' && match.matchedTextureId) {
      console.log(`   🤖 AI matched: ${textureName} → ${match.matchedTextureId}`)
      await linkTextureToStyle(match.matchedTextureId, styleId)
      return {
        textureId: match.matchedTextureId,
        matched: true,
        created: false,
        imageGenerated: false,
      }
    }

    // Step 4: Create new texture
    console.log(`   ✨ Creating new texture: ${textureName}`)

    let imageUrl: string | undefined
    let imageGenerated = false

    // Get AI-inferred properties or use fallback
    const newTextureName = match.newTexture?.name || { he: nameHe, en: textureName }
    const newTextureFinish = match.newTexture?.finish || finish
    const newTextureCategoryId = match.newTexture?.categoryId

    // Generate image if requested
    if (generateImages) {
      imageUrl = await generateTextureImage(newTextureName, priceLevel, newTextureFinish)
      imageGenerated = !!imageUrl
    }

    // Find category
    const materialCategory = await prisma.materialCategory.findFirst({
      where: { slug: categorySlug },
    })
    const defaultCategory = materialCategory || (await prisma.materialCategory.findFirst())

    if (!defaultCategory) {
      throw new Error('No material categories exist in database')
    }

    // Create texture entity
    const texture = await prisma.texture.create({
      data: {
        organizationId: null,
        name: newTextureName,
        finish: newTextureFinish,
        sheen: match.newTexture?.sheen || undefined,
        baseColor: match.newTexture?.baseColor || undefined,
        isAbstract: true,
        generationStatus: 'COMPLETED',
        aiDescription: `AI-generated texture for ${newTextureName.en}. ${match.reasoning}`,
        imageUrl,
        tags: keywords,
        usage: 0,
      },
    })

    console.log(`   ✅ Created texture: ${texture.id}`)

    // Link texture to MaterialCategory
    const categoryIdToLink = newTextureCategoryId || defaultCategory.id
    await prisma.textureMaterialCategory.create({
      data: {
        textureId: texture.id,
        materialCategoryId: categoryIdToLink,
      },
    })

    // Link to style
    await linkTextureToStyle(texture.id, styleId)

    // Note: Don't clear cache here - will be done once at the end of batch processing

    return { textureId: texture.id, matched: false, created: true, imageGenerated }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`   ❌ Error processing ${parsedTexture.name}: ${errorMsg}`)
    return {
      textureId: null,
      matched: false,
      created: false,
      imageGenerated: false,
      error: errorMsg,
    }
  }
}

// =============================================================================
// Main Entry Point
// =============================================================================

/**
 * Process all textures for a style
 *
 * @param options - Configuration options
 * @returns Result with texture IDs and stats
 */
export async function processStyleTextures(
  options: TextureSubAgentOptions
): Promise<TextureSubAgentResult> {
  const {
    styleId,
    styleName,
    materialGuidance,
    priceLevel,
    generateImages = true,
    maxTextures = 5,
    styleContext,
    onProgress,
  } = options

  const result: TextureSubAgentResult = {
    success: true,
    textureIds: [],
    stats: {
      matched: 0,
      created: 0,
      images: 0,
      errors: 0,
    },
    errors: [],
  }

  if (!materialGuidance || materialGuidance.trim().length === 0) {
    console.log(`   [Texture Sub-Agent] No material guidance provided`)
    return result
  }

  console.log(`\n${'='.repeat(60)}`)
  console.log(`Texture Sub-Agent: ${styleName.en}`)
  console.log(`Material Guidance: ${materialGuidance.substring(0, 100)}...`)
  console.log(`Price Level: ${priceLevel}`)
  console.log(`Concurrency: ${CONCURRENCY_LIMIT} parallel`)
  console.log(`${'='.repeat(60)}\n`)

  // Parse material guidance
  const parsedTextures = parseMaterialGuidance(materialGuidance, priceLevel)

  if (parsedTextures.length === 0) {
    console.log(`   [Texture Sub-Agent] No textures parsed from guidance`)
    return result
  }

  onProgress?.(`Parsed ${parsedTextures.length} textures, processing in parallel (${CONCURRENCY_LIMIT} concurrent)...`)

  // Load context once (before parallel processing)
  const context = await getMatchContext()

  // Limit textures
  const texturesToProcess = parsedTextures.slice(0, maxTextures)

  // Create concurrency limiter
  const limit = pLimit(CONCURRENCY_LIMIT)

  // Track progress
  let completedCount = 0

  console.log(`   Processing ${texturesToProcess.length} textures in parallel...`)

  // Process textures in parallel with concurrency limit
  const processResults = await Promise.all(
    texturesToProcess.map((parsedTexture) =>
      limit(async () => {
        const processResult = await processSingleTexture(
          parsedTexture,
          styleId,
          priceLevel,
          generateImages,
          context,
          styleContext || styleName.en
        )

        // Update progress
        completedCount++
        onProgress?.(`[${completedCount}/${texturesToProcess.length}] ${parsedTexture.name} ${processResult.error ? '❌' : '✓'}`)

        return { textureName: parsedTexture.name, ...processResult }
      })
    )
  )

  // Aggregate results
  for (const processResult of processResults) {
    if (processResult.textureId) {
      result.textureIds.push(processResult.textureId)

      if (processResult.matched) {
        result.stats.matched++
      }
      if (processResult.created) {
        result.stats.created++
      }
      if (processResult.imageGenerated) {
        result.stats.images++
      }
    }

    if (processResult.error) {
      result.stats.errors++
      result.errors.push({ texture: processResult.textureName, error: processResult.error })
    }
  }

  // Clear cache once at the end if any textures were created
  if (result.stats.created > 0) {
    clearTextureSubAgentCache()
  }

  // Set success based on errors
  result.success = result.stats.errors < result.textureIds.length || result.textureIds.length > 0

  console.log(`\n${'='.repeat(60)}`)
  console.log(`Texture Sub-Agent Complete: ${styleName.en}`)
  console.log(`Matched: ${result.stats.matched}`)
  console.log(`Created: ${result.stats.created}`)
  console.log(`Images: ${result.stats.images}`)
  console.log(`Errors: ${result.stats.errors}`)
  console.log(`${'='.repeat(60)}\n`)

  return result
}
