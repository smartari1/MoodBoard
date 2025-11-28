/**
 * AI Telemetry & Observability
 *
 * OpenTelemetry-based monitoring for AI operations with:
 * - Automatic span creation for all AI calls
 * - Token usage tracking and cost estimation
 * - Performance metrics (time-to-first-chunk, latency)
 * - Error tracking and alerting
 * - Custom attributes for debugging
 *
 * Compatible with Langfuse, Datadog, New Relic, and other OpenTelemetry backends.
 */

import { AI_MODELS, type AIModelId } from './ai-sdk-provider'

/**
 * Telemetry configuration for AI SDK calls
 */
export interface AITelemetryConfig {
  /** Enable telemetry collection */
  isEnabled: boolean
  /** Record input prompts (disable for privacy) */
  recordInputs?: boolean
  /** Record output responses (disable for privacy) */
  recordOutputs?: boolean
  /** Function identifier for grouping traces */
  functionId?: string
  /** Custom metadata to include in traces */
  metadata?: Record<string, string | number | boolean>
}

/**
 * Default telemetry configuration
 */
export const DEFAULT_TELEMETRY_CONFIG: AITelemetryConfig = {
  isEnabled: true,
  recordInputs: true,
  recordOutputs: true,
}

/**
 * Create telemetry config for AI SDK experimental_telemetry option
 */
export function createTelemetryConfig(
  functionId: string,
  options?: Partial<AITelemetryConfig>
): { experimental_telemetry: AITelemetryConfig } {
  return {
    experimental_telemetry: {
      ...DEFAULT_TELEMETRY_CONFIG,
      ...options,
      functionId,
    },
  }
}

/**
 * Token usage metrics
 */
export interface TokenUsageMetrics {
  promptTokens: number
  completionTokens: number
  totalTokens: number
  reasoningTokens?: number
  cachedInputTokens?: number
}

/**
 * AI operation metrics
 */
export interface AIOperationMetrics {
  /** Operation identifier */
  operationId: string
  /** Function that was called */
  functionId: string
  /** Model used */
  model: AIModelId
  /** Start timestamp */
  startedAt: Date
  /** End timestamp */
  completedAt?: Date
  /** Duration in milliseconds */
  durationMs?: number
  /** Time to first chunk (streaming only) */
  timeToFirstChunkMs?: number
  /** Token usage */
  usage?: TokenUsageMetrics
  /** Estimated cost in USD */
  estimatedCostUsd?: number
  /** Finish reason */
  finishReason?: string
  /** Whether the operation succeeded */
  success: boolean
  /** Error message if failed */
  error?: string
  /** Number of retry attempts */
  retryAttempts?: number
  /** Custom metadata */
  metadata?: Record<string, unknown>
}

/**
 * Cost calculation based on model and token usage
 */
export function calculateCost(usage: TokenUsageMetrics, model: AIModelId): number {
  // Prices per 1K tokens (approximate, may vary)
  const prices: Record<string, { input: number; output: number }> = {
    [AI_MODELS.GEMINI_FLASH]: { input: 0.0000075, output: 0.00003 },
    [AI_MODELS.GEMINI_FLASH_EXP]: { input: 0.0000075, output: 0.00003 },
    [AI_MODELS.GEMINI_FLASH_LITE]: { input: 0.000004, output: 0.000016 },
    [AI_MODELS.GEMINI_PRO]: { input: 0.00025, output: 0.0005 },
    [AI_MODELS.CLAUDE_SONNET]: { input: 0.003, output: 0.015 },
    [AI_MODELS.CLAUDE_HAIKU]: { input: 0.00025, output: 0.00125 },
  }

  const modelPrices = prices[model] || prices[AI_MODELS.GEMINI_FLASH]
  const inputCost = (usage.promptTokens / 1000) * modelPrices.input
  const outputCost = (usage.completionTokens / 1000) * modelPrices.output

  return inputCost + outputCost
}

/**
 * Metrics collector for AI operations
 */
export class AIMetricsCollector {
  private operations: Map<string, AIOperationMetrics> = new Map()
  private completedOperations: AIOperationMetrics[] = []
  private maxCompletedOperations = 1000 // Keep last N operations

  /**
   * Start tracking a new operation
   */
  startOperation(
    operationId: string,
    functionId: string,
    model: AIModelId,
    metadata?: Record<string, unknown>
  ): void {
    this.operations.set(operationId, {
      operationId,
      functionId,
      model,
      startedAt: new Date(),
      success: false,
      metadata,
    })
  }

  /**
   * Record first chunk received (for streaming)
   */
  recordFirstChunk(operationId: string): void {
    const op = this.operations.get(operationId)
    if (op && !op.timeToFirstChunkMs) {
      op.timeToFirstChunkMs = Date.now() - op.startedAt.getTime()
    }
  }

  /**
   * Complete an operation successfully
   */
  completeOperation(
    operationId: string,
    usage: TokenUsageMetrics,
    finishReason?: string
  ): AIOperationMetrics | undefined {
    const op = this.operations.get(operationId)
    if (!op) return undefined

    op.completedAt = new Date()
    op.durationMs = op.completedAt.getTime() - op.startedAt.getTime()
    op.usage = usage
    op.estimatedCostUsd = calculateCost(usage, op.model)
    op.finishReason = finishReason
    op.success = true

    this.operations.delete(operationId)
    this.addCompletedOperation(op)

    return op
  }

  /**
   * Mark an operation as failed
   */
  failOperation(
    operationId: string,
    error: string,
    retryAttempts?: number
  ): AIOperationMetrics | undefined {
    const op = this.operations.get(operationId)
    if (!op) return undefined

    op.completedAt = new Date()
    op.durationMs = op.completedAt.getTime() - op.startedAt.getTime()
    op.success = false
    op.error = error
    op.retryAttempts = retryAttempts

    this.operations.delete(operationId)
    this.addCompletedOperation(op)

    return op
  }

  /**
   * Add to completed operations with size limit
   */
  private addCompletedOperation(op: AIOperationMetrics): void {
    this.completedOperations.push(op)
    if (this.completedOperations.length > this.maxCompletedOperations) {
      this.completedOperations.shift()
    }
  }

  /**
   * Get aggregated metrics
   */
  getAggregatedMetrics(): {
    totalOperations: number
    successfulOperations: number
    failedOperations: number
    totalTokens: number
    totalCostUsd: number
    averageDurationMs: number
    averageTimeToFirstChunkMs: number
    operationsByFunction: Record<string, number>
    operationsByModel: Record<string, number>
  } {
    const completed = this.completedOperations
    const successful = completed.filter((op) => op.success)
    const withDuration = completed.filter((op) => op.durationMs !== undefined)
    const withTtfc = completed.filter((op) => op.timeToFirstChunkMs !== undefined)

    const operationsByFunction: Record<string, number> = {}
    const operationsByModel: Record<string, number> = {}

    completed.forEach((op) => {
      operationsByFunction[op.functionId] = (operationsByFunction[op.functionId] || 0) + 1
      operationsByModel[op.model] = (operationsByModel[op.model] || 0) + 1
    })

    return {
      totalOperations: completed.length,
      successfulOperations: successful.length,
      failedOperations: completed.length - successful.length,
      totalTokens: completed.reduce((sum, op) => sum + (op.usage?.totalTokens || 0), 0),
      totalCostUsd: completed.reduce((sum, op) => sum + (op.estimatedCostUsd || 0), 0),
      averageDurationMs:
        withDuration.length > 0
          ? withDuration.reduce((sum, op) => sum + (op.durationMs || 0), 0) / withDuration.length
          : 0,
      averageTimeToFirstChunkMs:
        withTtfc.length > 0
          ? withTtfc.reduce((sum, op) => sum + (op.timeToFirstChunkMs || 0), 0) / withTtfc.length
          : 0,
      operationsByFunction,
      operationsByModel,
    }
  }

  /**
   * Get recent operations
   */
  getRecentOperations(limit = 10): AIOperationMetrics[] {
    return this.completedOperations.slice(-limit)
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.operations.clear()
    this.completedOperations = []
  }

  /**
   * Log metrics summary
   */
  logSummary(): void {
    const metrics = this.getAggregatedMetrics()
    console.log('\n📊 AI Metrics Summary:')
    console.log(`   Total Operations: ${metrics.totalOperations}`)
    console.log(`   Success Rate: ${((metrics.successfulOperations / metrics.totalOperations) * 100 || 0).toFixed(1)}%`)
    console.log(`   Total Tokens: ${metrics.totalTokens.toLocaleString()}`)
    console.log(`   Total Cost: $${metrics.totalCostUsd.toFixed(4)}`)
    console.log(`   Avg Duration: ${metrics.averageDurationMs.toFixed(0)}ms`)
    console.log(`   Avg TTFC: ${metrics.averageTimeToFirstChunkMs.toFixed(0)}ms`)
    console.log('')
  }
}

// Global metrics collector instance
export const globalMetricsCollector = new AIMetricsCollector()

/**
 * Generate a unique operation ID
 */
export function generateOperationId(): string {
  return `ai-op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Performance timer for measuring durations
 */
export class PerformanceTimer {
  private startTime: number
  private firstChunkTime?: number

  constructor() {
    this.startTime = performance.now()
  }

  recordFirstChunk(): number {
    if (!this.firstChunkTime) {
      this.firstChunkTime = performance.now()
    }
    return this.getTimeToFirstChunk()
  }

  getTimeToFirstChunk(): number {
    return this.firstChunkTime ? this.firstChunkTime - this.startTime : 0
  }

  getDuration(): number {
    return performance.now() - this.startTime
  }
}

/**
 * Create onFinish callback for token tracking
 */
export function createOnFinishCallback(
  operationId: string,
  onMetrics?: (metrics: AIOperationMetrics) => void
) {
  return (result: {
    text?: string
    finishReason?: string
    usage?: {
      promptTokens: number
      completionTokens: number
      totalTokens: number
    }
  }) => {
    if (result.usage) {
      const metrics = globalMetricsCollector.completeOperation(
        operationId,
        result.usage,
        result.finishReason
      )
      if (metrics) {
        onMetrics?.(metrics)
        console.log(
          `[AI Metrics] ${metrics.functionId}: ${metrics.usage?.totalTokens} tokens, ` +
            `$${metrics.estimatedCostUsd?.toFixed(4)}, ${metrics.durationMs}ms`
        )
      }
    }
  }
}
