/**
 * AI Streaming Utilities
 *
 * Professional streaming implementation using AI SDK data stream protocol:
 * - Real-time progress updates
 * - Token usage streaming
 * - Error handling with graceful degradation
 * - Custom data parts for rich UI updates
 */

import { streamText, StreamTextResult } from 'ai'
import { getGoogleProvider, AI_MODELS, type AIModelId, type GenerationOptions } from './ai-sdk-provider'
import {
  globalMetricsCollector,
  generateOperationId,
  createTelemetryConfig,
  type AIOperationMetrics,
} from './telemetry'

/**
 * Progress event types for seed generation
 */
export type ProgressEventType =
  | 'start'
  | 'progress'
  | 'style-started'
  | 'style-completed'
  | 'room-started'
  | 'room-completed'
  | 'image-started'
  | 'image-completed'
  | 'metrics'
  | 'complete'
  | 'error'

/**
 * Progress event data structure
 */
export interface ProgressEvent {
  type: ProgressEventType
  message: string
  timestamp: string
  data?: Record<string, unknown>
  metrics?: {
    tokensUsed?: number
    estimatedCost?: number
    duration?: number
  }
}

/**
 * Create a Server-Sent Events stream for progress updates
 */
export function createProgressStream() {
  const encoder = new TextEncoder()
  let controller: ReadableStreamDefaultController<Uint8Array>

  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c
    },
  })

  const sendEvent = (type: ProgressEventType, data: Omit<ProgressEvent, 'type' | 'timestamp'>) => {
    const event: ProgressEvent = {
      type,
      timestamp: new Date().toISOString(),
      ...data,
    }
    const message = `event: ${type}\ndata: ${JSON.stringify(event)}\n\n`
    controller.enqueue(encoder.encode(message))
  }

  const close = () => {
    controller.close()
  }

  return { stream, sendEvent, close }
}

/**
 * Enhanced streaming options with progress callbacks
 */
export interface StreamWithProgressOptions extends GenerationOptions {
  /** Unique operation identifier */
  operationId?: string
  /** Function name for telemetry */
  functionId: string
  /** Callback for progress updates */
  onProgress?: (event: ProgressEvent) => void
  /** Callback for metrics after completion */
  onMetrics?: (metrics: AIOperationMetrics) => void
  /** Enable experimental telemetry */
  enableTelemetry?: boolean
}

/**
 * Stream text with progress tracking and telemetry
 */
export async function streamTextWithProgress(
  prompt: string,
  options: StreamWithProgressOptions
): Promise<{
  text: string
  usage: { promptTokens: number; completionTokens: number; totalTokens: number }
  metrics?: AIOperationMetrics
}> {
  const {
    model = AI_MODELS.GEMINI_FLASH,
    temperature = 0.7,
    maxTokens = 8192,
    operationId = generateOperationId(),
    functionId,
    onProgress,
    onMetrics,
    enableTelemetry = true,
  } = options

  const google = getGoogleProvider()
  const googleModel = google(model)

  // Start tracking
  globalMetricsCollector.startOperation(operationId, functionId, model)

  onProgress?.({
    type: 'start',
    message: `Starting ${functionId}...`,
    timestamp: new Date().toISOString(),
  })

  try {
    const result = await streamText({
      model: googleModel as any,
      prompt,
      temperature,
      maxTokens,
      ...(enableTelemetry ? createTelemetryConfig(functionId) : {}),
      onChunk: ({ chunk }) => {
        // Record first chunk for TTFC metric
        if (chunk.type === 'text-delta') {
          globalMetricsCollector.recordFirstChunk(operationId)
        }
      },
    })

    // Consume the stream to get full text
    let fullText = ''
    for await (const textPart of result.textStream) {
      fullText += textPart
    }

    // Get usage after stream completes
    const usage = await result.usage
    const finishReason = await result.finishReason

    // Complete tracking
    const metrics = globalMetricsCollector.completeOperation(
      operationId,
      {
        promptTokens: usage?.promptTokens ?? 0,
        completionTokens: usage?.completionTokens ?? 0,
        totalTokens: usage?.totalTokens ?? 0,
      },
      finishReason
    )

    onProgress?.({
      type: 'complete',
      message: `Completed ${functionId}`,
      timestamp: new Date().toISOString(),
      metrics: metrics
        ? {
            tokensUsed: metrics.usage?.totalTokens,
            estimatedCost: metrics.estimatedCostUsd,
            duration: metrics.durationMs,
          }
        : undefined,
    })

    if (metrics) {
      onMetrics?.(metrics)
    }

    return {
      text: fullText,
      usage: {
        promptTokens: usage?.promptTokens ?? 0,
        completionTokens: usage?.completionTokens ?? 0,
        totalTokens: usage?.totalTokens ?? 0,
      },
      metrics,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    globalMetricsCollector.failOperation(operationId, errorMessage)

    onProgress?.({
      type: 'error',
      message: `Error in ${functionId}: ${errorMessage}`,
      timestamp: new Date().toISOString(),
    })

    throw error
  }
}

/**
 * Create a Next.js compatible streaming response
 */
export function createStreamingResponse(
  streamFn: () => Promise<StreamTextResult<Record<string, never>, never>>,
  options?: {
    onFinish?: (result: { text: string; usage: unknown }) => void | Promise<void>
  }
): Response {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const result = await streamFn()

        // Stream text chunks
        for await (const chunk of result.textStream) {
          const data = JSON.stringify({ type: 'text', content: chunk })
          controller.enqueue(encoder.encode(`data: ${data}\n\n`))
        }

        // Send final usage data
        const usage = await result.usage
        const usageData = JSON.stringify({ type: 'usage', usage })
        controller.enqueue(encoder.encode(`data: ${usageData}\n\n`))

        // Call onFinish callback
        const text = await result.text
        await options?.onFinish?.({ text, usage })

        controller.close()
      } catch (error) {
        const errorData = JSON.stringify({
          type: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        controller.enqueue(encoder.encode(`data: ${errorData}\n\n`))
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

/**
 * Batch progress tracker for multiple operations
 */
export class BatchProgressTracker {
  private total: number
  private completed = 0
  private failed = 0
  private startTime: Date
  private onProgress?: (event: ProgressEvent) => void

  constructor(total: number, onProgress?: (event: ProgressEvent) => void) {
    this.total = total
    this.startTime = new Date()
    this.onProgress = onProgress
  }

  start(message: string): void {
    this.onProgress?.({
      type: 'start',
      message,
      timestamp: new Date().toISOString(),
      data: { total: this.total },
    })
  }

  progress(message: string, data?: Record<string, unknown>): void {
    this.onProgress?.({
      type: 'progress',
      message,
      timestamp: new Date().toISOString(),
      data: {
        completed: this.completed,
        failed: this.failed,
        total: this.total,
        percentage: Math.round(((this.completed + this.failed) / this.total) * 100),
        ...data,
      },
    })
  }

  completeOne(message: string, data?: Record<string, unknown>): void {
    this.completed++
    this.progress(message, data)
  }

  failOne(message: string, error: string): void {
    this.failed++
    this.onProgress?.({
      type: 'error',
      message,
      timestamp: new Date().toISOString(),
      data: { error, completed: this.completed, failed: this.failed, total: this.total },
    })
  }

  complete(message: string, data?: Record<string, unknown>): void {
    const duration = Date.now() - this.startTime.getTime()
    this.onProgress?.({
      type: 'complete',
      message,
      timestamp: new Date().toISOString(),
      data: {
        completed: this.completed,
        failed: this.failed,
        total: this.total,
        durationMs: duration,
        ...data,
      },
    })
  }

  getStats() {
    return {
      completed: this.completed,
      failed: this.failed,
      total: this.total,
      remaining: this.total - this.completed - this.failed,
      percentage: Math.round(((this.completed + this.failed) / this.total) * 100),
      durationMs: Date.now() - this.startTime.getTime(),
    }
  }
}
