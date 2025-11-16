/**
 * Admin Approaches API
 * Handles CRUD operations for global design approaches (אותנטי, פיוזן, אקלקטי, etc.)
 */

import { withAdmin } from '@/lib/api/admin-middleware'
import { prisma } from '@/lib/db'
import { createApproachSchema } from '@/lib/validations/approach'
import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/approaches
 * List all approaches
 */
export const GET = withAdmin(async (request: NextRequest) => {
  try {
    const approaches = await prisma.approach.findMany({
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: { styles: true },
        },
      },
    })

    return NextResponse.json(approaches)
  } catch (error) {
    console.error('[APPROACHES GET] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

/**
 * POST /api/admin/approaches
 * Create a new approach
 */
export const POST = withAdmin(async (request: NextRequest) => {
  try {
    const body = await request.json()
    const validated = createApproachSchema.parse(body)

    // Check if slug already exists
    const existing = await prisma.approach.findUnique({
      where: { slug: validated.slug },
    })

    if (existing) {
      return NextResponse.json({ error: 'Approach with this slug already exists' }, { status: 400 })
    }

    const approach = await prisma.approach.create({
      data: {
        slug: validated.slug,
        name: validated.name,
        description: validated.description,
        order: validated.order,
        images: validated.images || [],
        detailedContent: validated.detailedContent,
        inspirationPillars: validated.inspirationPillars,
        metadata: {
          isDefault: validated.metadata?.isDefault || false,
          version: validated.metadata?.version || '1.0.0',
          tags: validated.metadata?.tags || [],
          usage: validated.metadata?.usage || 0,
        },
      },
      include: {
        _count: {
          select: { styles: true },
        },
      },
    })

    return NextResponse.json(approach, { status: 201 })
  } catch (error: any) {
    console.error('[APPROACHES POST] Error:', error)
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
