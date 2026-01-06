/**
 * Studio Conversations API
 * POST /api/studio/conversations - Create a new conversation
 * GET /api/studio/conversations - List conversations for a room
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import {
  withAuth,
  handleError,
  requirePermission,
  validateRequest,
  verifyOrganizationAccess,
} from '@/lib/api/middleware'
import { createConversationSchema } from '@/lib/validations/studio-conversation'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

/**
 * POST /api/studio/conversations - Create a new conversation
 */
export const POST = withAuth(async (req: NextRequest, auth) => {
  try {
    requirePermission(auth, 'project:write')

    const body = await validateRequest(req, createConversationSchema)

    // Verify access to project style
    const projectStyle = await prisma.projectStyle.findUnique({
      where: { id: body.projectStyleId },
      select: { id: true, organizationId: true },
    })

    if (!projectStyle) {
      return NextResponse.json({ error: 'Project style not found' }, { status: 404 })
    }

    await verifyOrganizationAccess(projectStyle.organizationId, auth.organizationId)

    // Verify room belongs to project style
    const room = await prisma.projectRoom.findFirst({
      where: {
        id: body.roomId,
        projectStyleId: body.projectStyleId,
      },
    })

    if (!room) {
      return NextResponse.json({ error: 'Room not found in project style' }, { status: 404 })
    }

    // Create conversation
    const conversation = await prisma.studioConversation.create({
      data: {
        roomId: body.roomId,
        projectStyleId: body.projectStyleId,
        messages: body.messages,
        studioState: body.studioState,
        status: 'pending',
      },
    })

    return NextResponse.json(conversation, { status: 201 })
  } catch (error) {
    return handleError(error)
  }
})

/**
 * GET /api/studio/conversations - List conversations for a room
 * Query params: roomId (required), limit (optional, default 20)
 */
export const GET = withAuth(async (req: NextRequest, auth) => {
  try {
    requirePermission(auth, 'project:read')

    const { searchParams } = new URL(req.url)
    const roomId = searchParams.get('roomId')
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    if (!roomId) {
      return NextResponse.json({ error: 'roomId is required' }, { status: 400 })
    }

    // Get room and verify access
    const room = await prisma.projectRoom.findUnique({
      where: { id: roomId },
      include: {
        projectStyle: {
          select: { organizationId: true },
        },
      },
    })

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    await verifyOrganizationAccess(room.projectStyle.organizationId, auth.organizationId)

    // Get conversations for room
    const conversations = await prisma.studioConversation.findMany({
      where: { roomId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        status: true,
        generatedImageUrl: true,
        createdAt: true,
        updatedAt: true,
        // Don't include full messages in list for performance
        studioState: true,
      },
    })

    return NextResponse.json({ conversations })
  } catch (error) {
    return handleError(error)
  }
})
