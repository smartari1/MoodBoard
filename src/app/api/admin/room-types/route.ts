/**
 * Admin Room Types API
 * Handles CRUD operations for room types (Living Room, Bedroom, Kitchen, etc.)
 */

import { withAdmin } from '@/lib/api/admin-middleware'
import { prisma } from '@/lib/db'
import { createRoomTypeSchema } from '@/lib/validations/roomType'
import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/room-types
 * List all room types
 */
export const GET = withAdmin(async (request: NextRequest) => {
  try {
    const roomTypes = await prisma.roomType.findMany({
      orderBy: { order: 'asc' },
    })

    return NextResponse.json(roomTypes)
  } catch (error) {
    console.error('[ROOM TYPES GET] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

/**
 * POST /api/admin/room-types
 * Create a new room type
 */
export const POST = withAdmin(async (request: NextRequest) => {
  try {
    const body = await request.json()
    const validated = createRoomTypeSchema.parse(body)

    // Check if slug already exists
    const existing = await prisma.roomType.findUnique({
      where: { slug: validated.slug },
    })

    if (existing) {
      return NextResponse.json({ error: 'Room type with this slug already exists' }, { status: 400 })
    }

    const roomType = await prisma.roomType.create({
      data: {
        slug: validated.slug,
        name: validated.name,
        description: validated.description,
        icon: validated.icon,
        order: validated.order,
        detailedContent: validated.detailedContent,
      },
    })

    return NextResponse.json(roomType, { status: 201 })
  } catch (error: any) {
    console.error('[ROOM TYPES POST] Error:', error)
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
