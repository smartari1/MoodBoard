/**
 * Admin API: Seed Execution Detail
 *
 * Endpoint: GET /api/admin/seed-styles/history/[id]
 * Returns: Detailed information about a specific seed execution
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'

interface RouteContext {
  params: {
    id: string
  }
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = params

    const execution = await prisma.seedExecution.findUnique({
      where: { id },
    })

    if (!execution) {
      return NextResponse.json({ error: 'Execution not found' }, { status: 404 })
    }

    // Calculate additional metrics
    const summary = {
      totalStyles: execution.generatedStyles?.length || 0,
      created: execution.stats?.created || 0,
      updated: execution.stats?.updated || 0,
      errors: execution.stats?.errorsCount || 0,
      duration: execution.duration,
      cost: execution.actualCost || execution.estimatedCost,
      averageTimePerStyle: execution.duration
        ? Math.round(execution.duration / (execution.stats?.created || 1))
        : 0,
      averageCostPerStyle: execution.estimatedCost
        ? execution.estimatedCost / (execution.stats?.created || 1)
        : 0,
    }

    return NextResponse.json({
      execution,
      summary,
    })
  } catch (error) {
    console.error('Error fetching seed execution detail:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
