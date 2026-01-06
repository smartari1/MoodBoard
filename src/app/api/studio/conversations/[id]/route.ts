/**
 * Studio Conversation API
 * GET /api/studio/conversations/[id] - Get conversation by ID
 * PATCH /api/studio/conversations/[id] - Update conversation
 * DELETE /api/studio/conversations/[id] - Delete conversation
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import {
  withAuth,
  handleError,
  requirePermission,
  validateRequest,
  verifyOrganizationAccess,
  AuthContext,
} from '@/lib/api/middleware'
import { updateConversationSchema, addMessageSchema } from '@/lib/validations/studio-conversation'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/studio/conversations/[id] - Get conversation by ID with full state
 */
async function getHandler(req: NextRequest, auth: AuthContext, context?: RouteContext): Promise<NextResponse> {
  try {
    requirePermission(auth, 'project:read')

    if (!context) {
      return NextResponse.json({ error: 'Missing context' }, { status: 400 })
    }

    const { id } = await context.params

    // Get conversation with related data
    const conversation = await prisma.studioConversation.findUnique({
      where: { id },
      include: {
        room: {
          select: {
            id: true,
            name: true,
            roomType: true,
            generatedImages: true,
          },
        },
        projectStyle: {
          select: {
            id: true,
            organizationId: true,
            projectId: true,
          },
        },
      },
    })

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    await verifyOrganizationAccess(conversation.projectStyle.organizationId, auth.organizationId)

    return NextResponse.json(conversation)
  } catch (error) {
    return handleError(error)
  }
}

export const GET = withAuth(getHandler)

/**
 * PATCH /api/studio/conversations/[id] - Update conversation (add messages, update state)
 */
async function patchHandler(req: NextRequest, auth: AuthContext, context?: RouteContext): Promise<NextResponse> {
  try {
    requirePermission(auth, 'project:write')

    if (!context) {
      return NextResponse.json({ error: 'Missing context' }, { status: 400 })
    }

    const { id } = await context.params
    const body = await validateRequest(req, updateConversationSchema)

    // Get existing conversation
    const existingConversation = await prisma.studioConversation.findUnique({
      where: { id },
      include: {
        projectStyle: {
          select: { organizationId: true },
        },
      },
    })

    if (!existingConversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    await verifyOrganizationAccess(existingConversation.projectStyle.organizationId, auth.organizationId)

    // Update conversation
    const updatedConversation = await prisma.studioConversation.update({
      where: { id },
      data: {
        ...(body.messages && { messages: body.messages }),
        ...(body.studioState && { studioState: body.studioState }),
        ...(body.generatedImageUrl !== undefined && { generatedImageUrl: body.generatedImageUrl }),
        ...(body.status && { status: body.status }),
      },
    })

    return NextResponse.json(updatedConversation)
  } catch (error) {
    return handleError(error)
  }
}

export const PATCH = withAuth(patchHandler)

/**
 * POST /api/studio/conversations/[id]/messages - Add message to conversation
 * This is a convenience endpoint for adding a single message
 */
async function postHandler(req: NextRequest, auth: AuthContext, context?: RouteContext): Promise<NextResponse> {
  try {
    requirePermission(auth, 'project:write')

    if (!context) {
      return NextResponse.json({ error: 'Missing context' }, { status: 400 })
    }

    const { id } = await context.params
    const body = await validateRequest(req, addMessageSchema)

    // Get existing conversation
    const existingConversation = await prisma.studioConversation.findUnique({
      where: { id },
      include: {
        projectStyle: {
          select: { organizationId: true },
        },
      },
    })

    if (!existingConversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    await verifyOrganizationAccess(existingConversation.projectStyle.organizationId, auth.organizationId)

    // Add message to existing messages
    const existingMessages = existingConversation.messages || []
    const newMessage = body.message
    const updatedMessages = [...(existingMessages as object[]), newMessage as object]

    // Update conversation with new message and optional state update
    const updatedConversation = await prisma.studioConversation.update({
      where: { id },
      data: {
        messages: updatedMessages,
        ...(body.studioState && { studioState: body.studioState }),
      },
    })

    return NextResponse.json(updatedConversation)
  } catch (error) {
    return handleError(error)
  }
}

export const POST = withAuth(postHandler)

/**
 * DELETE /api/studio/conversations/[id] - Delete conversation
 */
async function deleteHandler(req: NextRequest, auth: AuthContext, context?: RouteContext): Promise<NextResponse> {
  try {
    requirePermission(auth, 'project:write')

    if (!context) {
      return NextResponse.json({ error: 'Missing context' }, { status: 400 })
    }

    const { id } = await context.params

    // Get conversation to verify access
    const conversation = await prisma.studioConversation.findUnique({
      where: { id },
      include: {
        projectStyle: {
          select: { organizationId: true },
        },
      },
    })

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    await verifyOrganizationAccess(conversation.projectStyle.organizationId, auth.organizationId)

    // Delete conversation
    await prisma.studioConversation.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleError(error)
  }
}

export const DELETE = withAuth(deleteHandler)
