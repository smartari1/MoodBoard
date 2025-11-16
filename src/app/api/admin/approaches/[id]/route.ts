/**
 * Admin Approach API
 * Handles GET, PATCH, DELETE for a single approach
 */

import { withAdmin } from '@/lib/api/admin-middleware'
import { prisma } from '@/lib/db'
import { updateApproachSchema } from '@/lib/validations/approach'
import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/approaches/[id]
 * Get a single approach by ID
 */
export const GET = withAdmin(async (request: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const approach = await prisma.approach.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { styles: true },
        },
      },
    })

    if (!approach) {
      return NextResponse.json({ error: 'Approach not found' }, { status: 404 })
    }

    return NextResponse.json(approach)
  } catch (error) {
    console.error('[APPROACH GET] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

/**
 * PATCH /api/admin/approaches/[id]
 * Update an approach
 */
export const PATCH = withAdmin(async (request: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const body = await request.json()
    const validated = updateApproachSchema.parse(body)

    // Check if approach exists
    const existing = await prisma.approach.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Approach not found' }, { status: 404 })
    }

    // If slug is being updated, check it's not already taken
    if (validated.slug && validated.slug !== existing.slug) {
      const slugExists = await prisma.approach.findUnique({
        where: { slug: validated.slug },
      })

      if (slugExists) {
        return NextResponse.json({ error: 'Approach with this slug already exists' }, { status: 400 })
      }
    }

    const approach = await prisma.approach.update({
      where: { id: params.id },
      data: {
        ...(validated.slug && { slug: validated.slug }),
        ...(validated.name && { name: validated.name }),
        ...(validated.description !== undefined && { description: validated.description }),
        ...(validated.order !== undefined && { order: validated.order }),
        ...(validated.images && { images: validated.images }),
        ...(validated.detailedContent !== undefined && { detailedContent: validated.detailedContent }),
        ...(validated.inspirationPillars !== undefined && { inspirationPillars: validated.inspirationPillars }),
        ...(validated.metadata && {
          metadata: {
            isDefault: validated.metadata.isDefault ?? existing.metadata.isDefault,
            version: validated.metadata.version ?? existing.metadata.version,
            tags: validated.metadata.tags ?? existing.metadata.tags,
            usage: validated.metadata.usage ?? existing.metadata.usage,
          },
        }),
      },
      include: {
        _count: {
          select: { styles: true },
        },
      },
    })

    return NextResponse.json(approach)
  } catch (error: any) {
    console.error('[APPROACH PATCH] Error:', error)
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

/**
 * DELETE /api/admin/approaches/[id]
 * Delete an approach
 */
export const DELETE = withAdmin(async (
  request: NextRequest,
  _auth,
  context: { params: Promise<{ id: string }> }
) => {
  try {
    const params = await context.params

    // Check if approach exists
    const existing = await prisma.approach.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { styles: true },
        },
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Approach not found' }, { status: 404 })
    }

    // Cascade delete: First delete all associated styles, then the approach
    if (existing._count.styles > 0) {
      await prisma.style.deleteMany({
        where: { approachId: params.id },
      })
    }

    await prisma.approach.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[APPROACH DELETE] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
