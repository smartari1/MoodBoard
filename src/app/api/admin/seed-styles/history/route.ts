/**
 * Admin API: Seed Execution History
 *
 * Endpoint: GET /api/admin/seed-styles/history
 * Returns: List of all seed executions ordered by executedAt DESC
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'

interface ListQuery {
  limit?: number
  offset?: number
  status?: 'running' | 'completed' | 'failed' | 'stopped'
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    const status = searchParams.get('status') as ListQuery['status'] | null

    const where = status ? { status } : {}

    // Get total count
    const totalCount = await prisma.seedExecution.count({ where })

    // Get executions
    const executions = await prisma.seedExecution.findMany({
      where,
      orderBy: { executedAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        executedAt: true,
        completedAt: true,
        config: true,
        stats: true,
        estimatedCost: true,
        actualCost: true,
        duration: true,
        status: true,
        error: true,
        generatedStyles: {
          select: {
            styleId: true,
            name: true,
            slug: true,
            adminEditUrl: true,
          },
        },
      },
    })

    // Calculate summary for each execution
    const executionsWithSummary = executions.map((execution) => ({
      ...execution,
      summary: {
        totalStyles: execution.generatedStyles?.length || 0,
        created: execution.stats?.created || 0,
        updated: execution.stats?.updated || 0,
        errors: execution.stats?.errorsCount || 0,
        duration: execution.duration,
        cost: execution.actualCost || execution.estimatedCost,
      },
    }))

    return NextResponse.json({
      executions: executionsWithSummary,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
    })
  } catch (error) {
    console.error('Error fetching seed execution history:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
