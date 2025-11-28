/**
 * AI-Powered Style Selection Service (AI SDK Version)
 *
 * Intelligently selects the most fitting Approach and Color for each SubCategory
 * using Vercel AI SDK with:
 * - Zod schema validation for type-safe outputs
 * - Automatic retry with exponential backoff
 * - Provider fallback (Gemini -> Claude)
 * - Token usage tracking and cost estimation
 * - OpenTelemetry observability
 */

import { z } from 'zod'
import type { SubCategory, Approach, Color, Category } from '@prisma/client'
import { generateStructuredObject, AI_MODELS } from './ai-sdk-provider'
import { globalMetricsCollector, generateOperationId } from './telemetry'

/**
 * Zod schema for selection result
 */
const SelectionResultSchema = z.object({
  approachId: z.string().describe('MongoDB ObjectId of the selected approach'),
  colorId: z.string().describe('MongoDB ObjectId of the selected color'),
  reasoning: z.object({
    he: z.string().describe('Hebrew explanation of why this combination is most fitting'),
    en: z.string().describe('English explanation of why this combination is most fitting'),
  }),
  confidence: z.number().min(0).max(1).describe('Confidence score from 0.0 to 1.0'),
})

type SelectionResultType = z.infer<typeof SelectionResultSchema>

/**
 * Selection context with all available options
 */
export interface SelectionContext {
  subCategory: SubCategory & { category: Category }
  approaches: Approach[]
  colors: Color[]
}

/**
 * Selection result returned by the AI
 */
export interface SelectionResult {
  approachId: string
  colorId: string
  reasoning: {
    he: string
    en: string
  }
  confidence: number
}

/**
 * Format array for prompt display
 */
function formatArray(arr: string[]): string {
  if (!arr || arr.length === 0) return 'N/A'
  return arr.map((item, idx) => `  ${idx + 1}. ${item}`).join('\n')
}

/**
 * Build the selection prompt
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
Name: ${(subCategory.name as any).he} / ${(subCategory.name as any).en}
Category: ${(subCategory.category.name as any).he} / ${(subCategory.category.name as any).en}
Period: ${detailedContent?.he?.period || 'Unknown'}

Description (Hebrew): ${detailedContent?.he?.description || (subCategory.description as any)?.he || 'N/A'}
Description (English): ${detailedContent?.en?.description || (subCategory.description as any)?.en || 'N/A'}

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
${approaches
  .map((a, idx) => {
    const content = a.detailedContent as any
    return `
${idx + 1}. ID: ${a.id}
   Name: ${(a.name as any).he} / ${(a.name as any).en}
   Description: ${content?.he?.description || (a.description as any)?.he || 'N/A'}
   Philosophy: ${content?.he?.philosophy || 'N/A'}
`
  })
  .join('\n')}

---

**AVAILABLE COLORS** (choose ONE):
${colors
  .map(
    (c, idx) => `
${idx + 1}. ID: ${c.id}
   Name: ${(c.name as any).he} / ${(c.name as any).en}
   Hex: ${c.hex}
   Category: ${c.category}
   Description: ${(c.description as any)?.he || 'N/A'}
`
  )
  .join('\n')}

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

**IMPORTANT**:
- Use actual MongoDB ObjectIds from the lists above
- Confidence should be 0.0-1.0 (how certain you are this is optimal)
- Reasoning should explain the historical/cultural/aesthetic fit in 2-3 sentences`
}

/**
 * Fallback selection strategy if AI fails
 */
function getDefaultSelection(context: SelectionContext): SelectionResult {
  const { approaches, colors } = context

  // Default to "Timeless" approach if available, otherwise first approach
  const defaultApproach =
    approaches.find(
      (a) =>
        a.slug === 'timeless' || (a.name as any).en.toLowerCase().includes('timeless')
    ) || approaches[0]

  // Default to neutral colors (cream, beige, off-white)
  const defaultColor =
    colors.find(
      (c) =>
        c.category === 'neutral' &&
        ((c.name as any).en.toLowerCase().includes('cream') ||
          (c.name as any).en.toLowerCase().includes('beige') ||
          (c.name as any).en.toLowerCase().includes('off-white'))
    ) ||
    colors.find((c) => c.category === 'neutral') ||
    colors[0]

  return {
    approachId: defaultApproach.id,
    colorId: defaultColor.id,
    reasoning: {
      he: `בחירת ברירת מחדל: גישה "${(defaultApproach.name as any).he}" וצבע "${(defaultColor.name as any).he}" כשילוב בטוח ואוניברסלי`,
      en: `Default selection: "${(defaultApproach.name as any).en}" approach and "${(defaultColor.name as any).en}" color as a safe, universal combination`,
    },
    confidence: 0.5,
  }
}

/**
 * Analyzes a sub-category and selects the most fitting approach and color
 * using AI SDK with structured output validation
 */
export async function selectOptimalApproachAndColor(
  context: SelectionContext
): Promise<SelectionResult> {
  const { subCategory, approaches, colors } = context
  const operationId = generateOperationId()
  const functionId = 'style-selector'

  // Start metrics tracking
  globalMetricsCollector.startOperation(operationId, functionId, AI_MODELS.GEMINI_FLASH_LITE)

  const prompt = buildSelectionPrompt(subCategory, approaches, colors)

  console.log(`\n[AI-SDK] Style Selection for: ${(subCategory.name as any).en}`)
  console.log(`   Operation ID: ${operationId}`)
  console.log(`   Approaches available: ${approaches.length}`)
  console.log(`   Colors available: ${colors.length}`)

  try {
    const { object: result, usage } = await generateStructuredObject(
      prompt,
      SelectionResultSchema,
      {
        model: AI_MODELS.GEMINI_FLASH_LITE,
        temperature: 0.3, // Lower temperature for more consistent selections
        retries: 3,
        useFallback: true, // Fall back to Claude if Gemini fails
      }
    )

    // Validate the selection
    const selectedApproach = approaches.find((a) => a.id === result.approachId)
    const selectedColor = colors.find((c) => c.id === result.colorId)

    if (!selectedApproach || !selectedColor) {
      console.error(
        `   Invalid selection returned by AI: approachId=${result.approachId}, colorId=${result.colorId}`
      )
      throw new Error('Invalid approach or color ID returned by AI')
    }

    // Complete metrics
    globalMetricsCollector.completeOperation(operationId, usage, 'stop')

    console.log(`   Selected: ${(selectedApproach.name as any).en} + ${(selectedColor.name as any).en}`)
    console.log(`   Confidence: ${(result.confidence * 100).toFixed(0)}%`)
    console.log(`   Tokens used: ${usage.totalTokens}`)

    return {
      approachId: result.approachId,
      colorId: result.colorId,
      reasoning: result.reasoning,
      confidence: result.confidence,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    globalMetricsCollector.failOperation(operationId, errorMessage)

    console.error(`   Error in AI selection: ${errorMessage}`)
    console.log(`   Falling back to default selection`)

    // Fallback to default selection
    return getDefaultSelection(context)
  }
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

  console.log(`\n[AI-SDK] Batch Style Selection: ${total} sub-categories`)

  for (let i = 0; i < subCategories.length; i++) {
    const subCategory = subCategories[i]

    onProgress?.(
      `Selecting optimal combination for ${(subCategory.name as any).en}...`,
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

      // Rate limiting: delay between selections
      if (i < subCategories.length - 1) {
        await delay(1500) // 1.5 second delay (safe for paid tier)
      }
    } catch (error) {
      console.error(`Error selecting for ${(subCategory.name as any).en}:`, error)
      onProgress?.(
        `Error selecting for ${(subCategory.name as any).en}, using default`,
        i + 1,
        total
      )

      // Use fallback
      const fallback = getDefaultSelection({ subCategory, approaches, colors })
      results.set(subCategory.id, fallback)
    }
  }

  console.log(`\n[AI-SDK] Batch Selection Complete: ${results.size}/${total} successful`)

  return results
}

/**
 * Utility: Delay helper
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
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

  const approach = approaches.find((a) => a.id === approachId)
  const color = colors.find((c) => c.id === colorId)

  if (!approach || !color) {
    return {
      isValid: false,
      explanation: 'Invalid selection: Approach or Color not found',
    }
  }

  return {
    isValid: true,
    explanation: `Selected "${(approach.name as any).en}" approach with "${(color.name as any).en}" (${color.hex}) color.
Confidence: ${(selection.confidence * 100).toFixed(0)}%
Reasoning: ${selection.reasoning.en}`,
  }
}
