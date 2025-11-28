/**
 * Vercel AI SDK Provider Configuration
 *
 * Centralized configuration for AI providers with:
 * - Google Gemini as primary provider
 * - Anthropic Claude as fallback
 * - Automatic retry with exponential backoff
 * - Cost tracking and logging
 */

import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createAnthropic } from '@ai-sdk/anthropic'
import { generateObject, generateText, streamText } from 'ai'
import { z } from 'zod'

// Provider instances (lazy initialization)
let googleProvider: ReturnType<typeof createGoogleGenerativeAI> | null = null
let anthropicProvider: ReturnType<typeof createAnthropic> | null = null

/**
 * Get Google Gemini provider instance
 */
export function getGoogleProvider() {
  if (!googleProvider) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable is required')
    }
    googleProvider = createGoogleGenerativeAI({
      apiKey: process.env.GEMINI_API_KEY,
    })
  }
  return googleProvider
}

/**
 * Get Anthropic Claude provider instance
 */
export function getAnthropicProvider() {
  if (!anthropicProvider) {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn('ANTHROPIC_API_KEY not set - fallback provider unavailable')
      return null
    }
    anthropicProvider = createAnthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })
  }
  return anthropicProvider
}

/**
 * Available models configuration
 */
export const AI_MODELS = {
  // Google Gemini models
  GEMINI_FLASH: 'gemini-2.0-flash',
  GEMINI_FLASH_EXP: 'gemini-2.0-flash-exp',
  GEMINI_FLASH_LITE: 'gemini-2.0-flash-lite-preview-02-05',
  GEMINI_FLASH_IMAGE: 'gemini-2.5-flash-image', // Image generation model
  GEMINI_PRO: 'gemini-1.5-pro',
  // Anthropic models (fallback)
  CLAUDE_SONNET: 'claude-sonnet-4-20250514',
  CLAUDE_HAIKU: 'claude-3-5-haiku-20241022',
} as const

export type AIModelId = typeof AI_MODELS[keyof typeof AI_MODELS]

/**
 * Default generation configuration
 */
export const DEFAULT_GENERATION_CONFIG = {
  temperature: 0.7,
  topP: 0.95,
  topK: 40,
  maxTokens: 8192,
}

/**
 * Generation options
 */
export interface GenerationOptions {
  model?: AIModelId
  temperature?: number
  maxTokens?: number
  retries?: number
  retryDelayMs?: number
  useFallback?: boolean
  onRetry?: (attempt: number, error: Error) => void
  onTokenUsage?: (usage: { promptTokens: number; completionTokens: number; totalTokens: number }) => void
}

/**
 * Sleep helper for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Generate structured object with automatic retry and fallback
 * Note: Using 'as any' for model type due to SDK v4/v2 type differences - runtime works correctly
 */
export async function generateStructuredObject<T extends z.ZodType>(
  prompt: string,
  schema: T,
  options: GenerationOptions = {}
): Promise<{ object: z.infer<T>; usage: { promptTokens: number; completionTokens: number; totalTokens: number } }> {
  const {
    model = AI_MODELS.GEMINI_FLASH,
    temperature = DEFAULT_GENERATION_CONFIG.temperature,
    maxTokens = DEFAULT_GENERATION_CONFIG.maxTokens,
    retries = 3,
    retryDelayMs = 1000,
    useFallback = true,
    onRetry,
    onTokenUsage,
  } = options

  let lastError: Error | null = null
  const google = getGoogleProvider()

  // Try with primary provider (Google Gemini)
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const googleModel = google(model)

      const result = await generateObject({
        // Type assertion needed due to SDK v4/v2 type differences
        model: googleModel as any,
        prompt,
        schema,
        temperature,
        maxTokens,
      })

      const usage = {
        promptTokens: result.usage?.promptTokens ?? 0,
        completionTokens: result.usage?.completionTokens ?? 0,
        totalTokens: result.usage?.totalTokens ?? 0,
      }

      onTokenUsage?.(usage)

      return { object: result.object, usage }
    } catch (error) {
      lastError = error as Error
      console.error(`[AI SDK] Attempt ${attempt}/${retries} failed:`, error instanceof Error ? error.message : error)

      onRetry?.(attempt, lastError)

      if (attempt < retries) {
        const delay = retryDelayMs * Math.pow(2, attempt - 1) // Exponential backoff
        console.log(`[AI SDK] Retrying in ${delay}ms...`)
        await sleep(delay)
      }
    }
  }

  // Try fallback provider (Anthropic) if available
  if (useFallback) {
    const anthropic = getAnthropicProvider()
    if (anthropic) {
      console.log('[AI SDK] Trying fallback provider (Anthropic)...')
      try {
        const anthropicModel = anthropic(AI_MODELS.CLAUDE_SONNET)

        const result = await generateObject({
          model: anthropicModel as any,
          prompt,
          schema,
          temperature,
          maxTokens,
        })

        const usage = {
          promptTokens: result.usage?.promptTokens ?? 0,
          completionTokens: result.usage?.completionTokens ?? 0,
          totalTokens: result.usage?.totalTokens ?? 0,
        }

        onTokenUsage?.(usage)

        return { object: result.object, usage }
      } catch (fallbackError) {
        console.error('[AI SDK] Fallback provider also failed:', fallbackError)
      }
    }
  }

  throw lastError || new Error('All generation attempts failed')
}

/**
 * Generate text with automatic retry and fallback
 */
export async function generateTextContent(
  prompt: string,
  options: GenerationOptions = {}
): Promise<{ text: string; usage: { promptTokens: number; completionTokens: number; totalTokens: number } }> {
  const {
    model = AI_MODELS.GEMINI_FLASH,
    temperature = DEFAULT_GENERATION_CONFIG.temperature,
    maxTokens = DEFAULT_GENERATION_CONFIG.maxTokens,
    retries = 3,
    retryDelayMs = 1000,
    useFallback = true,
    onRetry,
    onTokenUsage,
  } = options

  let lastError: Error | null = null
  const google = getGoogleProvider()

  // Try with primary provider (Google Gemini)
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const googleModel = google(model)

      const result = await generateText({
        model: googleModel as any,
        prompt,
        temperature,
        maxTokens,
      })

      const usage = {
        promptTokens: result.usage?.promptTokens ?? 0,
        completionTokens: result.usage?.completionTokens ?? 0,
        totalTokens: result.usage?.totalTokens ?? 0,
      }

      onTokenUsage?.(usage)

      return { text: result.text, usage }
    } catch (error) {
      lastError = error as Error
      console.error(`[AI SDK] Text generation attempt ${attempt}/${retries} failed:`, error instanceof Error ? error.message : error)

      onRetry?.(attempt, lastError)

      if (attempt < retries) {
        const delay = retryDelayMs * Math.pow(2, attempt - 1)
        console.log(`[AI SDK] Retrying in ${delay}ms...`)
        await sleep(delay)
      }
    }
  }

  // Try fallback provider
  if (useFallback) {
    const anthropic = getAnthropicProvider()
    if (anthropic) {
      console.log('[AI SDK] Trying fallback provider (Anthropic)...')
      try {
        const anthropicModel = anthropic(AI_MODELS.CLAUDE_SONNET)

        const result = await generateText({
          model: anthropicModel as any,
          prompt,
          temperature,
          maxTokens,
        })

        const usage = {
          promptTokens: result.usage?.promptTokens ?? 0,
          completionTokens: result.usage?.completionTokens ?? 0,
          totalTokens: result.usage?.totalTokens ?? 0,
        }

        onTokenUsage?.(usage)

        return { text: result.text, usage }
      } catch (fallbackError) {
        console.error('[AI SDK] Fallback provider also failed:', fallbackError)
      }
    }
  }

  throw lastError || new Error('All text generation attempts failed')
}

/**
 * Stream text with automatic retry (returns the result object for streaming)
 */
export function streamTextContent(
  prompt: string,
  options: GenerationOptions = {}
) {
  const {
    model = AI_MODELS.GEMINI_FLASH,
    temperature = DEFAULT_GENERATION_CONFIG.temperature,
    maxTokens = DEFAULT_GENERATION_CONFIG.maxTokens,
  } = options

  const google = getGoogleProvider()
  const googleModel = google(model)

  return streamText({
    model: googleModel as any,
    prompt,
    temperature,
    maxTokens,
  })
}

/**
 * Cost estimation based on token usage
 * Prices are approximate and may change
 */
export function estimateCost(usage: { promptTokens: number; completionTokens: number }, model: AIModelId): number {
  const prices: Record<string, { input: number; output: number }> = {
    [AI_MODELS.GEMINI_FLASH]: { input: 0.00001875, output: 0.000075 },
    [AI_MODELS.GEMINI_FLASH_EXP]: { input: 0.00001875, output: 0.000075 },
    [AI_MODELS.GEMINI_FLASH_LITE]: { input: 0.00001, output: 0.00004 },
    [AI_MODELS.GEMINI_PRO]: { input: 0.00035, output: 0.00105 },
    [AI_MODELS.CLAUDE_SONNET]: { input: 0.003, output: 0.015 },
    [AI_MODELS.CLAUDE_HAIKU]: { input: 0.001, output: 0.005 },
  }

  const modelPrices = prices[model] || prices[AI_MODELS.GEMINI_FLASH]
  return (usage.promptTokens * modelPrices.input) + (usage.completionTokens * modelPrices.output)
}

/**
 * Token usage tracker for monitoring costs
 */
export class TokenUsageTracker {
  private totalUsage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    estimatedCost: 0,
  }

  track(usage: { promptTokens: number; completionTokens: number; totalTokens: number }, model: AIModelId) {
    this.totalUsage.promptTokens += usage.promptTokens
    this.totalUsage.completionTokens += usage.completionTokens
    this.totalUsage.totalTokens += usage.totalTokens
    this.totalUsage.estimatedCost += estimateCost(usage, model)
  }

  getUsage() {
    return { ...this.totalUsage }
  }

  reset() {
    this.totalUsage = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      estimatedCost: 0,
    }
  }

  log(prefix = '[Token Usage]') {
    console.log(`${prefix} Prompt: ${this.totalUsage.promptTokens}, Completion: ${this.totalUsage.completionTokens}, Total: ${this.totalUsage.totalTokens}, Cost: $${this.totalUsage.estimatedCost.toFixed(4)}`)
  }
}
