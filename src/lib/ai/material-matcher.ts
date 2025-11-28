/**
 * AI Material Matcher Sub-Agent
 *
 * Intelligent material matching for the seed process:
 * - Semantic matching of material names to existing DB materials
 * - Cross-language support (Hebrew ↔ English)
 * - Automatic category, type, and texture inference
 * - Creates new materials with proper properties when no match found
 */

import { z } from 'zod'
import { generateStructuredObject, AI_MODELS, type GenerationOptions } from './ai-sdk-provider'
import { globalMetricsCollector, generateOperationId } from './telemetry'

// =============================================================================
// Configuration
// =============================================================================

export const MATERIAL_MATCH_CONFIG = {
  CONFIDENCE_THRESHOLD_LINK: 0.6,      // Minimum confidence to link to existing
  CONFIDENCE_THRESHOLD_HEURISTIC: 0.85, // Heuristic match threshold (no AI needed)
  BATCH_SIZE: 10,                       // Materials per AI batch call
  TEMPERATURE: 0.2,                     // Low for consistent matching
}

// =============================================================================
// Zod Schemas
// =============================================================================

/**
 * Schema for when AI decides to create a new material
 */
export const NewMaterialSchema = z.object({
  name: z.object({
    he: z.string().describe('Hebrew material name (proper RTL text)'),
    en: z.string().describe('English material name'),
  }),
  categoryId: z.string().describe('MongoDB ObjectId of MaterialCategory from the available list'),
  typeId: z.string().describe('MongoDB ObjectId of MaterialType (must belong to selected category)'),
  textureId: z.string().optional().describe('MongoDB ObjectId of matching Texture if relevant'),
  subType: z.string().describe('Specific variant e.g. "Carrara" for marble, "Oak" for wood'),
  finish: z.array(z.string()).describe('Applicable finishes like "matte", "glossy", "satin", "polished"'),
})

/**
 * Schema for a single material match result
 */
export const MaterialMatchSchema = z.object({
  inputName: z.string().describe('The original material name that was matched'),
  action: z.enum(['link', 'create']).describe('Whether to link to existing material or create new'),
  matchedMaterialId: z.string().optional().describe('MongoDB ObjectId of matched existing material (required if action=link)'),
  confidence: z.number().min(0).max(1).describe('Confidence score from 0.0 to 1.0'),
  newMaterial: NewMaterialSchema.optional().describe('New material specification (required if action=create)'),
  reasoning: z.string().describe('Brief explanation of why this decision was made'),
})

/**
 * Batch response schema for multiple materials
 */
export const MaterialMatchBatchResponseSchema = z.object({
  matches: z.array(MaterialMatchSchema).describe('Array of match results for each input material'),
})

// Type exports
export type NewMaterial = z.infer<typeof NewMaterialSchema>
export type MaterialMatch = z.infer<typeof MaterialMatchSchema>
export type MaterialMatchBatchResponse = z.infer<typeof MaterialMatchBatchResponseSchema>

// =============================================================================
// Context Interfaces
// =============================================================================

/**
 * Available material from database for matching
 */
export interface AvailableMaterial {
  id: string
  name: { he: string; en: string }
  categoryId: string
  categorySlug: string
  categoryName: { he: string; en: string }
  typeId?: string
  typeName?: { he: string; en: string }
}

/**
 * Available category from database
 */
export interface AvailableCategory {
  id: string
  name: { he: string; en: string }
  slug: string
}

/**
 * Available material type from database
 */
export interface AvailableType {
  id: string
  categoryId: string
  name: { he: string; en: string }
  slug: string
}

/**
 * Available texture from database
 */
export interface AvailableTexture {
  id: string
  name: { he: string; en: string }
  categorySlug?: string
}

/**
 * Context for material matching
 */
export interface MaterialMatchContext {
  materialsToMatch: string[]
  availableMaterials: AvailableMaterial[]
  availableCategories: AvailableCategory[]
  availableTypes: AvailableType[]
  availableTextures: AvailableTexture[]
  styleContext?: string
  priceLevel?: 'REGULAR' | 'LUXURY'
}

// =============================================================================
// Heuristic Pre-filter (No AI Call)
// =============================================================================

/**
 * Common material translations for quick lookup
 */
const QUICK_TRANSLATIONS: Record<string, string[]> = {
  // Hebrew base -> English variants
  'שיש': ['marble', 'carrara', 'calacatta'],
  'עץ': ['wood', 'oak', 'walnut', 'pine', 'teak', 'mahogany', 'cherry'],
  'אלון': ['oak'],
  'אגוז': ['walnut'],
  'אורן': ['pine'],
  'טיק': ['teak'],
  'מהגוני': ['mahogany'],
  'אבן': ['stone', 'limestone', 'travertine'],
  'גרניט': ['granite'],
  'בטון': ['concrete'],
  'מתכת': ['metal', 'steel', 'iron'],
  'פלדה': ['steel'],
  'ברזל': ['iron'],
  'פליז': ['brass'],
  'נחושת': ['copper'],
  'ארד': ['bronze'],
  'בד': ['fabric', 'textile'],
  'כותנה': ['cotton'],
  'פשתן': ['linen'],
  'משי': ['silk'],
  'קטיפה': ['velvet'],
  'עור': ['leather'],
  'צמר': ['wool'],
  'קרמיקה': ['ceramic', 'ceramics'],
  'פורצלן': ['porcelain'],
  'זכוכית': ['glass'],
  'מראה': ['mirror'],
  'טיח': ['plaster', 'stucco'],
  'טפט': ['wallpaper'],
  'צבע': ['paint'],
}

/**
 * Reverse mapping: English -> Hebrew
 */
const ENGLISH_TO_HEBREW: Record<string, string> = {}
for (const [hebrew, englishVariants] of Object.entries(QUICK_TRANSLATIONS)) {
  for (const english of englishVariants) {
    ENGLISH_TO_HEBREW[english.toLowerCase()] = hebrew
  }
}

/**
 * Fast heuristic matcher without AI
 * Used as first-pass to reduce API calls
 */
export function heuristicMaterialMatch(
  name: string,
  availableMaterials: AvailableMaterial[]
): { matched: boolean; materialId?: string; confidence: number } {
  const nameLower = name.toLowerCase().trim()
  const nameNormalized = nameLower.replace(/\s+/g, ' ')

  // Step 1: Exact match (case-insensitive)
  for (const material of availableMaterials) {
    const heLower = material.name.he?.toLowerCase().trim() || ''
    const enLower = material.name.en?.toLowerCase().trim() || ''

    if (heLower === nameLower || enLower === nameLower) {
      return { matched: true, materialId: material.id, confidence: 1.0 }
    }
  }

  // Step 2: Check if input contains base material keyword
  // e.g., "Marble countertops" contains "marble"
  for (const material of availableMaterials) {
    const enLower = material.name.en?.toLowerCase().trim() || ''
    const heName = material.name.he || ''

    // Check if input contains the material name
    if (enLower && nameNormalized.includes(enLower)) {
      return { matched: true, materialId: material.id, confidence: 0.9 }
    }

    // Check Hebrew
    if (heName && name.includes(heName)) {
      return { matched: true, materialId: material.id, confidence: 0.9 }
    }
  }

  // Step 3: Cross-language translation lookup
  // Check if we have a translation for this term
  const hebrewEquivalent = ENGLISH_TO_HEBREW[nameLower]
  if (hebrewEquivalent) {
    for (const material of availableMaterials) {
      if (material.name.he?.includes(hebrewEquivalent)) {
        return { matched: true, materialId: material.id, confidence: 0.85 }
      }
    }
  }

  // Check if Hebrew input has English equivalent
  for (const [hebrew, englishVariants] of Object.entries(QUICK_TRANSLATIONS)) {
    if (name.includes(hebrew)) {
      for (const material of availableMaterials) {
        const enLower = material.name.en?.toLowerCase() || ''
        if (englishVariants.some(en => enLower.includes(en))) {
          return { matched: true, materialId: material.id, confidence: 0.85 }
        }
      }
    }
  }

  // Step 4: Check for partial keyword matches in both directions
  for (const material of availableMaterials) {
    const enLower = material.name.en?.toLowerCase() || ''

    // Split input into words and check if any match
    const inputWords = nameNormalized.split(/\s+/)
    for (const word of inputWords) {
      if (word.length >= 3 && enLower.includes(word)) {
        return { matched: true, materialId: material.id, confidence: 0.8 }
      }
    }
  }

  return { matched: false, confidence: 0 }
}

// =============================================================================
// AI Prompt Builder
// =============================================================================

/**
 * Build the prompt for AI material matching
 */
function buildMaterialMatchPrompt(context: MaterialMatchContext): string {
  const {
    materialsToMatch,
    availableMaterials,
    availableCategories,
    availableTypes,
    availableTextures,
    styleContext,
    priceLevel,
  } = context

  // Format available materials for prompt
  const materialsListForPrompt = availableMaterials.slice(0, 50).map(m =>
    `  - ID: "${m.id}" | Hebrew: "${m.name.he}" | English: "${m.name.en}" | Category: ${m.categorySlug}`
  ).join('\n')

  // Format categories
  const categoriesListForPrompt = availableCategories.map(c =>
    `  - ID: "${c.id}" | Hebrew: "${c.name.he}" | English: "${c.name.en}" | Slug: ${c.slug}`
  ).join('\n')

  // Format types grouped by category
  const typesByCategory = new Map<string, typeof availableTypes>()
  for (const type of availableTypes) {
    const existing = typesByCategory.get(type.categoryId) || []
    existing.push(type)
    typesByCategory.set(type.categoryId, existing)
  }

  const typesListForPrompt = Array.from(typesByCategory.entries()).map(([catId, types]) => {
    const cat = availableCategories.find(c => c.id === catId)
    return `  Category "${cat?.name.en || catId}":\n` +
      types.map(t => `    - ID: "${t.id}" | Hebrew: "${t.name.he}" | English: "${t.name.en}"`).join('\n')
  }).join('\n')

  // Format textures (limit to 30 for prompt size)
  const texturesListForPrompt = availableTextures.slice(0, 30).map(t =>
    `  - ID: "${t.id}" | Hebrew: "${t.name.he}" | English: "${t.name.en}"`
  ).join('\n')

  return `You are an expert interior design material specialist. Your task is to match material names to existing materials in a database, or specify how to create new ones.

**CONTEXT**
${styleContext ? `Style: ${styleContext}` : 'General interior design'}
${priceLevel ? `Price Level: ${priceLevel}` : ''}

---

**MATERIALS TO MATCH** (${materialsToMatch.length} items):
${materialsToMatch.map((m, i) => `${i + 1}. "${m}"`).join('\n')}

---

**AVAILABLE MATERIALS IN DATABASE** (${availableMaterials.length} total, showing first 50):
${materialsListForPrompt}

---

**AVAILABLE CATEGORIES**:
${categoriesListForPrompt}

---

**AVAILABLE TYPES** (grouped by category):
${typesListForPrompt}

---

**AVAILABLE TEXTURES** (${availableTextures.length} total, showing first 30):
${texturesListForPrompt}

---

**YOUR TASK**

For EACH material to match, determine whether to LINK to an existing material or CREATE a new one:

### LINK (action: "link")
Use when an existing material semantically matches:
- "Marble countertops" → Link to "Marble" (same base material)
- "שיש לבן" (White marble) → Link to "שיש" (Marble)
- "Oak flooring" → Link to "Oak" or "Wood"

Requirements for LINK:
- matchedMaterialId: The EXACT ID from the available materials list
- confidence: Your certainty (0.6-1.0)
- reasoning: Brief explanation

### CREATE (action: "create")
Use when no suitable match exists in the database.

Requirements for CREATE:
- newMaterial.name.he: Proper Hebrew name (RTL)
- newMaterial.name.en: Proper English name
- newMaterial.categoryId: EXACT ID from available categories
- newMaterial.typeId: EXACT ID from available types (MUST belong to selected category)
- newMaterial.textureId: EXACT ID from available textures (optional, if relevant)
- newMaterial.subType: Specific variant (e.g., "Carrara" for marble)
- newMaterial.finish: Array of applicable finishes (e.g., ["polished", "honed"])
- confidence: 1.0 (certain this needs creation)
- reasoning: Why no existing material matches

**IMPORTANT RULES**
1. Use EXACT IDs from the lists above - do not make up IDs
2. Match the BASE material, not descriptive prefixes ("White marble" → "Marble")
3. Cross-language matching: "שיש" = "Marble" (same material)
4. For types, ensure the typeId belongs to the selected categoryId
5. If unsure between two materials, pick the more specific one
6. Common finish values: "matte", "glossy", "satin", "polished", "honed", "brushed", "textured"
7. For Hebrew names, use proper interior design terminology`
}

// =============================================================================
// Core AI Matching Functions
// =============================================================================

/**
 * Match a batch of material names using AI
 */
export async function matchMaterialsBatch(
  context: MaterialMatchContext,
  options?: Partial<GenerationOptions>
): Promise<MaterialMatch[]> {
  const operationId = generateOperationId()
  const functionId = 'material-matcher-batch'

  if (context.materialsToMatch.length === 0) {
    return []
  }

  globalMetricsCollector.startOperation(
    operationId,
    functionId,
    AI_MODELS.GEMINI_FLASH_LITE
  )

  console.log(`\n[Material Matcher] Matching ${context.materialsToMatch.length} materials via AI`)
  console.log(`   Available: ${context.availableMaterials.length} materials, ${context.availableCategories.length} categories, ${context.availableTypes.length} types`)

  const prompt = buildMaterialMatchPrompt(context)

  try {
    const { object: result, usage } = await generateStructuredObject(
      prompt,
      MaterialMatchBatchResponseSchema,
      {
        model: AI_MODELS.GEMINI_FLASH_LITE,
        temperature: MATERIAL_MATCH_CONFIG.TEMPERATURE,
        retries: 3,
        useFallback: true,
        ...options,
      }
    )

    // Validate returned IDs exist
    const validatedMatches = result.matches.map((match, index) => {
      // Validate link action
      if (match.action === 'link' && match.matchedMaterialId) {
        const exists = context.availableMaterials.some(m => m.id === match.matchedMaterialId)
        if (!exists) {
          console.warn(`   [Validation] Invalid material ID "${match.matchedMaterialId}" for "${match.inputName}", converting to create`)
          return {
            ...match,
            action: 'create' as const,
            matchedMaterialId: undefined,
            confidence: 0.8,
            reasoning: `Original match ID invalid - creating new material`,
            newMaterial: inferNewMaterial(context.materialsToMatch[index], context),
          }
        }
      }

      // Validate create action
      if (match.action === 'create' && match.newMaterial) {
        const categoryExists = context.availableCategories.some(c => c.id === match.newMaterial!.categoryId)
        const typeExists = context.availableTypes.some(t => t.id === match.newMaterial!.typeId)

        if (!categoryExists || !typeExists) {
          console.warn(`   [Validation] Invalid category/type IDs for "${match.inputName}", using fallback`)
          return {
            ...match,
            newMaterial: inferNewMaterial(match.inputName, context),
          }
        }
      }

      return match
    })

    globalMetricsCollector.completeOperation(operationId, usage, 'stop')

    const linkCount = validatedMatches.filter(m => m.action === 'link').length
    const createCount = validatedMatches.filter(m => m.action === 'create').length
    console.log(`   Results: ${linkCount} linked, ${createCount} to create`)
    console.log(`   Tokens: ${usage.totalTokens}`)

    return validatedMatches

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    globalMetricsCollector.failOperation(operationId, errorMessage)
    console.error(`   [Material Matcher] AI matching failed: ${errorMessage}`)

    // Fallback: return all as "create" actions with inferred properties
    return context.materialsToMatch.map(name => ({
      inputName: name,
      action: 'create' as const,
      confidence: 0.5,
      reasoning: 'AI matching failed, using fallback inference',
      newMaterial: inferNewMaterial(name, context),
    }))
  }
}

/**
 * Match a single material (convenience wrapper)
 */
export async function matchMaterial(
  name: string,
  context: Omit<MaterialMatchContext, 'materialsToMatch'>,
  options?: Partial<GenerationOptions>
): Promise<MaterialMatch> {
  const results = await matchMaterialsBatch(
    { ...context, materialsToMatch: [name] },
    options
  )
  return results[0]
}

// =============================================================================
// Fallback Inference (when AI fails)
// =============================================================================

/**
 * Infer new material properties when AI fails
 * Uses simple keyword-based logic as fallback
 */
function inferNewMaterial(name: string, context: MaterialMatchContext): NewMaterial {
  const nameLower = name.toLowerCase()

  // Simple category inference
  let categorySlug = 'wall-finishes' // Default
  if (/wood|oak|walnut|pine|teak|mahogany|עץ|אלון|אגוז/.test(nameLower)) {
    categorySlug = 'wood-finishes'
  } else if (/marble|granite|stone|limestone|שיש|גרניט|אבן/.test(nameLower)) {
    categorySlug = 'stone-finishes'
  } else if (/metal|steel|iron|brass|copper|מתכת|פלדה|ברזל|פליז/.test(nameLower)) {
    categorySlug = 'metal-finishes'
  } else if (/fabric|cotton|linen|silk|velvet|leather|בד|כותנה|פשתן|משי|עור/.test(nameLower)) {
    categorySlug = 'fabric-textures'
  } else if (/ceramic|porcelain|tile|קרמיקה|פורצלן/.test(nameLower)) {
    categorySlug = 'ceramic-tiles'
  }

  // Find category and type
  const category = context.availableCategories.find(c => c.slug === categorySlug)
    || context.availableCategories[0]

  const type = context.availableTypes.find(t => t.categoryId === category?.id)
    || context.availableTypes[0]

  // Find matching texture
  const texture = context.availableTextures.find(t =>
    t.name.en?.toLowerCase().includes(nameLower.split(/\s+/)[0]) ||
    t.name.he?.includes(name.split(/\s+/)[0])
  )

  // Generate Hebrew name
  const hebrewName = ENGLISH_TO_HEBREW[nameLower.split(/\s+/)[0]] || name

  return {
    name: {
      he: hebrewName,
      en: name.charAt(0).toUpperCase() + name.slice(1),
    },
    categoryId: category?.id || '',
    typeId: type?.id || '',
    textureId: texture?.id,
    subType: name,
    finish: ['matte'],
  }
}

// =============================================================================
// Combined Matching Function (Heuristic + AI)
// =============================================================================

/**
 * Smart material matching: tries heuristic first, then AI if needed
 */
export async function smartMatchMaterial(
  name: string,
  context: Omit<MaterialMatchContext, 'materialsToMatch'>,
  options?: Partial<GenerationOptions>
): Promise<MaterialMatch> {
  // Step 1: Try heuristic match first (free)
  const heuristic = heuristicMaterialMatch(name, context.availableMaterials)

  if (heuristic.matched && heuristic.confidence >= MATERIAL_MATCH_CONFIG.CONFIDENCE_THRESHOLD_HEURISTIC) {
    console.log(`   [Heuristic] Matched "${name}" → ${heuristic.materialId} (${(heuristic.confidence * 100).toFixed(0)}%)`)
    return {
      inputName: name,
      action: 'link',
      matchedMaterialId: heuristic.materialId,
      confidence: heuristic.confidence,
      reasoning: 'Matched via heuristic pre-filter',
    }
  }

  // Step 2: Use AI for semantic matching
  return await matchMaterial(name, context, options)
}

/**
 * Smart batch matching: filters out heuristic matches, only sends unknowns to AI
 */
export async function smartMatchMaterialsBatch(
  names: string[],
  context: Omit<MaterialMatchContext, 'materialsToMatch'>,
  options?: Partial<GenerationOptions>
): Promise<MaterialMatch[]> {
  const results: MaterialMatch[] = []
  const needsAI: { name: string; index: number }[] = []

  // Step 1: Try heuristic match for each
  for (let i = 0; i < names.length; i++) {
    const name = names[i]
    const heuristic = heuristicMaterialMatch(name, context.availableMaterials)

    if (heuristic.matched && heuristic.confidence >= MATERIAL_MATCH_CONFIG.CONFIDENCE_THRESHOLD_HEURISTIC) {
      results[i] = {
        inputName: name,
        action: 'link',
        matchedMaterialId: heuristic.materialId,
        confidence: heuristic.confidence,
        reasoning: 'Matched via heuristic pre-filter',
      }
    } else {
      needsAI.push({ name, index: i })
    }
  }

  console.log(`[Smart Matcher] ${results.filter(Boolean).length} matched via heuristic, ${needsAI.length} need AI`)

  // Step 2: Send remaining to AI in batches
  if (needsAI.length > 0) {
    const batchSize = MATERIAL_MATCH_CONFIG.BATCH_SIZE
    for (let i = 0; i < needsAI.length; i += batchSize) {
      const batch = needsAI.slice(i, i + batchSize)
      const batchNames = batch.map(b => b.name)

      const aiResults = await matchMaterialsBatch(
        { ...context, materialsToMatch: batchNames },
        options
      )

      // Place AI results in correct positions
      for (let j = 0; j < batch.length; j++) {
        results[batch[j].index] = aiResults[j]
      }
    }
  }

  return results
}
