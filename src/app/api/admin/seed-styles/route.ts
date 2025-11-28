/**
 * Admin API: Seed Styles with Real-Time Progress
 *
 * Endpoint: POST /api/admin/seed-styles
 * Returns: Server-Sent Events stream with real-time progress
 */

import { NextRequest } from 'next/server'
import { seedStyles } from '@/lib/seed/seed-service'
import { prisma } from '@/lib/db'
import { calculateEstimatedCost } from '@/lib/seed/cost-calculator'

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes max (can be extended)

interface SeedConfig {
  limit?: number
  categoryFilter?: string
  subCategoryFilter?: string
  generateImages?: boolean
  generateRoomProfiles?: boolean
  roomTypeFilter?: string[]  // Array of room type slugs to generate
  dryRun?: boolean
  resumeExecutionId?: string
  // Manual generation mode
  manualMode?: boolean
  approachId?: string
  colorId?: string
  // Phase 2: Price level
  priceLevel?: 'REGULAR' | 'LUXURY' | 'RANDOM'
  // Phase 2: Full image generation (60 rooms + 25 materials + 15 textures)
  phase2FullGeneration?: boolean
  roomImageCount?: number
  materialImageCount?: number
  textureImageCount?: number
}

export async function POST(request: NextRequest) {
  try {
    const config: SeedConfig = await request.json()

    // Debug: Log received config
    console.log('📥 API received config:', {
      resumeExecutionId: config.resumeExecutionId,
      limit: config.limit,
      isResume: !!config.resumeExecutionId,
    })

    // Calculate estimated cost
    const costBreakdown = calculateEstimatedCost(config.limit || 60, {
      generateImages: config.generateImages ?? true,
      generateRoomProfiles: config.generateRoomProfiles ?? true,
    })

    // Create a readable stream for Server-Sent Events
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: string, data: any) => {
          const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
          controller.enqueue(encoder.encode(message))
        }

        let executionId: string | null = null
        const startTime = Date.now()
        let execution: any

        try {
          // Resume existing execution or create new one
          if (config.resumeExecutionId) {
            console.log('🔍 Looking for execution to resume:', config.resumeExecutionId)

            // Fetch existing execution
            execution = await prisma.seedExecution.findUnique({
              where: { id: config.resumeExecutionId },
            })

            if (!execution) {
              throw new Error(`Execution ${config.resumeExecutionId} not found`)
            }

            console.log('✅ Found execution:', {
              id: execution.id,
              status: execution.status,
              generatedStylesCount: execution.generatedStyles?.length || 0,
            })

            // Update status to running
            execution = await prisma.seedExecution.update({
              where: { id: config.resumeExecutionId },
              data: {
                status: 'running',
                error: null,
              },
            })

            executionId = String(execution.id)
            console.log('🔄 Resumed execution ID:', executionId)
          } else {
            // Create new SeedExecution record (status: 'running')
            execution = await prisma.seedExecution.create({
              data: {
                executedAt: new Date(),
                executedBy: null, // TODO: Get from session when auth is ready
                config: {
                  set: {
                    limit: config.limit,
                    categoryFilter: config.categoryFilter,
                    subCategoryFilter: config.subCategoryFilter,
                    generateImages: config.generateImages ?? true,
                    generateRoomProfiles: config.generateRoomProfiles ?? true,
                    roomTypeFilter: config.roomTypeFilter || [],
                    dryRun: config.dryRun ?? false,
                    manualMode: config.manualMode,
                    approachId: config.approachId,
                    colorId: config.colorId,
                    priceLevel: config.priceLevel || 'RANDOM', // Phase 2
                  },
                },
                result: {
                  set: {
                    success: false,
                    message: 'In progress...',
                  },
                },
                stats: {
                  set: {
                    totalSubCategories: 0,
                    alreadyGenerated: 0,
                    pendingBeforeSeed: 0,
                    created: 0,
                    updated: 0,
                    skipped: 0,
                    errorsCount: 0,
                  },
                },
                errors: [],
                generatedStyles: [],
                estimatedCost: costBreakdown.grandTotal,
                actualCost: null,
                status: 'running',
                error: null,
              },
            })

            executionId = String(execution.id)
          }

          // Use config from execution if resuming (convert to plain object)
          const effectiveConfig = config.resumeExecutionId
            ? {
                limit: execution.config.limit,
                categoryFilter: execution.config.categoryFilter,
                subCategoryFilter: execution.config.subCategoryFilter,
                generateImages: execution.config.generateImages,
                generateRoomProfiles: execution.config.generateRoomProfiles,
                roomTypeFilter: execution.config.roomTypeFilter,
                dryRun: execution.config.dryRun,
                manualMode: execution.config.manualMode,
                approachId: execution.config.approachId,
                colorId: execution.config.colorId,
                priceLevel: execution.config.priceLevel || 'RANDOM', // Phase 2
                // Phase 2: Full generation options
                phase2FullGeneration: execution.config.phase2FullGeneration || false,
                roomImageCount: execution.config.roomImageCount || 60,
                materialImageCount: execution.config.materialImageCount || 25,
                textureImageCount: execution.config.textureImageCount || 15,
              }
            : config

          sendEvent('start', {
            message: config.resumeExecutionId
              ? `Resuming execution (${Number(execution.generatedStyles?.length || 0)} styles already generated)...`
              : 'Starting style generation...',
            config: {
              limit: effectiveConfig.limit,
              categoryFilter: effectiveConfig.categoryFilter,
              subCategoryFilter: effectiveConfig.subCategoryFilter,
              generateImages: effectiveConfig.generateImages,
              generateRoomProfiles: effectiveConfig.generateRoomProfiles,
              roomTypeFilter: effectiveConfig.roomTypeFilter,
              dryRun: effectiveConfig.dryRun,
              priceLevel: effectiveConfig.priceLevel || 'RANDOM', // Phase 2
            },
            executionId: String(execution.id),
            estimatedCost: Number(costBreakdown.grandTotal),
            isResume: !!config.resumeExecutionId,
            timestamp: new Date().toISOString(),
          })

          // Run seed with progress callbacks
          const result = await seedStyles({
            limit: effectiveConfig.limit,
            categoryFilter: effectiveConfig.categoryFilter,
            subCategoryFilter: effectiveConfig.subCategoryFilter,
            generateImages: effectiveConfig.generateImages ?? true,
            generateRoomProfiles: effectiveConfig.generateRoomProfiles ?? true,
            roomTypeFilter: effectiveConfig.roomTypeFilter,
            dryRun: effectiveConfig.dryRun ?? false,
            skipExisting: !effectiveConfig.manualMode, // Allow override in manual mode
            executionId: String(execution.id),
            manualMode: effectiveConfig.manualMode,
            approachId: effectiveConfig.approachId,
            colorId: effectiveConfig.colorId,
            priceLevel: effectiveConfig.priceLevel, // Phase 2
            // Phase 2: Full image generation options
            phase2FullGeneration: effectiveConfig.phase2FullGeneration ?? false,
            roomImageCount: effectiveConfig.roomImageCount ?? 60,
            materialImageCount: effectiveConfig.materialImageCount ?? 25,
            textureImageCount: effectiveConfig.textureImageCount ?? 15,
            onProgress: (message: string, current?: number, total?: number) => {
              sendEvent('progress', {
                message,
                current,
                total,
                percentage: current && total ? Math.round((current / total) * 100) : undefined,
                timestamp: new Date().toISOString(),
              })
            },
            onStyleCompleted: async (styleId: string, styleName: { he: string; en: string }) => {
              // Fetch the complete style data for the reference
              const style = await prisma.style.findUnique({
                where: { id: styleId },
                include: {
                  subCategory: { select: { id: true, name: true } },
                  approach: { select: { id: true, name: true } },
                  color: { select: { id: true, name: true } },
                },
              })

              if (!style) return

              // Add to generatedStyles array (convert Prisma objects to plain objects)
              await prisma.seedExecution.update({
                where: { id: String(execution.id) },
                data: {
                  generatedStyles: {
                    push: {
                      styleId: String(style.id),
                      slug: String(style.slug),
                      name: { he: String(style.name.he), en: String(style.name.en) },
                      subCategoryId: String(style.subCategoryId),
                      subCategory: String(style.subCategory.name.en),
                      approachId: String(style.approachId),
                      approach: String(style.approach.name.en),
                      colorId: String(style.colorId),
                      color: String(style.color.name.en),
                      adminEditUrl: `/admin/styles/${String(style.id)}/edit`,
                      publicViewUrl: `/styles/${String(style.slug)}`,
                    },
                  },
                },
              })

              sendEvent('style-completed', {
                styleId: String(style.id),
                styleName: { he: String(style.name.he), en: String(style.name.en) },
                slug: String(style.slug),
                timestamp: new Date().toISOString(),
              })
            },
          })

          const endTime = Date.now()
          const durationSeconds = Math.floor((endTime - startTime) / 1000)

          // Update SeedExecution with final results (status: 'completed')
          await prisma.seedExecution.update({
            where: { id: String(execution.id) },
            data: {
              completedAt: new Date(),
              result: {
                success: result.success,
                message: result.success ? 'Completed successfully' : 'Completed with errors',
              },
              stats: {
                totalSubCategories: result.stats.styles.totalSubCategories || 0,
                alreadyGenerated: result.stats.styles.alreadyGenerated || 0,
                pendingBeforeSeed: result.stats.styles.pendingBeforeSeed || 0,
                created: result.stats.styles.created,
                updated: result.stats.styles.updated,
                skipped: result.stats.styles.skipped,
                errorsCount: result.errors.length,
              },
              errors: result.errors.map((e) => ({
                entity: e.entity,
                error: e.error,
              })),
              duration: durationSeconds,
              status: 'completed',
            },
          })

          // Send final result (explicitly serialize to prevent circular references)
          sendEvent('complete', {
            result: {
              success: Boolean(result.success),
              stats: {
                categories: {
                  created: Number(result.stats.categories.created),
                  updated: Number(result.stats.categories.updated),
                  skipped: Number(result.stats.categories.skipped),
                },
                subCategories: {
                  created: Number(result.stats.subCategories.created),
                  updated: Number(result.stats.subCategories.updated),
                  skipped: Number(result.stats.subCategories.skipped),
                },
                approaches: {
                  created: Number(result.stats.approaches.created),
                  updated: Number(result.stats.approaches.updated),
                  skipped: Number(result.stats.approaches.skipped),
                },
                roomTypes: {
                  created: Number(result.stats.roomTypes.created),
                  updated: Number(result.stats.roomTypes.updated),
                  skipped: Number(result.stats.roomTypes.skipped),
                },
                styles: {
                  created: Number(result.stats.styles.created),
                  updated: Number(result.stats.styles.updated),
                  skipped: Number(result.stats.styles.skipped),
                  totalSubCategories: result.stats.styles.totalSubCategories !== undefined
                    ? Number(result.stats.styles.totalSubCategories)
                    : undefined,
                  alreadyGenerated: result.stats.styles.alreadyGenerated !== undefined
                    ? Number(result.stats.styles.alreadyGenerated)
                    : undefined,
                  pendingBeforeSeed: result.stats.styles.pendingBeforeSeed !== undefined
                    ? Number(result.stats.styles.pendingBeforeSeed)
                    : undefined,
                },
              },
              errors: result.errors.map((e) => ({
                entity: String(e.entity),
                error: String(e.error),
              })),
            },
            executionId: String(execution.id),
            duration: Number(durationSeconds),
            timestamp: new Date().toISOString(),
          })

          controller.close()
        } catch (error) {
          // Update SeedExecution with error (status: 'failed')
          if (executionId) {
            const endTime = Date.now()
            const durationSeconds = Math.floor((endTime - startTime) / 1000)

            await prisma.seedExecution.update({
              where: { id: executionId },
              data: {
                completedAt: new Date(),
                result: {
                  success: false,
                  message: error instanceof Error ? error.message : String(error),
                },
                duration: durationSeconds,
                status: 'failed',
                error: error instanceof Error ? error.message : String(error),
              },
            })
          }

          sendEvent('error', {
            error: error instanceof Error ? error.message : String(error),
            executionId: executionId ? String(executionId) : null,
            timestamp: new Date().toISOString(),
          })
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
