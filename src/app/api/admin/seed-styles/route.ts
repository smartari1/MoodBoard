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
  dryRun?: boolean
}

export async function POST(request: NextRequest) {
  try {
    const config: SeedConfig = await request.json()

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

        try {
          // Create SeedExecution record (status: 'running')
          const execution = await prisma.seedExecution.create({
            data: {
              executedAt: new Date(),
              executedBy: null, // TODO: Get from session when auth is ready
              config: {
                limit: config.limit,
                categoryFilter: config.categoryFilter,
                subCategoryFilter: config.subCategoryFilter,
                generateImages: config.generateImages ?? true,
                generateRoomProfiles: config.generateRoomProfiles ?? true,
                dryRun: config.dryRun ?? false,
              },
              result: {
                success: false,
                message: 'In progress...',
              },
              stats: {
                totalSubCategories: 0,
                alreadyGenerated: 0,
                pendingBeforeSeed: 0,
                created: 0,
                updated: 0,
                skipped: 0,
                errorsCount: 0,
              },
              errors: [],
              generatedStyles: [],
              estimatedCost: costBreakdown.grandTotal,
              actualCost: null,
              status: 'running',
              error: null,
            },
          })

          executionId = execution.id

          sendEvent('start', {
            message: 'Starting style generation...',
            config,
            executionId: execution.id,
            estimatedCost: costBreakdown.grandTotal,
            timestamp: new Date().toISOString(),
          })

          // Run seed with progress callbacks
          const result = await seedStyles({
            limit: config.limit,
            categoryFilter: config.categoryFilter,
            subCategoryFilter: config.subCategoryFilter,
            generateImages: config.generateImages ?? true,
            generateRoomProfiles: config.generateRoomProfiles ?? true,
            dryRun: config.dryRun ?? false,
            skipExisting: true,
            executionId: execution.id,
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

              // Add to generatedStyles array
              await prisma.seedExecution.update({
                where: { id: execution.id },
                data: {
                  generatedStyles: {
                    push: {
                      styleId: style.id,
                      slug: style.slug,
                      name: style.name,
                      subCategoryId: style.subCategoryId,
                      subCategory: style.subCategory.name.en,
                      approachId: style.approachId,
                      approach: style.approach.name.en,
                      colorId: style.colorId,
                      color: style.color.name.en,
                      adminEditUrl: `/admin/styles/${style.id}/edit`,
                      publicViewUrl: `/styles/${style.slug}`,
                    },
                  },
                },
              })

              sendEvent('style-completed', {
                styleId: style.id,
                styleName: style.name,
                slug: style.slug,
                timestamp: new Date().toISOString(),
              })
            },
          })

          const endTime = Date.now()
          const durationSeconds = Math.floor((endTime - startTime) / 1000)

          // Update SeedExecution with final results (status: 'completed')
          await prisma.seedExecution.update({
            where: { id: execution.id },
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

          // Send final result
          sendEvent('complete', {
            result,
            executionId: execution.id,
            duration: durationSeconds,
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
            executionId,
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
