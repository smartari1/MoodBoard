/**
 * useStreamProgress Hook
 *
 * React hook for consuming AI SDK streaming progress with:
 * - Real-time progress updates
 * - Automatic reconnection
 * - Error handling
 * - Metrics tracking
 *
 * Usage:
 * ```tsx
 * const { start, stop, progress, isStreaming, metrics, error } = useStreamProgress({
 *   endpoint: '/api/admin/seed-styles',
 *   onComplete: (result) => console.log('Done!', result),
 * })
 *
 * // Start streaming with config
 * await start({ limit: 5, generateImages: true })
 * ```
 */

'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

/**
 * Progress event from the server
 */
export interface StreamProgressEvent {
  type: string
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
 * Aggregated metrics from the stream
 */
export interface StreamMetrics {
  totalTokens: number
  estimatedCost: number
  totalDuration: number
  eventsReceived: number
  startedAt?: Date
  completedAt?: Date
}

/**
 * Completed style information
 */
export interface CompletedStyle {
  styleId: string
  styleName: { he: string; en: string }
  slug: string
}

/**
 * Hook options
 */
export interface UseStreamProgressOptions {
  /** API endpoint to stream from */
  endpoint: string
  /** Callback when streaming completes */
  onComplete?: (result: Record<string, unknown>) => void
  /** Callback on error */
  onError?: (error: Error) => void
  /** Callback for each progress event */
  onProgress?: (event: StreamProgressEvent) => void
  /** Callback when a style is completed */
  onStyleCompleted?: (style: CompletedStyle) => void
  /** Maximum number of progress events to keep */
  maxProgressEvents?: number
  /** Auto-scroll to latest progress */
  autoScroll?: boolean
}

/**
 * Hook return type
 */
export interface UseStreamProgressReturn {
  /** Start streaming with given config */
  start: (config: Record<string, unknown>) => Promise<void>
  /** Stop the current stream */
  stop: () => void
  /** Whether currently streaming */
  isStreaming: boolean
  /** Whether resuming a previous execution */
  isResuming: boolean
  /** Current progress events */
  progress: StreamProgressEvent[]
  /** Latest progress message */
  latestProgress: StreamProgressEvent | null
  /** Current progress percentage */
  percentage: number | null
  /** Aggregated metrics */
  metrics: StreamMetrics
  /** Completed styles */
  completedStyles: CompletedStyle[]
  /** Execution ID (for resume) */
  executionId: string | null
  /** Error message if any */
  error: string | null
  /** Final result when complete */
  result: Record<string, unknown> | null
  /** Clear all state */
  reset: () => void
}

/**
 * React hook for streaming progress consumption
 */
export function useStreamProgress(options: UseStreamProgressOptions): UseStreamProgressReturn {
  const {
    endpoint,
    onComplete,
    onError,
    onProgress,
    onStyleCompleted,
    maxProgressEvents = 100,
  } = options

  // State
  const [isStreaming, setIsStreaming] = useState(false)
  const [isResuming, setIsResuming] = useState(false)
  const [progress, setProgress] = useState<StreamProgressEvent[]>([])
  const [latestProgress, setLatestProgress] = useState<StreamProgressEvent | null>(null)
  const [percentage, setPercentage] = useState<number | null>(null)
  const [completedStyles, setCompletedStyles] = useState<CompletedStyle[]>([])
  const [executionId, setExecutionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Record<string, unknown> | null>(null)
  const [metrics, setMetrics] = useState<StreamMetrics>({
    totalTokens: 0,
    estimatedCost: 0,
    totalDuration: 0,
    eventsReceived: 0,
  })

  // Refs
  const abortControllerRef = useRef<AbortController | null>(null)

  /**
   * Reset all state
   */
  const reset = useCallback(() => {
    setProgress([])
    setLatestProgress(null)
    setPercentage(null)
    setCompletedStyles([])
    setExecutionId(null)
    setError(null)
    setResult(null)
    setMetrics({
      totalTokens: 0,
      estimatedCost: 0,
      totalDuration: 0,
      eventsReceived: 0,
    })
  }, [])

  /**
   * Stop the current stream
   */
  const stop = useCallback(() => {
    abortControllerRef.current?.abort()
    setIsStreaming(false)
    setIsResuming(false)
  }, [])

  /**
   * Start streaming
   */
  const start = useCallback(
    async (config: Record<string, unknown>) => {
      // Reset state for new stream (unless resuming)
      if (!config.resumeExecutionId) {
        reset()
      } else {
        setError(null)
        setResult(null)
      }

      setIsStreaming(true)
      setIsResuming(!!config.resumeExecutionId)
      setMetrics((prev) => ({ ...prev, startedAt: new Date() }))

      const controller = new AbortController()
      abortControllerRef.current = controller

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config),
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const reader = response.body?.getReader()
        if (!reader) {
          throw new Error('No response body')
        }

        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (!line.trim()) continue

            // Parse SSE format
            const eventMatch = line.match(/^event:\s*(.+)$/m)
            const dataMatch = line.match(/^data:\s*(.+)$/m)

            if (!eventMatch || !dataMatch) continue

            const eventType = eventMatch[1].trim()
            let eventData: Record<string, unknown>

            try {
              eventData = JSON.parse(dataMatch[1])
            } catch {
              console.warn('Failed to parse event data:', dataMatch[1])
              continue
            }

            const event: StreamProgressEvent = {
              type: eventType,
              message: (eventData.message as string) || '',
              timestamp: (eventData.timestamp as string) || new Date().toISOString(),
              data: eventData,
              metrics: eventData.metrics as StreamProgressEvent['metrics'],
            }

            // Update state based on event type
            switch (eventType) {
              case 'start':
                if (eventData.executionId) {
                  setExecutionId(eventData.executionId as string)
                }
                break

              case 'progress':
                if (eventData.current && eventData.total) {
                  setPercentage(
                    Math.round(((eventData.current as number) / (eventData.total as number)) * 100)
                  )
                }
                break

              case 'style-completed':
                const style: CompletedStyle = {
                  styleId: eventData.styleId as string,
                  styleName: eventData.styleName as { he: string; en: string },
                  slug: eventData.slug as string,
                }
                setCompletedStyles((prev) => [...prev, style])
                onStyleCompleted?.(style)
                break

              case 'metrics':
                if (event.metrics) {
                  setMetrics((prev) => ({
                    ...prev,
                    totalTokens: prev.totalTokens + (event.metrics?.tokensUsed || 0),
                    estimatedCost: prev.estimatedCost + (event.metrics?.estimatedCost || 0),
                    totalDuration: prev.totalDuration + (event.metrics?.duration || 0),
                  }))
                }
                break

              case 'complete':
                setResult(eventData.result as Record<string, unknown>)
                setMetrics((prev) => ({
                  ...prev,
                  completedAt: new Date(),
                }))
                onComplete?.(eventData.result as Record<string, unknown>)
                break

              case 'error':
                setError((eventData.error as string) || 'Unknown error')
                onError?.(new Error((eventData.error as string) || 'Unknown error'))
                break
            }

            // Update progress list
            setProgress((prev) => {
              const updated = [...prev, event]
              return updated.slice(-maxProgressEvents)
            })
            setLatestProgress(event)
            setMetrics((prev) => ({ ...prev, eventsReceived: prev.eventsReceived + 1 }))

            // Call progress callback
            onProgress?.(event)
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          setError('Stopped by user')
        } else {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error'
          setError(errorMessage)
          onError?.(err instanceof Error ? err : new Error(errorMessage))
        }
      } finally {
        setIsStreaming(false)
        setIsResuming(false)
        setMetrics((prev) => ({
          ...prev,
          completedAt: prev.completedAt || new Date(),
        }))
      }
    },
    [endpoint, maxProgressEvents, onComplete, onError, onProgress, onStyleCompleted, reset]
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  return {
    start,
    stop,
    isStreaming,
    isResuming,
    progress,
    latestProgress,
    percentage,
    metrics,
    completedStyles,
    executionId,
    error,
    result,
    reset,
  }
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.round((ms % 60000) / 1000)
  return `${minutes}m ${seconds}s`
}

/**
 * Format cost in USD
 */
export function formatCost(cost: number): string {
  if (cost < 0.01) return `$${cost.toFixed(4)}`
  if (cost < 1) return `$${cost.toFixed(3)}`
  return `$${cost.toFixed(2)}`
}

/**
 * Format token count
 */
export function formatTokens(tokens: number): string {
  if (tokens < 1000) return tokens.toString()
  if (tokens < 1000000) return `${(tokens / 1000).toFixed(1)}K`
  return `${(tokens / 1000000).toFixed(2)}M`
}
