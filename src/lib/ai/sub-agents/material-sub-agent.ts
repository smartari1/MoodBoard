/**
 * E2E Material Sub-Agent
 *
 * Single entry point for all material operations during style generation:
 * 1. Parse required materials from AI detailedContent
 * 2. Load context (materials, categories, types, textures) - cached
 * 3. For each material:
 *    - Heuristic match → AI semantic match → Create new
 *    - Generate image if new entity created
 *    - Create StyleMaterial link
 * 4. Return unified result with stats
 */

import { PrismaClient, ImageCategory } from '@prisma/client'
import crypto from 'crypto'
import pLimit from 'p-limit'
import {
  generateAndUploadImages,
  smartMatchMaterial,
  heuristicMaterialMatch,
  MATERIAL_MATCH_CONFIG,
  type AvailableMaterial,
  type AvailableCategory,
  type AvailableType,
  type AvailableTexture,
  type MaterialMatch,
} from '@/lib/ai'

const prisma = new PrismaClient()

// =============================================================================
// Configuration
// =============================================================================

const CONCURRENCY_LIMIT = 5 // Parallel image generation limit
const CONTEXT_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// =============================================================================
// Types
// =============================================================================

export interface MaterialSubAgentOptions {
  styleId: string
  styleName: { he: string; en: string }
  detailedContent: {
    en: { requiredMaterials?: string[]; materialGuidance?: string }
    he: { requiredMaterials?: string[]; materialGuidance?: string }
  }
  priceLevel: 'REGULAR' | 'LUXURY'
  generateImages?: boolean
  maxMaterials?: number
  onProgress?: (message: string) => void
}

export interface MaterialSubAgentResult {
  success: boolean
  materialIds: string[]
  stats: {
    matched: number
    created: number
    images: number
    errors: number
  }
  errors: Array<{ material: string; error: string }>
}

// =============================================================================
// Context Cache
// =============================================================================

interface MaterialMatchContextCache {
  materials: AvailableMaterial[]
  categories: AvailableCategory[]
  types: AvailableType[]
  textures: AvailableTexture[]
  loadedAt: number
}

let contextCache: MaterialMatchContextCache | null = null

/**
 * Load or get cached context for AI material matching
 */
async function getMatchContext(): Promise<{
  availableMaterials: AvailableMaterial[]
  availableCategories: AvailableCategory[]
  availableTypes: AvailableType[]
  availableTextures: AvailableTexture[]
}> {
  // Check if cache is still valid
  if (contextCache && Date.now() - contextCache.loadedAt < CONTEXT_CACHE_TTL) {
    return {
      availableMaterials: contextCache.materials,
      availableCategories: contextCache.categories,
      availableTypes: contextCache.types,
      availableTextures: contextCache.textures,
    }
  }

  console.log('   [Material Sub-Agent] Loading context from database...')

  // Load all materials
  const materials = await prisma.material.findMany({
    include: { category: true },
    take: 200,
  })

  const availableMaterials: AvailableMaterial[] = materials.map((m) => ({
    id: m.id,
    name: m.name as { he: string; en: string },
    categoryId: m.categoryId,
    categorySlug: m.category?.slug || '',
    categoryName: (m.category?.name as { he: string; en: string }) || { he: '', en: '' },
    typeId: (m.properties as any)?.typeId,
  }))

  // Load all categories
  const categories = await prisma.materialCategory.findMany()
  const availableCategories: AvailableCategory[] = categories.map((c) => ({
    id: c.id,
    name: c.name as { he: string; en: string },
    slug: c.slug,
  }))

  // Load all types
  const types = await prisma.materialType.findMany()
  const availableTypes: AvailableType[] = types.map((t) => ({
    id: t.id,
    categoryId: t.categoryId,
    name: t.name as { he: string; en: string },
    slug: t.slug,
  }))

  // Load all textures
  const textures = await prisma.texture.findMany({ take: 100 })
  const availableTextures: AvailableTexture[] = textures.map((t) => ({
    id: t.id,
    name: t.name as { he: string; en: string },
  }))

  // Update cache
  contextCache = {
    materials: availableMaterials,
    categories: availableCategories,
    types: availableTypes,
    textures: availableTextures,
    loadedAt: Date.now(),
  }

  console.log(
    `   [Material Sub-Agent] Loaded: ${availableMaterials.length} materials, ${availableCategories.length} categories, ${availableTypes.length} types`
  )

  return {
    availableMaterials,
    availableCategories,
    availableTypes,
    availableTextures,
  }
}

/**
 * Clear context cache
 */
export function clearMaterialSubAgentCache(): void {
  contextCache = null
  console.log('   [Material Sub-Agent] Cache cleared')
}

// =============================================================================
// Material Name Translations
// =============================================================================

const MATERIAL_TRANSLATIONS: Record<string, string> = {
  // Woods
  wood: 'עץ',
  oak: 'אלון',
  'oak wood': 'עץ אלון',
  walnut: 'אגוז',
  'walnut wood': 'עץ אגוז',
  maple: 'מייפל',
  teak: 'טיק',
  pine: 'אורן',
  mahogany: 'מהגוני',
  cherry: 'דובדבן',
  veneer: 'פורניר',
  // Metals
  metal: 'מתכת',
  steel: 'פלדה',
  iron: 'ברזל',
  'wrought iron': 'ברזל יצוק',
  brass: 'פליז',
  'brass fixtures': 'אביזרי פליז',
  copper: 'נחושת',
  bronze: 'ארד',
  aluminum: 'אלומיניום',
  nickel: 'ניקל',
  chrome: 'כרום',
  gold: 'זהב',
  'gold leaf': 'עלי זהב',
  silver: 'כסף',
  // Stones
  stone: 'אבן',
  marble: 'שיש',
  'carrara marble': 'שיש קררה',
  granite: 'גרניט',
  limestone: 'אבן גיר',
  travertine: 'טרוורטין',
  concrete: 'בטון',
  terrazzo: 'טראצו',
  // Fabrics
  fabric: 'בד',
  cotton: 'כותנה',
  linen: 'פשתן',
  silk: 'משי',
  velvet: 'קטיפה',
  leather: 'עור',
  suede: 'זמש',
  wool: 'צמר',
  // Wall finishes
  paint: 'צבע',
  plaster: 'טיח',
  'venetian plaster': 'טיח ונציאני',
  wallpaper: 'טפט',
  stucco: 'סטוקו',
  gypsum: 'גבס',
  // Ceramics
  ceramic: 'קרמיקה',
  porcelain: 'פורצלן',
  terracotta: 'טרקוטה',
  tile: 'אריח',
  // Glass
  glass: 'זכוכית',
  mirror: 'מראה',
  crystal: 'קריסטל',
}

/**
 * Get Hebrew translation for material name
 */
function getMaterialNameHebrew(englishName: string): string {
  const nameLower = englishName.toLowerCase().trim()

  // Direct match
  if (MATERIAL_TRANSLATIONS[nameLower]) {
    return MATERIAL_TRANSLATIONS[nameLower]
  }

  // Try partial match
  for (const [en, he] of Object.entries(MATERIAL_TRANSLATIONS)) {
    if (nameLower.includes(en) || en.includes(nameLower)) {
      return he
    }
  }

  return englishName
}

// =============================================================================
// Category Inference
// =============================================================================

const MATERIAL_TO_CATEGORY: Record<string, string> = {
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

function inferMaterialCategory(materialName: string): string {
  const nameLower = materialName.toLowerCase()

  for (const [keyword, category] of Object.entries(MATERIAL_TO_CATEGORY)) {
    if (nameLower.includes(keyword)) {
      return category
    }
  }

  return 'wall-finishes' // Default fallback
}

// =============================================================================
// Core Functions
// =============================================================================

/**
 * Generate material image
 */
async function generateMaterialImage(
  name: { he: string; en: string },
  priceLevel: 'REGULAR' | 'LUXURY'
): Promise<string | undefined> {
  try {
    console.log(`      🎨 Generating image for ${name.en}...`)
    const images = await generateAndUploadImages({
      entityType: 'material',
      entityName: name,
      priceLevel,
      numberOfImages: 1,
      aspectRatio: '1:1',
    })

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
 * Create StyleMaterial link if doesn't exist
 */
async function linkMaterialToStyle(materialId: string, styleId: string): Promise<void> {
  const existingLink = await prisma.styleMaterial.findUnique({
    where: {
      styleId_materialId: { styleId, materialId },
    },
  })

  if (!existingLink) {
    await prisma.styleMaterial.create({
      data: { styleId, materialId },
    })
    console.log(`      🔗 Linked to style`)
  }
}

/**
 * Create StyleImage record for material
 */
async function createStyleMaterialImage(
  styleId: string,
  materialName: string,
  imageUrl: string,
  priceLevel: string,
  displayOrder: number
): Promise<void> {
  await prisma.styleImage.create({
    data: {
      styleId,
      url: imageUrl,
      imageCategory: 'MATERIAL' as ImageCategory,
      displayOrder,
      description: `${materialName} material close-up`,
      tags: [priceLevel.toLowerCase(), materialName.toLowerCase()],
    },
  })
}

/**
 * Process a single material: match → create if needed → link → image
 */
async function processSingleMaterial(
  materialName: string,
  styleId: string,
  priceLevel: 'REGULAR' | 'LUXURY',
  generateImages: boolean,
  context: Awaited<ReturnType<typeof getMatchContext>>,
  displayOrder: number
): Promise<{
  materialId: string | null
  matched: boolean
  created: boolean
  imageGenerated: boolean
  error?: string
}> {
  try {
    const nameHe = getMaterialNameHebrew(materialName)

    // Step 1: Try exact DB match
    const existing = await prisma.material.findFirst({
      where: {
        OR: [
          { name: { is: { en: materialName } } },
          { name: { is: { he: nameHe } } },
        ],
      },
    })

    if (existing) {
      console.log(`   ♻️  Exact match: ${materialName}`)
      await linkMaterialToStyle(existing.id, styleId)
      return { materialId: existing.id, matched: true, created: false, imageGenerated: false }
    }

    // Step 2: Try heuristic match (free)
    const heuristic = heuristicMaterialMatch(materialName, context.availableMaterials)
    if (heuristic.matched && heuristic.confidence >= MATERIAL_MATCH_CONFIG.CONFIDENCE_THRESHOLD_HEURISTIC) {
      console.log(`   ♻️  Heuristic match: ${materialName} → ${heuristic.materialId}`)
      await linkMaterialToStyle(heuristic.materialId!, styleId)
      return { materialId: heuristic.materialId!, matched: true, created: false, imageGenerated: false }
    }

    // Step 3: Try AI semantic match
    const match = await smartMatchMaterial(materialName, context)

    if (match.action === 'link' && match.matchedMaterialId) {
      console.log(`   🤖 AI matched: ${materialName} → ${match.matchedMaterialId}`)
      await linkMaterialToStyle(match.matchedMaterialId, styleId)
      return { materialId: match.matchedMaterialId, matched: true, created: false, imageGenerated: false }
    }

    // Step 4: Create new material
    console.log(`   ✨ Creating new material: ${materialName}`)

    let imageUrl: string | undefined
    let imageGenerated = false

    // Generate image if requested (before creating entity)
    if (generateImages && match.action === 'create' && match.newMaterial) {
      imageUrl = await generateMaterialImage(match.newMaterial.name, priceLevel)
      imageGenerated = !!imageUrl
    }

    // Determine category for fallback
    const categorySlug = inferMaterialCategory(materialName)
    const materialCategory = await prisma.materialCategory.findFirst({
      where: { slug: categorySlug },
    })
    const defaultCategory = materialCategory || (await prisma.materialCategory.findFirst())

    if (!defaultCategory) {
      throw new Error('No material categories exist in database')
    }

    // Find type in category
    const defaultType = await prisma.materialType.findFirst({
      where: { categoryId: match.newMaterial?.categoryId || defaultCategory.id },
    })

    // Create material entity
    const material = await prisma.material.create({
      data: {
        sku: `AI-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
        name: match.newMaterial?.name || { he: nameHe, en: materialName },
        categoryId: match.newMaterial?.categoryId || defaultCategory.id,
        textureId: match.newMaterial?.textureId || null,
        isAbstract: true,
        generationStatus: 'COMPLETED',
        aiDescription: `AI-generated material: ${materialName}. ${match.reasoning}`,
        properties: {
          typeId: match.newMaterial?.typeId || defaultType?.id || '',
          subType: match.newMaterial?.subType || materialName,
          finish: match.newMaterial?.finish || [],
          texture: 'AI-generated',
          technical: { durability: 5, maintenance: 5, sustainability: 5 },
        },
        assets: {
          thumbnail: imageUrl || '',
          images: imageUrl ? [imageUrl] : [],
        },
      },
    })

    console.log(`   ✅ Created material: ${material.id}`)

    // Link to style
    await linkMaterialToStyle(material.id, styleId)

    // Create StyleImage record if image was generated
    if (imageUrl) {
      await createStyleMaterialImage(
        styleId,
        materialName,
        imageUrl,
        priceLevel,
        displayOrder
      )
    }

    // Note: Don't clear cache here - will be done once at the end of batch processing

    return { materialId: material.id, matched: false, created: true, imageGenerated }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`   ❌ Error processing ${materialName}: ${errorMsg}`)
    return { materialId: null, matched: false, created: false, imageGenerated: false, error: errorMsg }
  }
}

// =============================================================================
// Main Entry Point
// =============================================================================

/**
 * Process all materials for a style
 *
 * @param options - Configuration options
 * @returns Result with material IDs and stats
 */
export async function processStyleMaterials(
  options: MaterialSubAgentOptions
): Promise<MaterialSubAgentResult> {
  const {
    styleId,
    styleName,
    detailedContent,
    priceLevel,
    generateImages = true,
    maxMaterials = 10,
    onProgress,
  } = options

  const result: MaterialSubAgentResult = {
    success: true,
    materialIds: [],
    stats: {
      matched: 0,
      created: 0,
      images: 0,
      errors: 0,
    },
    errors: [],
  }

  // Extract materials from detailedContent
  const materialsFromContent = detailedContent.en.requiredMaterials || []

  if (materialsFromContent.length === 0) {
    console.log(`   [Material Sub-Agent] No materials found in detailedContent`)
    return result
  }

  console.log(`\n${'='.repeat(60)}`)
  console.log(`Material Sub-Agent: ${styleName.en}`)
  console.log(`Materials to process: ${materialsFromContent.length}`)
  console.log(`Price Level: ${priceLevel}`)
  console.log(`Concurrency: ${CONCURRENCY_LIMIT} parallel`)
  console.log(`${'='.repeat(60)}\n`)

  onProgress?.(`Processing ${materialsFromContent.length} materials in parallel (${CONCURRENCY_LIMIT} concurrent)...`)

  // Load context once (before parallel processing)
  const context = await getMatchContext()

  // Limit materials
  const materialsToProcess = materialsFromContent.slice(0, maxMaterials)

  // Create concurrency limiter
  const limit = pLimit(CONCURRENCY_LIMIT)

  // Track progress
  let completedCount = 0

  // Process materials in parallel with concurrency limit
  const processResults = await Promise.all(
    materialsToProcess.map((materialName, i) =>
      limit(async () => {
        const processResult = await processSingleMaterial(
          materialName,
          styleId,
          priceLevel,
          generateImages,
          context,
          i
        )

        // Update progress
        completedCount++
        onProgress?.(`[${completedCount}/${materialsToProcess.length}] ${materialName} ${processResult.error ? '❌' : '✓'}`)

        return { materialName, ...processResult }
      })
    )
  )

  // Aggregate results
  for (const processResult of processResults) {
    if (processResult.materialId) {
      result.materialIds.push(processResult.materialId)

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
      result.errors.push({ material: processResult.materialName, error: processResult.error })
    }
  }

  // Clear cache once at the end if any materials were created
  if (result.stats.created > 0) {
    clearMaterialSubAgentCache()
  }

  // Set success based on errors
  result.success = result.stats.errors < result.materialIds.length || result.materialIds.length > 0

  console.log(`\n${'='.repeat(60)}`)
  console.log(`Material Sub-Agent Complete: ${styleName.en}`)
  console.log(`Matched: ${result.stats.matched}`)
  console.log(`Created: ${result.stats.created}`)
  console.log(`Images: ${result.stats.images}`)
  console.log(`Errors: ${result.stats.errors}`)
  console.log(`${'='.repeat(60)}\n`)

  return result
}
