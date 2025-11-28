/**
 * AI Module Index
 *
 * Professional-grade AI infrastructure using Vercel AI SDK:
 * - Structured outputs with Zod validation
 * - Automatic retry with exponential backoff
 * - Provider fallback (Gemini -> Claude)
 * - OpenTelemetry-based observability
 * - Real-time streaming with progress tracking
 * - Cost estimation and token tracking
 *
 * Usage:
 *   import { generateStyleContent, globalMetricsCollector } from '@/lib/ai'
 */

// =============================================================================
// AI SDK Provider (core)
// =============================================================================
export {
  getGoogleProvider,
  getAnthropicProvider,
  AI_MODELS,
  DEFAULT_GENERATION_CONFIG,
  generateStructuredObject,
  generateTextContent,
  streamTextContent,
  estimateCost,
  TokenUsageTracker,
  type GenerationOptions,
  type AIModelId,
} from './ai-sdk-provider'

// =============================================================================
// Telemetry & Observability
// =============================================================================
export {
  createTelemetryConfig,
  calculateCost,
  AIMetricsCollector,
  globalMetricsCollector,
  generateOperationId,
  PerformanceTimer,
  createOnFinishCallback,
  DEFAULT_TELEMETRY_CONFIG,
  type AITelemetryConfig,
  type TokenUsageMetrics,
  type AIOperationMetrics,
} from './telemetry'

// =============================================================================
// Streaming Utilities
// =============================================================================
export {
  createProgressStream,
  streamTextWithProgress,
  createStreamingResponse,
  BatchProgressTracker,
  type ProgressEventType,
  type ProgressEvent,
  type StreamWithProgressOptions,
} from './streaming'

// =============================================================================
// Content Schemas (Zod)
// =============================================================================
export * from './schemas/content-schemas'

// =============================================================================
// Content Generation (AI SDK based)
// =============================================================================
export {
  generateCategoryContent,
  generateSubCategoryContent,
  generateApproachContent,
  generateRoomTypeContent,
  generateColorDescription,
  generateStyleContent,
  generateRoomProfileContent,
  batchGenerateRoomProfiles,
  getGlobalTokenUsage,
  resetGlobalTokenUsage,
  logTokenUsage,
  type LocalizedDetailedContent,
  type PoeticContent,
  type EnhancedDetailedContent,
  type EnhancedLocalizedDetailedContent,
  type RoomProfile,
} from './gemini-ai-sdk'

// =============================================================================
// Image Generation (AI SDK wrapper)
// =============================================================================
export {
  generateImages,
  generateAndUploadImages,
  batchGenerateImages,
  generateStyleImages,
  generateStyleRoomImages,
  generateGoldenScenes,
  type ImageGenerationOptions,
  type ImageGenerationResult,
} from './image-generation-ai-sdk'

// =============================================================================
// Style Selection (AI SDK based)
// =============================================================================
export {
  selectOptimalApproachAndColor,
  batchSelectOptimalCombinations,
  explainSelection,
  type SelectionContext,
  type SelectionResult,
} from './style-selector-ai-sdk'

// =============================================================================
// Material Matching (AI Sub-Agent)
// =============================================================================
export {
  // Core functions
  matchMaterial,
  matchMaterialsBatch,
  smartMatchMaterial,
  smartMatchMaterialsBatch,
  heuristicMaterialMatch,
  // Configuration
  MATERIAL_MATCH_CONFIG,
  // Schemas
  MaterialMatchSchema,
  NewMaterialSchema,
  MaterialMatchBatchResponseSchema,
  // Types
  type MaterialMatch,
  type NewMaterial,
  type MaterialMatchBatchResponse,
  type MaterialMatchContext,
  type AvailableMaterial,
  type AvailableCategory,
  type AvailableType,
  type AvailableTexture,
} from './material-matcher'

// =============================================================================
// Legacy type exports (backward compatibility)
// These types are used throughout the codebase
// =============================================================================
export type {
  DetailedContent as LegacyDetailedContent,
  EntityType,
} from './schemas/content-schemas'

// Legacy model constants (for reference only - use AI_MODELS instead)
export const GEMINI_MODELS = {
  FLASH: 'gemini-2.0-flash',
  FLASH_LITE: 'gemini-2.0-flash-lite-preview-02-05',
  PRO: 'gemini-1.5-pro',
} as const
