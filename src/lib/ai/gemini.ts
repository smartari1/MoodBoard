/**
 * Gemini AI Service
 *
 * Wrapper for Google's Gemini API for generating detailed content
 * for style engine entities (Categories, SubCategories, Styles, Approaches, RoomTypes)
 */

import { GoogleGenerativeAI } from '@google/generative-ai'

// Lazy initialization to avoid build-time errors
let genAI: GoogleGenerativeAI | null = null

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable is required')
    }
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  }
  return genAI
}

/**
 * Available Gemini models
 */
export const GEMINI_MODELS = {
  PRO: 'gemini-2.0-flash-exp',
  FLASH: 'gemini-2.0-flash-exp',
  FLASH_LITE: 'gemini-2.0-flash-lite-preview-02-05', // Lightweight, cost-effective model
} as const

/**
 * Default generation config
 */
const DEFAULT_CONFIG = {
  temperature: 0.7,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
}

/**
 * Content type for detailed descriptions
 */
export interface DetailedContent {
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
}

/**
 * Localized detailed content
 */
export interface LocalizedDetailedContent {
  he: DetailedContent
  en: DetailedContent
}

/**
 * Entity types that can have detailed content
 */
export type EntityType = 'category' | 'subcategory' | 'style' | 'approach' | 'roomType'

/**
 * Generate detailed content for a category
 */
export async function generateCategoryContent(
  name: { he: string; en: string },
  context?: {
    description?: { he: string; en: string }
    period?: string
    existingStyles?: string[]
  }
): Promise<LocalizedDetailedContent> {
  const model = getGenAI().getGenerativeModel({ model: GEMINI_MODELS.FLASH_LITE })

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

Generate detailed content in BOTH Hebrew and English in the following JSON structure:
{
  "he": {
    "introduction": "פסקה קצרה שמציגה את הקטגוריה (2-3 משפטים)",
    "description": "תיאור מלא ומפורט של הקטגוריה (5-8 משפטים)",
    "period": "התקופה ההיסטורית (אם רלוונטי)",
    "characteristics": ["מאפיין עיקרי 1", "מאפיין עיקרי 2", "מאפיין עיקרי 3", "מאפיין עיקרי 4", "מאפיין עיקרי 5"],
    "visualElements": ["אלמנט ויזואלי 1", "אלמנט ויזואלי 2", "אלמנט ויזואלי 3"],
    "historicalContext": "רקע היסטורי ותרבותי מפורט (3-5 משפטים)",
    "culturalContext": "השפעות תרבותיות ומשמעות (2-4 משפטים)",
    "applications": ["שימוש 1", "שימוש 2", "שימוש 3"]
  },
  "en": {
    "introduction": "Brief introduction to the category (2-3 sentences)",
    "description": "Full detailed description of the category (5-8 sentences)",
    "period": "Historical period (if applicable)",
    "characteristics": ["Key characteristic 1", "Key characteristic 2", "Key characteristic 3", "Key characteristic 4", "Key characteristic 5"],
    "visualElements": ["Visual element 1", "Visual element 2", "Visual element 3"],
    "historicalContext": "Detailed historical and cultural background (3-5 sentences)",
    "culturalContext": "Cultural influences and significance (2-4 sentences)",
    "applications": ["Use case 1", "Use case 2", "Use case 3"]
  }
}

IMPORTANT:
1. Keep descriptions professional and informative
2. Focus on design elements, aesthetics, and historical context
3. Make sure Hebrew content is in proper RTL Hebrew
4. Ensure English translations are accurate and natural
5. Return ONLY valid JSON, no markdown or extra text
`

  const result = await model.generateContent(prompt)
  const response = await result.response
  const text = response.text()

  // Parse JSON response
  const jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(jsonText) as LocalizedDetailedContent
}

/**
 * Generate detailed content for a subcategory
 */
export async function generateSubCategoryContent(
  name: { he: string; en: string },
  categoryName: { he: string; en: string },
  context?: {
    description?: { he: string; en: string }
    relatedStyles?: string[]
  }
): Promise<LocalizedDetailedContent> {
  const model = getGenAI().getGenerativeModel({ model: GEMINI_MODELS.FLASH_LITE })

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

Generate detailed content in BOTH Hebrew and English in the following JSON structure:
{
  "he": {
    "introduction": "פסקה קצרה שמציגה את תת-הקטגוריה (2-3 משפטים)",
    "description": "תיאור מלא ומפורט של תת-הקטגוריה (4-6 משפטים)",
    "characteristics": ["מאפיין 1", "מאפיין 2", "מאפיין 3", "מאפיין 4"],
    "visualElements": ["אלמנט ויזואלי 1", "אלמנט ויזואלי 2", "אלמנט ויזואלי 3", "אלמנט ויזואלי 4"],
    "colorGuidance": "הנחיות לגבי צבעים ופלטות (2-3 משפטים)",
    "materialGuidance": "הנחיות לגבי חומרים וטקסטורות (2-3 משפטים)",
    "applications": ["שימוש 1", "שימוש 2", "שימוש 3"]
  },
  "en": {
    "introduction": "Brief introduction to the sub-category (2-3 sentences)",
    "description": "Full detailed description of the sub-category (4-6 sentences)",
    "characteristics": ["Characteristic 1", "Characteristic 2", "Characteristic 3", "Characteristic 4"],
    "visualElements": ["Visual element 1", "Visual element 2", "Visual element 3", "Visual element 4"],
    "colorGuidance": "Color and palette guidance (2-3 sentences)",
    "materialGuidance": "Material and texture guidance (2-3 sentences)",
    "applications": ["Use case 1", "Use case 2", "Use case 3"]
  }
}

IMPORTANT:
1. Keep descriptions professional and informative
2. Focus on design elements specific to this sub-category
3. Make sure Hebrew content is in proper RTL Hebrew
4. Ensure English translations are accurate and natural
5. Return ONLY valid JSON, no markdown or extra text
`

  const result = await model.generateContent(prompt)
  const response = await result.response
  const text = response.text()

  // Parse JSON response
  const jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(jsonText) as LocalizedDetailedContent
}

/**
 * Enhanced poetic content for styles (inspired by docs/text-style-example.md)
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
export interface EnhancedDetailedContent extends DetailedContent {
  poeticIntro?: PoeticContent
}

/**
 * Extended LocalizedDetailedContent with poetic introduction
 */
export interface EnhancedLocalizedDetailedContent {
  he: EnhancedDetailedContent
  en: EnhancedDetailedContent
}

/**
 * Generate detailed content for a style with HYBRID poetic + factual approach
 *
 * This function generates comprehensive style content in two parts:
 * 1. Poetic introduction (inspired by text-style-example.md)
 * 2. Factual details (structured information)
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
    // Phase 2: Renamed from priceTier to priceLevel for consistency
    priceLevel?: 'REGULAR' | 'LUXURY'
  }
): Promise<EnhancedLocalizedDetailedContent> {
  const model = getGenAI().getGenerativeModel({
    model: GEMINI_MODELS.FLASH,
    generationConfig: {
      ...DEFAULT_CONFIG,
      temperature: 0.8, // Higher for creative poetic content
      responseMimeType: 'application/json',
    }
  })

  // Import prompt builders
  const { buildPoeticIntroPrompt } = await import('./prompts/style-poetic-intro')
  const { buildFactualDetailsPrompt } = await import('./prompts/style-factual-details')

  // Step 1: Generate poetic introduction
  console.log(`Generating poetic introduction for ${name.en}...`)
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

  const poeticResult = await model.generateContent(poeticPrompt)
  const poeticText = poeticResult.response.text()
  const poeticData = JSON.parse(poeticText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())

  // Step 2: Generate factual details - Phase 2: Pass priceLevel directly
  const priceLevel = context.priceLevel || 'REGULAR'
  console.log(`Generating factual details for ${name.en} (Price Level: ${priceLevel})...`)

  const factualPrompt = buildFactualDetailsPrompt({
    styleName: name,
    subCategory: context.subCategory,
    approach: context.approach,
    color: context.color,
    category: context.category,
    priceLevel: priceLevel, // Phase 2: Pass price level directly
  })

  const factualResult = await model.generateContent(factualPrompt)
  const factualText = factualResult.response.text()
  const factualData = JSON.parse(factualText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())

  // Combine poetic and factual content
  return {
    he: {
      ...factualData.factualDetails.he,
      poeticIntro: poeticData.poeticIntro.he,
    },
    en: {
      ...factualData.factualDetails.en,
      poeticIntro: poeticData.poeticIntro.en,
    },
  }
}

/**
 * Generate detailed content for an approach
 */
export async function generateApproachContent(
  name: { he: string; en: string },
  context?: {
    description?: { he: string; en: string }
    relatedStyles?: string[]
  }
): Promise<LocalizedDetailedContent> {
  const model = getGenAI().getGenerativeModel({ model: GEMINI_MODELS.FLASH_LITE })

  const prompt = `
You are an expert interior design philosopher and content writer. Generate comprehensive, detailed content for a design APPROACH.

Approach Name:
- Hebrew: ${name.he}
- English: ${name.en}

${context?.description ? `Existing Description:
- Hebrew: ${context.description.he}
- English: ${context.description.en}` : ''}

${context?.relatedStyles ? `Related Styles: ${context.relatedStyles.join(', ')}` : ''}

Generate detailed content in BOTH Hebrew and English in the following JSON structure:
{
  "he": {
    "introduction": "פסקה קצרה שמציגה את הגישה העיצובית (2-3 משפטים)",
    "description": "תיאור מלא של הגישה והפילוסופיה (5-8 משפטים)",
    "philosophy": "הפילוסופיה העיצובית המרכזית (3-5 משפטים)",
    "characteristics": ["עקרון מרכזי 1", "עקרון מרכזי 2", "עקרון מרכזי 3", "עקרון מרכזי 4", "עקרון מרכזי 5"],
    "visualElements": ["אלמנט ויזואלי 1", "אלמנט ויזואלי 2", "אלמנט ויזואלי 3"],
    "colorGuidance": "הנחיות כלליות לגבי צבעים בגישה זו (2-3 משפטים)",
    "materialGuidance": "הנחיות כלליות לגבי חומרים בגישה זו (2-3 משפטים)",
    "applications": ["תחום יישום 1", "תחום יישום 2", "תחום יישום 3"]
  },
  "en": {
    "introduction": "Brief introduction to the design approach (2-3 sentences)",
    "description": "Full description of the approach and philosophy (5-8 sentences)",
    "philosophy": "Core design philosophy (3-5 sentences)",
    "characteristics": ["Core principle 1", "Core principle 2", "Core principle 3", "Core principle 4", "Core principle 5"],
    "visualElements": ["Visual element 1", "Visual element 2", "Visual element 3"],
    "colorGuidance": "General color guidance for this approach (2-3 sentences)",
    "materialGuidance": "General material guidance for this approach (2-3 sentences)",
    "applications": ["Application area 1", "Application area 2", "Application area 3"]
  }
}

IMPORTANT:
1. Focus on the design philosophy and principles
2. Keep descriptions professional and thoughtful
3. Make sure Hebrew content is in proper RTL Hebrew
4. Ensure English translations are accurate and natural
5. Return ONLY valid JSON, no markdown or extra text
`

  const result = await model.generateContent(prompt)
  const response = await result.response
  const text = response.text()

  // Parse JSON response
  const jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(jsonText) as LocalizedDetailedContent
}

/**
 * Generate detailed content for a room type
 */
export async function generateRoomTypeContent(
  name: { he: string; en: string },
  context?: {
    description?: { he: string; en: string }
    category?: string
  }
): Promise<LocalizedDetailedContent> {
  const model = getGenAI().getGenerativeModel({ model: GEMINI_MODELS.FLASH_LITE })

  const prompt = `
You are an expert interior designer and content writer. Generate comprehensive, detailed content for a ROOM TYPE.

Room Type Name:
- Hebrew: ${name.he}
- English: ${name.en}

${context?.description ? `Existing Description:
- Hebrew: ${context.description.he}
- English: ${context.description.en}` : ''}

${context?.category ? `Category: ${context.category}` : ''}

Generate detailed content in BOTH Hebrew and English in the following JSON structure:
{
  "he": {
    "introduction": "פסקה קצרה שמציגה את סוג החדר (2-3 משפטים)",
    "description": "תיאור מפורט של סוג החדר ותפקידו (4-6 משפטים)",
    "characteristics": ["מאפיין פונקציונלי 1", "מאפיין פונקציונלי 2", "מאפיין פונקציונלי 3", "מאפיין פונקציונלי 4"],
    "visualElements": ["אלמנט עיצובי נפוץ 1", "אלמנט עיצובי נפוץ 2", "אלמנט עיצובי נפוץ 3"],
    "colorGuidance": "המלצות לגבי צבעים מתאימים לחדר זה (2-3 משפטים)",
    "materialGuidance": "המלצות לגבי חומרים וגימורים מתאימים (2-3 משפטים)",
    "applications": ["שימוש טיפוסי 1", "שימוש טיפוסי 2", "שימוש טיפוסי 3"]
  },
  "en": {
    "introduction": "Brief introduction to the room type (2-3 sentences)",
    "description": "Detailed description of the room type and its purpose (4-6 sentences)",
    "characteristics": ["Functional characteristic 1", "Functional characteristic 2", "Functional characteristic 3", "Functional characteristic 4"],
    "visualElements": ["Common design element 1", "Common design element 2", "Common design element 3"],
    "colorGuidance": "Recommendations for suitable colors for this room (2-3 sentences)",
    "materialGuidance": "Recommendations for suitable materials and finishes (2-3 sentences)",
    "applications": ["Typical use 1", "Typical use 2", "Typical use 3"]
  }
}

IMPORTANT:
1. Focus on functional and practical aspects
2. Include design recommendations specific to this room type
3. Make sure Hebrew content is in proper RTL Hebrew
4. Ensure English translations are accurate and natural
5. Return ONLY valid JSON, no markdown or extra text
`

  const result = await model.generateContent(prompt)
  const response = await result.response
  const text = response.text()

  // Parse JSON response
  const jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(jsonText) as LocalizedDetailedContent
}

/**
 * Generate color description using Gemini AI
 */
export async function generateColorDescription(
  name: { he: string; en: string },
  context: {
    hex: string
    category: string
  }
): Promise<{ he: string; en: string }> {
  const model = getGenAI().getGenerativeModel({ model: GEMINI_MODELS.FLASH_LITE })

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

**Output Format:**
Return ONLY a valid JSON object with this exact structure (no markdown, no code blocks):

{
  "he": "תיאור מפורט בעברית (3-4 משפטים)",
  "en": "Detailed description in English (3-4 sentences)"
}

**Guidelines:**
- Write in professional, designer-friendly language
- Be specific and practical
- Include design tips and applications
- Keep descriptions concise but informative (3-4 sentences)
- Focus on practical use in interior design
- Mention complementary colors or materials when relevant

Generate the description now:`

  try {
    const result = await model.generateContent(prompt)
    const response = result.response
    const text = response.text()

    // Clean response - remove markdown code blocks if present
    let jsonText = text.trim()
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '')
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '')
    }

    const parsed = JSON.parse(jsonText)
    return {
      he: parsed.he || '',
      en: parsed.en || '',
    }
  } catch (error) {
    console.error('Error generating color description:', error)
    throw error
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
 * Generate room-specific profile for a style
 *
 * Creates detailed, actionable guidance for applying a style in a specific room type
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
  }>
): Promise<RoomProfile> {
  const model = getGenAI().getGenerativeModel({
    model: GEMINI_MODELS.FLASH,
    generationConfig: {
      ...DEFAULT_CONFIG,
      responseMimeType: 'application/json',
    }
  })

  // Import prompt builder
  const { buildRoomProfilePrompt } = await import('./prompts/room-profile')

  console.log(`Generating room profile for ${roomType.name.en} in ${styleContext.name.en}...`)

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

  const result = await model.generateContent(prompt)
  const text = result.response.text()
  const data = JSON.parse(text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())

  return {
    roomTypeId: roomType.id,
    ...data.roomProfile,
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
  onProgress?: (current: number, total: number, roomName: string) => void
): Promise<RoomProfile[]> {
  const profiles: RoomProfile[] = []
  const total = roomTypes.length

  for (let i = 0; i < roomTypes.length; i++) {
    const roomType = roomTypes[i]

    try {
      onProgress?.(i + 1, total, roomType.name.en)

      const profile = await generateRoomProfileContent(roomType, styleContext, availableMaterials)
      profiles.push(profile)

      // Rate limiting: 2 second delay between requests (safe for paid tier)
      if (i < roomTypes.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    } catch (error) {
      console.error(`Error generating profile for ${roomType.name.en}:`, error)
      // Continue with other rooms even if one fails
    }
  }

  return profiles
}

/**
 * Batch generate content with rate limiting
 */
export async function batchGenerate<T>(
  items: T[],
  generateFn: (item: T) => Promise<LocalizedDetailedContent>,
  options: {
    batchSize?: number
    delayMs?: number
    onProgress?: (current: number, total: number) => void
  } = {}
): Promise<Array<{ item: T; content: LocalizedDetailedContent; error?: Error }>> {
  const { batchSize = 5, delayMs = 1000, onProgress } = options
  const results: Array<{ item: T; content: LocalizedDetailedContent; error?: Error }> = []

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)

    const batchResults = await Promise.allSettled(
      batch.map(async (item) => {
        try {
          const content = await generateFn(item)
          return { item, content }
        } catch (error) {
          return { item, content: {} as LocalizedDetailedContent, error: error as Error }
        }
      })
    )

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value)
      }
    }

    if (onProgress) {
      onProgress(Math.min(i + batchSize, items.length), items.length)
    }

    // Rate limiting delay
    if (i + batchSize < items.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }

  return results
}
