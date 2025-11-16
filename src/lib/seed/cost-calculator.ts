/**
 * Cost Calculator for AI Style Generation
 *
 * Estimates and calculates costs for Gemini API usage during style seeding
 */

export interface CostBreakdown {
  textGeneration: {
    aiSelection: { count: number; costPer: number; total: number }
    mainContent: { count: number; costPer: number; total: number }
    roomProfiles: { count: number; costPer: number; total: number }
    subtotal: number
  }
  imageGeneration: {
    generalImages: { count: number; costPer: number; total: number }
    roomImages: { count: number; costPer: number; total: number }
    subtotal: number
  }
  grandTotal: number
}

/**
 * Gemini API Pricing (as of 2024)
 * Text Generation (Gemini 2.0 Flash / 2.5 Flash Lite):
 * - Input: $0.075 per 1M tokens
 * - Output: $0.30 per 1M tokens
 * - Avg request: ~$0.0005-0.001
 *
 * Image Generation (Gemini 2.5 Flash Image):
 * - ~$0.003 per image (estimated based on Imagen pricing)
 */
const PRICING = {
  // Text generation costs (conservative estimates)
  aiSelection: 0.0005, // AI selecting approach + color
  mainContent: 0.001, // Poetic + factual content generation
  roomProfile: 0.0005, // Single room profile generation

  // Image generation costs
  image: 0.003, // Per image (Gemini Flash Image)
}

/**
 * Calculate estimated cost for generating N styles
 */
export function calculateEstimatedCost(
  numStyles: number,
  options: {
    generateImages?: boolean
    generateRoomProfiles?: boolean
    roomTypesCount?: number
  } = {}
): CostBreakdown {
  const {
    generateImages = true,
    generateRoomProfiles = true,
    roomTypesCount = 24,
  } = options

  const breakdown: CostBreakdown = {
    textGeneration: {
      aiSelection: {
        count: numStyles,
        costPer: PRICING.aiSelection,
        total: numStyles * PRICING.aiSelection,
      },
      mainContent: {
        count: numStyles,
        costPer: PRICING.mainContent,
        total: numStyles * PRICING.mainContent,
      },
      roomProfiles: {
        count: generateRoomProfiles ? numStyles * roomTypesCount : 0,
        costPer: PRICING.roomProfile,
        total: generateRoomProfiles
          ? numStyles * roomTypesCount * PRICING.roomProfile
          : 0,
      },
      subtotal: 0,
    },
    imageGeneration: {
      generalImages: {
        count: generateImages ? numStyles * 3 : 0,
        costPer: PRICING.image,
        total: generateImages ? numStyles * 3 * PRICING.image : 0,
      },
      roomImages: {
        count:
          generateImages && generateRoomProfiles
            ? numStyles * roomTypesCount * 3
            : 0,
        costPer: PRICING.image,
        total:
          generateImages && generateRoomProfiles
            ? numStyles * roomTypesCount * 3 * PRICING.image
            : 0,
      },
      subtotal: 0,
    },
    grandTotal: 0,
  }

  // Calculate subtotals
  breakdown.textGeneration.subtotal =
    breakdown.textGeneration.aiSelection.total +
    breakdown.textGeneration.mainContent.total +
    breakdown.textGeneration.roomProfiles.total

  breakdown.imageGeneration.subtotal =
    breakdown.imageGeneration.generalImages.total +
    breakdown.imageGeneration.roomImages.total

  breakdown.grandTotal =
    breakdown.textGeneration.subtotal + breakdown.imageGeneration.subtotal

  return breakdown
}

/**
 * Calculate cost for a single style (for display)
 */
export function calculatePerStyleCost(options: {
  generateImages?: boolean
  generateRoomProfiles?: boolean
  roomTypesCount?: number
} = {}): CostBreakdown {
  return calculateEstimatedCost(1, options)
}

/**
 * Format cost for display
 */
export function formatCost(cost: number): string {
  return `$${cost.toFixed(cost < 1 ? 3 : 2)}`
}

/**
 * Calculate actual cost from API metrics (if available)
 * This is a placeholder for when we have actual API usage metrics
 */
export function calculateActualCost(metrics: {
  textRequests?: number
  imageRequests?: number
  tokensInput?: number
  tokensOutput?: number
}): number | null {
  // TODO: Implement when we have actual API metrics
  // For now, return null to indicate we're using estimates
  return null
}

/**
 * Estimate generation time per style (minutes)
 */
export function estimateGenerationTime(
  numStyles: number,
  options: {
    generateImages?: boolean
    generateRoomProfiles?: boolean
  } = {}
): number {
  const { generateImages = true, generateRoomProfiles = true } = options

  // Base time per style:
  // - AI selection: ~15 seconds
  // - Text generation: ~30 seconds
  // - 3 general images: ~1 minute
  // - Room profiles (text): ~2 minutes (24 rooms × 5 seconds)
  // - Room images: ~3 minutes (72 images × 2.5 seconds)

  let timePerStyle = 0.75 // Base (selection + text) in minutes

  if (generateImages) {
    timePerStyle += 1 // General images
  }

  if (generateRoomProfiles) {
    timePerStyle += 2 // Room profile text
    if (generateImages) {
      timePerStyle += 3 // Room images
    }
  }

  return Math.ceil(numStyles * timePerStyle)
}

/**
 * Format time estimate for display
 */
export function formatTimeEstimate(minutes: number): string {
  if (minutes < 60) {
    return `~${minutes} min`
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `~${hours}h ${mins}m` : `~${hours}h`
}
