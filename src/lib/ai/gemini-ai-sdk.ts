/**
 * Gemini AI Service (AI SDK Version)
 *
 * Migrated to use Vercel AI SDK for:
 * - Type-safe structured outputs with Zod
 * - Automatic retry with exponential backoff
 * - Cost tracking and token usage monitoring
 * - Fallback to Anthropic Claude if Gemini fails
 */

import {
  generateStructuredObject,
  generateTextContent,
  AI_MODELS,
  TokenUsageTracker,
  type GenerationOptions,
} from './ai-sdk-provider'
import {
  LocalizedDetailedContentSchema,
  PoeticIntroResponseSchema,
  FactualDetailsResponseSchema,
  ColorDescriptionSchema,
  RoomProfileContentSchema,
  type LocalizedDetailedContent,
  type PoeticIntroResponse,
  type FactualDetailsResponse,
  type ColorDescription,
  type RoomProfileContent,
} from './schemas/content-schemas'

// Re-export types for backward compatibility
export type { LocalizedDetailedContent, PoeticIntroResponse, FactualDetailsResponse, ColorDescription, RoomProfileContent }

// Global token tracker for cost monitoring
const globalTokenTracker = new TokenUsageTracker()

/**
 * Get global token usage stats
 */
export function getGlobalTokenUsage() {
  return globalTokenTracker.getUsage()
}

/**
 * Reset global token usage stats
 */
export function resetGlobalTokenUsage() {
  globalTokenTracker.reset()
}

/**
 * Log current token usage
 */
export function logTokenUsage(prefix?: string) {
  globalTokenTracker.log(prefix)
}

/**
 * Default generation options for content generation
 */
const defaultOptions: GenerationOptions = {
  model: AI_MODELS.GEMINI_FLASH,
  temperature: 0.7,
  maxTokens: 8192,
  retries: 3,
  retryDelayMs: 1000,
  useFallback: true,
  onTokenUsage: (usage) => globalTokenTracker.track(usage, AI_MODELS.GEMINI_FLASH),
}

/**
 * Generate detailed content for a category using AI SDK
 */
export async function generateCategoryContent(
  name: { he: string; en: string },
  context?: {
    description?: { he: string; en: string }
    period?: string
    existingStyles?: string[]
  },
  options?: Partial<GenerationOptions>
): Promise<LocalizedDetailedContent> {
  const prompt = `
You are an expert interior design historian and content writer. Generate comprehensive, detailed content for a design style CATEGORY.

Category Name:
- Hebrew: ${name.he}
- English: ${name.en}

${context?.description ? `Existing Description:
- Hebrew: ${context.description.he}
- English: ${context.description.en}` : ''}

${context?.period ? `Time Period: ${context.period}` : ''}

${context?.existingStyles ? `Related Styles: ${context.existingStyles.join(', ')}` : ''}

Generate detailed content in BOTH Hebrew and English. Include:
- A brief introduction (2-3 sentences)
- A full detailed description (5-8 sentences)
- The historical period (if applicable)
- 5 key characteristics
- 3-5 visual elements
- Historical context (3-5 sentences)
- Cultural context (2-4 sentences)
- 3 typical applications

IMPORTANT:
1. Keep descriptions professional and informative
2. Focus on design elements, aesthetics, and historical context
3. Make sure Hebrew content is in proper RTL Hebrew
4. Ensure English translations are accurate and natural`

  console.log(`[AI SDK] Generating category content for: ${name.en}`)

  const result = await generateStructuredObject(
    prompt,
    LocalizedDetailedContentSchema,
    { ...defaultOptions, ...options }
  )

  console.log(`[AI SDK] Category content generated. Tokens used: ${result.usage.totalTokens}`)

  return result.object
}

/**
 * Generate detailed content for a subcategory using AI SDK
 */
export async function generateSubCategoryContent(
  name: { he: string; en: string },
  categoryName: { he: string; en: string },
  context?: {
    description?: { he: string; en: string }
    relatedStyles?: string[]
  },
  options?: Partial<GenerationOptions>
): Promise<LocalizedDetailedContent> {
  const prompt = `
You are an expert interior design historian and content writer. Generate comprehensive, detailed content for a design style SUB-CATEGORY.

Sub-Category Name:
- Hebrew: ${name.he}
- English: ${name.en}

Parent Category:
- Hebrew: ${categoryName.he}
- English: ${categoryName.en}

${context?.description ? `Existing Description:
- Hebrew: ${context.description.he}
- English: ${context.description.en}` : ''}

${context?.relatedStyles ? `Related Styles: ${context.relatedStyles.join(', ')}` : ''}

Generate detailed content in BOTH Hebrew and English. Include:
- A brief introduction (2-3 sentences)
- A full detailed description (4-6 sentences)
- 4 key characteristics
- 3-4 visual elements
- Color guidance (2-3 sentences)
- Material guidance (2-3 sentences)
- 3 typical applications

IMPORTANT:
1. Keep descriptions professional and informative
2. Focus on design elements specific to this sub-category
3. Make sure Hebrew content is in proper RTL Hebrew
4. Ensure English translations are accurate and natural`

  console.log(`[AI SDK] Generating subcategory content for: ${name.en}`)

  const result = await generateStructuredObject(
    prompt,
    LocalizedDetailedContentSchema,
    { ...defaultOptions, model: AI_MODELS.GEMINI_FLASH_LITE, ...options }
  )

  console.log(`[AI SDK] Subcategory content generated. Tokens used: ${result.usage.totalTokens}`)

  return result.object
}

/**
 * Generate detailed content for an approach using AI SDK
 */
export async function generateApproachContent(
  name: { he: string; en: string },
  context?: {
    description?: { he: string; en: string }
    relatedStyles?: string[]
  },
  options?: Partial<GenerationOptions>
): Promise<LocalizedDetailedContent> {
  const prompt = `
You are an expert interior design philosopher and content writer. Generate comprehensive, detailed content for a design APPROACH.

Approach Name:
- Hebrew: ${name.he}
- English: ${name.en}

${context?.description ? `Existing Description:
- Hebrew: ${context.description.he}
- English: ${context.description.en}` : ''}

${context?.relatedStyles ? `Related Styles: ${context.relatedStyles.join(', ')}` : ''}

Generate detailed content in BOTH Hebrew and English. Include:
- A brief introduction (2-3 sentences)
- A full description of the approach and philosophy (5-8 sentences)
- The core design philosophy (3-5 sentences)
- 5 core principles/characteristics
- 3 visual elements
- General color guidance (2-3 sentences)
- General material guidance (2-3 sentences)
- 3 application areas

IMPORTANT:
1. Focus on the design philosophy and principles
2. Keep descriptions professional and thoughtful
3. Make sure Hebrew content is in proper RTL Hebrew
4. Ensure English translations are accurate and natural`

  console.log(`[AI SDK] Generating approach content for: ${name.en}`)

  const result = await generateStructuredObject(
    prompt,
    LocalizedDetailedContentSchema,
    { ...defaultOptions, model: AI_MODELS.GEMINI_FLASH_LITE, ...options }
  )

  console.log(`[AI SDK] Approach content generated. Tokens used: ${result.usage.totalTokens}`)

  return result.object
}

/**
 * Generate detailed content for a room type using AI SDK
 */
export async function generateRoomTypeContent(
  name: { he: string; en: string },
  context?: {
    description?: { he: string; en: string }
    category?: string
  },
  options?: Partial<GenerationOptions>
): Promise<LocalizedDetailedContent> {
  const prompt = `
You are an expert interior designer and content writer. Generate comprehensive, detailed content for a ROOM TYPE.

Room Type Name:
- Hebrew: ${name.he}
- English: ${name.en}

${context?.description ? `Existing Description:
- Hebrew: ${context.description.he}
- English: ${context.description.en}` : ''}

${context?.category ? `Category: ${context.category}` : ''}

Generate detailed content in BOTH Hebrew and English. Include:
- A brief introduction (2-3 sentences)
- A detailed description of the room type and its purpose (4-6 sentences)
- 4 functional characteristics
- 3 common design elements
- Color recommendations (2-3 sentences)
- Material and finish recommendations (2-3 sentences)
- 3 typical uses

IMPORTANT:
1. Focus on functional and practical aspects
2. Include design recommendations specific to this room type
3. Make sure Hebrew content is in proper RTL Hebrew
4. Ensure English translations are accurate and natural`

  console.log(`[AI SDK] Generating room type content for: ${name.en}`)

  const result = await generateStructuredObject(
    prompt,
    LocalizedDetailedContentSchema,
    { ...defaultOptions, model: AI_MODELS.GEMINI_FLASH_LITE, ...options }
  )

  console.log(`[AI SDK] Room type content generated. Tokens used: ${result.usage.totalTokens}`)

  return result.object
}

/**
 * Generate color description using AI SDK
 */
export async function generateColorDescription(
  name: { he: string; en: string },
  context: {
    hex: string
    category: string
  },
  options?: Partial<GenerationOptions>
): Promise<{ he: string; en: string }> {
  const prompt = `
You are an expert interior designer and color consultant. Generate a professional, detailed description for this color.

**Color Information:**
- Name (Hebrew): ${name.he}
- Name (English): ${name.en}
- Hex Code: ${context.hex}
- Category: ${context.category}

**Task:**
Generate a detailed, professional description of this color for interior designers.
The description should explain:
1. The visual characteristics of this color
2. How and where this color is typically used in interior design
3. What moods, feelings, or atmospheres it creates
4. Which design styles it complements best
5. Recommended rooms or spaces for this color

**Guidelines:**
- Write in professional, designer-friendly language
- Be specific and practical
- Include design tips and applications
- Keep descriptions concise but informative (3-4 sentences)
- Focus on practical use in interior design
- Mention complementary colors or materials when relevant`

  console.log(`[AI SDK] Generating color description for: ${name.en}`)

  const result = await generateStructuredObject(
    prompt,
    ColorDescriptionSchema,
    { ...defaultOptions, model: AI_MODELS.GEMINI_FLASH_LITE, ...options }
  )

  console.log(`[AI SDK] Color description generated. Tokens used: ${result.usage.totalTokens}`)

  return result.object
}

/**
 * Enhanced poetic content interface
 */
export interface PoeticContent {
  title: string
  subtitle: string
  paragraph1: string
  paragraph2: string
  paragraph3: string
  paragraph4: string
}

/**
 * Extended DetailedContent with poetic introduction
 */
export interface EnhancedDetailedContent {
  introduction?: string
  description?: string
  period?: string
  characteristics?: string[]
  visualElements?: string[]
  philosophy?: string
  colorGuidance?: string
  materialGuidance?: string
  applications?: string[]
  historicalContext?: string
  culturalContext?: string
  poeticIntro?: PoeticContent
  requiredMaterials?: string[]
}

/**
 * Extended LocalizedDetailedContent with poetic introduction
 */
export interface EnhancedLocalizedDetailedContent {
  he: EnhancedDetailedContent
  en: EnhancedDetailedContent
}

/**
 * Generate detailed content for a style with HYBRID poetic + factual approach using AI SDK
 */
export async function generateStyleContent(
  name: { he: string; en: string },
  context: {
    category: { name: { he: string; en: string } }
    subCategory: {
      name: { he: string; en: string }
      description?: { he?: string; en?: string }
      detailedContent?: any
    }
    approach: {
      name: { he: string; en: string }
      description?: { he?: string; en?: string }
      detailedContent?: any
    }
    color: {
      name: { he: string; en: string }
      hex: string
      category: string
      description?: { he?: string; en?: string }
    }
    priceLevel?: 'REGULAR' | 'LUXURY'
  },
  options?: Partial<GenerationOptions>
): Promise<EnhancedLocalizedDetailedContent> {
  // Import prompt builders
  const { buildPoeticIntroPrompt } = await import('./prompts/style-poetic-intro')
  const { buildFactualDetailsPrompt } = await import('./prompts/style-factual-details')

  const priceLevel = context.priceLevel || 'REGULAR'

  // Step 1: Generate poetic introduction
  console.log(`[AI SDK] Generating poetic introduction for ${name.en}...`)

  const poeticPrompt = buildPoeticIntroPrompt({
    styleName: name,
    subCategoryName: context.subCategory.name,
    approachName: context.approach.name,
    colorName: context.color.name,
    colorHex: context.color.hex,
    subCategoryDescription: context.subCategory.description,
    approachPhilosophy: context.approach.detailedContent,
    colorDescription: context.color.description,
  })

  const poeticResult = await generateStructuredObject(
    poeticPrompt,
    PoeticIntroResponseSchema,
    { ...defaultOptions, temperature: 0.8, ...options }
  )

  console.log(`[AI SDK] Poetic intro generated. Tokens: ${poeticResult.usage.totalTokens}`)

  // Step 2: Generate factual details
  console.log(`[AI SDK] Generating factual details for ${name.en} (Price Level: ${priceLevel})...`)

  const factualPrompt = buildFactualDetailsPrompt({
    styleName: name,
    subCategory: context.subCategory,
    approach: context.approach,
    color: context.color,
    category: context.category,
    priceLevel: priceLevel,
  })

  const factualResult = await generateStructuredObject(
    factualPrompt,
    FactualDetailsResponseSchema,
    { ...defaultOptions, ...options }
  )

  console.log(`[AI SDK] Factual details generated. Tokens: ${factualResult.usage.totalTokens}`)

  // Combine poetic and factual content
  return {
    he: {
      ...factualResult.object.factualDetails.he,
      poeticIntro: poeticResult.object.poeticIntro.he,
    },
    en: {
      ...factualResult.object.factualDetails.en,
      poeticIntro: poeticResult.object.poeticIntro.en,
    },
  }
}

/**
 * Room Profile data structure
 */
export interface RoomProfile {
  roomTypeId: string
  description: { he: string; en: string }
  colorPalette: {
    primary: string
    secondary: string[]
    accent: string[]
    description: { he: string; en: string }
  }
  materials: Array<{
    name: { he: string; en: string }
    application: { he: string; en: string }
    finish: string
  }>
  furnitureAndFixtures: Array<{
    item: { he: string; en: string }
    description: { he: string; en: string }
    importance: 'essential' | 'recommended' | 'optional'
  }>
  lighting: {
    natural: { he: string; en: string }
    artificial: Array<{
      type: { he: string; en: string }
      description: { he: string; en: string }
    }>
  }
  spatialConsiderations: {
    layout: { he: string; en: string }
    circulation: { he: string; en: string }
    functionalZones: Array<{
      zone: { he: string; en: string }
      purpose: { he: string; en: string }
    }>
  }
  decorativeElements: Array<{
    element: { he: string; en: string }
    role: { he: string; en: string }
  }>
  designTips: Array<{
    tip: { he: string; en: string }
  }>
}

/**
 * Generate room-specific profile for a style using AI SDK
 */
export async function generateRoomProfileContent(
  roomType: {
    id: string
    name: { he: string; en: string }
    slug: string
    description?: { he?: string; en?: string }
    detailedContent?: any
  },
  styleContext: {
    name: { he: string; en: string }
    description: { he?: string; en?: string }
    characteristics: string[]
    visualElements: string[]
    materialGuidance: { he?: string; en?: string }
    primaryColor: {
      name: { he: string; en: string }
      hex: string
    }
  },
  availableMaterials?: Array<{
    name: { he: string; en: string }
    sku: string
  }>,
  options?: Partial<GenerationOptions>
): Promise<RoomProfile> {
  // Import prompt builder
  const { buildRoomProfilePrompt } = await import('./prompts/room-profile')

  console.log(`[AI SDK] Generating room profile for ${roomType.name.en} in ${styleContext.name.en}...`)

  const prompt = buildRoomProfilePrompt({
    styleName: styleContext.name,
    styleDescription: styleContext.description,
    roomType,
    primaryColor: styleContext.primaryColor,
    styleCharacteristics: styleContext.characteristics,
    styleVisualElements: styleContext.visualElements,
    styleMaterialGuidance: styleContext.materialGuidance,
    availableMaterials,
  })

  const result = await generateStructuredObject(
    prompt,
    RoomProfileContentSchema,
    { ...defaultOptions, ...options }
  )

  console.log(`[AI SDK] Room profile generated. Tokens: ${result.usage.totalTokens}`)

  return {
    roomTypeId: roomType.id,
    ...result.object.roomProfile,
  }
}

/**
 * Batch generate room profiles for a style across all room types
 */
export async function batchGenerateRoomProfiles(
  roomTypes: Array<{
    id: string
    name: { he: string; en: string }
    slug: string
    description?: { he?: string; en?: string }
    detailedContent?: any
  }>,
  styleContext: {
    name: { he: string; en: string }
    description: { he?: string; en?: string }
    characteristics: string[]
    visualElements: string[]
    materialGuidance: { he?: string; en?: string }
    primaryColor: {
      name: { he: string; en: string }
      hex: string
    }
  },
  availableMaterials?: Array<{
    name: { he: string; en: string }
    sku: string
  }>,
  onProgress?: (current: number, total: number, roomName: string) => void,
  options?: Partial<GenerationOptions>
): Promise<RoomProfile[]> {
  const profiles: RoomProfile[] = []
  const total = roomTypes.length

  for (let i = 0; i < roomTypes.length; i++) {
    const roomType = roomTypes[i]

    try {
      onProgress?.(i + 1, total, roomType.name.en)

      const profile = await generateRoomProfileContent(roomType, styleContext, availableMaterials, options)
      profiles.push(profile)

      // Rate limiting: 2 second delay between requests (safe for paid tier)
      if (i < roomTypes.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    } catch (error) {
      console.error(`[AI SDK] Error generating profile for ${roomType.name.en}:`, error)
      // Continue with other rooms even if one fails
    }
  }

  return profiles
}
