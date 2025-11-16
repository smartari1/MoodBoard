/**
 * Admin Room Type API
 * Handles GET, PATCH, DELETE for a single room type
 */

import { withAdmin } from '@/lib/api/admin-middleware'
import { prisma } from '@/lib/db'
import { updateRoomTypeSchema } from '@/lib/validations/roomType'
import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/room-types/[id]
 * Get a single room type by ID
 */
export const GET = withAdmin(async (
  request: NextRequest,
  _auth,
  context: { params: Promise<{ id: string }> }
) => {
  try {
    const params = await context.params
    const roomType = await prisma.roomType.findUnique({
      where: { id: params.id },
    })

    if (!roomType) {
      return NextResponse.json({ error: 'Room type not found' }, { status: 404 })
    }

    return NextResponse.json(roomType)
  } catch (error) {
    console.error('[ROOM TYPE GET] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

/**
 * PATCH /api/admin/room-types/[id]
 * Update a room type
 */
export const PATCH = withAdmin(async (
  request: NextRequest,
  _auth,
  context: { params: Promise<{ id: string }> }
) => {
  try {
    const params = await context.params
    const body = await request.json()
    const validated = updateRoomTypeSchema.parse(body)

    // Check if room type exists
    const existing = await prisma.roomType.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Room type not found' }, { status: 404 })
    }

    // If slug is being updated, check it's not already taken
    if (validated.slug && validated.slug !== existing.slug) {
      const slugExists = await prisma.roomType.findUnique({
        where: { slug: validated.slug },
      })

      if (slugExists) {
        return NextResponse.json({ error: 'Room type with this slug already exists' }, { status: 400 })
      }
    }

    const roomType = await prisma.roomType.update({
      where: { id: params.id },
      data: {
        ...(validated.slug && { slug: validated.slug }),
        ...(validated.name && { name: validated.name }),
        ...(validated.description !== undefined && { description: validated.description }),
        ...(validated.icon !== undefined && { icon: validated.icon }),
        ...(validated.order !== undefined && { order: validated.order }),
        ...(validated.detailedContent !== undefined && { detailedContent: validated.detailedContent }),
      },
    })

    return NextResponse.json(roomType)
  } catch (error: any) {
    console.error('[ROOM TYPE PATCH] Error:', error)
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

/**
 * DELETE /api/admin/room-types/[id]
 * Delete a room type
 */
export const DELETE = withAdmin(async (
  request: NextRequest,
  _auth,
  context: { params: Promise<{ id: string }> }
) => {
  try {
    const params = await context.params

    // Check if room type exists
    const existing = await prisma.roomType.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Room type not found' }, { status: 404 })
    }

    // TODO: Check if room type is being used in any style's room profiles
    // This requires a more complex query since roomProfiles is embedded

    await prisma.roomType.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[ROOM TYPE DELETE] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
