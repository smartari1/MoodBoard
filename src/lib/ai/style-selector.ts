/**
 * AI-Powered Style Selection Service
 *
 * Intelligently selects the most fitting Approach and Color for each SubCategory
 * based on historical context, design philosophy, and aesthetic coherence.
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import type { SubCategory, Approach, Color, Category } from '@prisma/client'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '')

interface SelectionContext {
  subCategory: SubCategory & { category: Category }
  approaches: Approach[]
  colors: Color[]
}

interface SelectionResult {
  approachId: string
  colorId: string
  reasoning: {
    he: string
    en: string
  }
  confidence: number
}

/**
 * Analyzes a sub-category and selects the most fitting approach and color
 */
export async function selectOptimalApproachAndColor(
  context: SelectionContext
): Promise<SelectionResult> {
  const { subCategory, approaches, colors } = context

  const prompt = buildSelectionPrompt(subCategory, approaches, colors)

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash-lite-preview-02-05',
    generationConfig: {
      temperature: 0.3, // Lower temperature for more consistent selections
      responseMimeType: 'application/json',
    }
  })

  try {
    const result = await model.generateContent(prompt)
    const response = result.response.text()
    const parsed = JSON.parse(response)

    // Validate the selection
    const selectedApproach = approaches.find(a => a.id === parsed.approachId)
    const selectedColor = colors.find(c => c.id === parsed.colorId)

    if (!selectedApproach || !selectedColor) {
      throw new Error('Invalid approach or color ID returned by AI')
    }

    return {
      approachId: parsed.approachId,
      colorId: parsed.colorId,
      reasoning: parsed.reasoning,
      confidence: parsed.confidence || 0.8,
    }
  } catch (error) {
    console.error('Error in AI selection:', error)
    // Fallback to default selection
    return getDefaultSelection(context)
  }
}

/**
 * Builds the AI prompt for intelligent selection
 */
function buildSelectionPrompt(
  subCategory: SubCategory & { category: Category },
  approaches: Approach[],
  colors: Color[]
): string {
  const detailedContent = subCategory.detailedContent as any

  return `You are an expert interior designer tasked with selecting the MOST FITTING design approach and primary color for a specific design style.

**CRITICAL WEIGHTING**:
- Sub-Category characteristics: 60% (HIGHEST priority)
- Design Approach compatibility: 25%
- Color aesthetic fit: 15%

**SUB-CATEGORY TO ANALYZE**:
Name: ${subCategory.name.he} / ${subCategory.name.en}
Category: ${subCategory.category.name.he} / ${subCategory.category.name.en}
Period: ${detailedContent?.he?.period || 'Unknown'}

Description (Hebrew): ${detailedContent?.he?.description || subCategory.description?.he || 'N/A'}
Description (English): ${detailedContent?.en?.description || subCategory.description?.en || 'N/A'}

Historical Context (Hebrew): ${detailedContent?.he?.historicalContext || 'N/A'}
Historical Context (English): ${detailedContent?.en?.historicalContext || 'N/A'}

Cultural Context (Hebrew): ${detailedContent?.he?.culturalContext || 'N/A'}
Cultural Context (English): ${detailedContent?.en?.culturalContext || 'N/A'}

Key Characteristics:
${formatArray(detailedContent?.he?.characteristics || [])}

Visual Elements:
${formatArray(detailedContent?.he?.visualElements || [])}

---

**AVAILABLE APPROACHES** (choose ONE):
${approaches.map((a, idx) => {
  const content = a.detailedContent as any
  return `
${idx + 1}. ID: ${a.id}
   Name: ${a.name.he} / ${a.name.en}
   Description: ${content?.he?.description || a.description?.he || 'N/A'}
   Philosophy: ${content?.he?.philosophy || 'N/A'}
`}).join('\n')}

---

**AVAILABLE COLORS** (choose ONE):
${colors.map((c, idx) => `
${idx + 1}. ID: ${c.id}
   Name: ${c.name.he} / ${c.name.en}
   Hex: ${c.hex}
   Category: ${c.category}
   Description: ${c.description?.he || 'N/A'}
`).join('\n')}

---

**YOUR TASK**:
1. Analyze the sub-category's historical period, cultural context, and design philosophy
2. Determine which APPROACH best complements this style's essence (60% weight on sub-category compatibility)
3. Determine which COLOR is most historically/aesthetically appropriate for this style
4. Consider:
   - Historical accuracy (if period-specific)
   - Cultural authenticity (if region-specific)
   - Design coherence (visual harmony)
   - Practical applications (which rooms suit this combination)

**RETURN FORMAT** (JSON only):
{
  "approachId": "the MongoDB ObjectId of selected approach",
  "colorId": "the MongoDB ObjectId of selected color",
  "reasoning": {
    "he": "הסבר בעברית מדוע השילוב הזה הוא המתאים ביותר לסגנון זה (2-3 משפטים)",
    "en": "Explanation in English why this combination is most fitting for this style (2-3 sentences)"
  },
  "confidence": 0.95
}

**IMPORTANT**:
- Return ONLY valid JSON, no markdown, no explanation outside the JSON
- Use actual MongoDB ObjectIds from the lists above
- Confidence should be 0.0-1.0 (how certain you are this is optimal)
- Reasoning should explain the historical/cultural/aesthetic fit`
}

/**
 * Fallback selection strategy if AI fails
 */
function getDefaultSelection(context: SelectionContext): SelectionResult {
  const { subCategory, approaches, colors } = context

  // Default to "Timeless" approach if available, otherwise first approach
  const defaultApproach = approaches.find(a =>
    a.slug === 'timeless' || a.name.en.toLowerCase().includes('timeless')
  ) || approaches[0]

  // Default to neutral colors (cream, beige, off-white)
  const defaultColor = colors.find(c =>
    c.category === 'neutral' && (
      c.name.en.toLowerCase().includes('cream') ||
      c.name.en.toLowerCase().includes('beige') ||
      c.name.en.toLowerCase().includes('off-white')
    )
  ) || colors.find(c => c.category === 'neutral') || colors[0]

  return {
    approachId: defaultApproach.id,
    colorId: defaultColor.id,
    reasoning: {
      he: `בחירת ברירת מחדל: גישה "${defaultApproach.name.he}" וצבע "${defaultColor.name.he}" כשילוב בטוח ואוניברסלי`,
      en: `Default selection: "${defaultApproach.name.en}" approach and "${defaultColor.name.en}" color as a safe, universal combination`
    },
    confidence: 0.5,
  }
}

/**
 * Format array for prompt display
 */
function formatArray(arr: string[]): string {
  if (!arr || arr.length === 0) return 'N/A'
  return arr.map((item, idx) => `  ${idx + 1}. ${item}`).join('\n')
}

/**
 * Batch selection for multiple sub-categories with rate limiting
 */
export async function batchSelectOptimalCombinations(
  subCategories: (SubCategory & { category: Category })[],
  approaches: Approach[],
  colors: Color[],
  onProgress?: (message: string, current: number, total: number) => void
): Promise<Map<string, SelectionResult>> {
  const results = new Map<string, SelectionResult>()
  const total = subCategories.length

  for (let i = 0; i < subCategories.length; i++) {
    const subCategory = subCategories[i]

    onProgress?.(
      `Selecting optimal combination for ${subCategory.name.en}...`,
      i + 1,
      total
    )

    try {
      const selection = await selectOptimalApproachAndColor({
        subCategory,
        approaches,
        colors,
      })

      results.set(subCategory.id, selection)

      // Rate limiting: 15 requests per minute for Gemini free tier
      // Paid tier can remove or reduce this delay
      if (i < subCategories.length - 1) {
        await delay(2000) // 2 second delay between selections (safe for paid tier)
      }
    } catch (error) {
      console.error(`Error selecting for ${subCategory.name.en}:`, error)
      onProgress?.(
        `❌ Error selecting for ${subCategory.name.en}, using default`,
        i + 1,
        total
      )

      // Use fallback
      const fallback = getDefaultSelection({ subCategory, approaches, colors })
      results.set(subCategory.id, fallback)
    }
  }

  return results
}

/**
 * Utility: Delay helper
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Validate and explain a selection (for debugging/review)
 */
export async function explainSelection(
  selection: SelectionResult,
  context: SelectionContext
): Promise<{ isValid: boolean; explanation: string }> {
  const { approachId, colorId } = selection
  const { approaches, colors } = context

  const approach = approaches.find(a => a.id === approachId)
  const color = colors.find(c => c.id === colorId)

  if (!approach || !color) {
    return {
      isValid: false,
      explanation: 'Invalid selection: Approach or Color not found',
    }
  }

  return {
    isValid: true,
    explanation: `Selected "${approach.name.en}" approach with "${color.name.en}" (${color.hex}) color.
Confidence: ${(selection.confidence * 100).toFixed(0)}%
Reasoning: ${selection.reasoning.en}`,
  }
}
