/**
 * Project Style Room API
 * GET /api/project-style/[projectId]/rooms/[roomId] - Get room details
 * PUT /api/project-style/[projectId]/rooms/[roomId] - Update room
 * DELETE /api/project-style/[projectId]/rooms/[roomId] - Delete room
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth, handleError, requirePermission, validateRequest, verifyOrganizationAccess } from '@/lib/api/middleware'
import { updateProjectRoomSchema } from '@/lib/validations/project-style'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ projectId: string; roomId: string }>
}

/**
 * GET /api/project-style/[projectId]/rooms/[roomId] - Get room details
 */
export const GET = withAuth(async (req: NextRequest, auth, context: RouteContext) => {
  try {
    requirePermission(auth, 'project:read')

    const { projectId, roomId } = await context.params

    // Get project style to verify ownership
    const projectStyle = await prisma.projectStyle.findUnique({
      where: { projectId },
      select: { id: true, organizationId: true },
    })

    if (!projectStyle) {
      return NextResponse.json({ error: 'Project style not found' }, { status: 404 })
    }

    await verifyOrganizationAccess(projectStyle.organizationId, auth.organizationId)

    // Get room
    const room = await prisma.projectRoom.findUnique({
      where: {
        id: roomId,
        projectStyleId: projectStyle.id,
      },
    })

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    return NextResponse.json(room)
  } catch (error) {
    return handleError(error)
  }
})

/**
 * PUT /api/project-style/[projectId]/rooms/[roomId] - Update room
 */
export const PUT = withAuth(async (req: NextRequest, auth, context: RouteContext) => {
  try {
    requirePermission(auth, 'project:write')

    const { projectId, roomId } = await context.params
    const body = await validateRequest(req, updateProjectRoomSchema)

    // Get project style
    const projectStyle = await prisma.projectStyle.findUnique({
      where: { projectId },
      select: { id: true, organizationId: true },
    })

    if (!projectStyle) {
      return NextResponse.json({ error: 'Project style not found' }, { status: 404 })
    }

    await verifyOrganizationAccess(projectStyle.organizationId, auth.organizationId)

    // Check if room exists
    const existingRoom = await prisma.projectRoom.findUnique({
      where: {
        id: roomId,
        projectStyleId: projectStyle.id,
      },
    })

    if (!existingRoom) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    }

    if (body.roomType !== undefined) updateData.roomType = body.roomType
    if (body.roomTypeId !== undefined) updateData.roomTypeId = body.roomTypeId
    if (body.name !== undefined) updateData.name = body.name
    if (body.dimensions !== undefined) updateData.dimensions = body.dimensions
    if (body.overrideColorIds !== undefined) updateData.overrideColorIds = body.overrideColorIds
    if (body.overrideTextureIds !== undefined) updateData.overrideTextureIds = body.overrideTextureIds
    if (body.overrideMaterialIds !== undefined) updateData.overrideMaterialIds = body.overrideMaterialIds
    if (body.customPrompt !== undefined) updateData.customPrompt = body.customPrompt
    if (body.status !== undefined) updateData.status = body.status

    // Update room
    const room = await prisma.projectRoom.update({
      where: { id: roomId },
      data: updateData,
    })

    return NextResponse.json(room)
  } catch (error) {
    return handleError(error)
  }
})

/**
 * DELETE /api/project-style/[projectId]/rooms/[roomId] - Delete room
 */
export const DELETE = withAuth(async (req: NextRequest, auth, context: RouteContext) => {
  try {
    requirePermission(auth, 'project:write')

    const { projectId, roomId } = await context.params

    // Get project style
    const projectStyle = await prisma.projectStyle.findUnique({
      where: { projectId },
      select: { id: true, organizationId: true },
    })

    if (!projectStyle) {
      return NextResponse.json({ error: 'Project style not found' }, { status: 404 })
    }

    await verifyOrganizationAccess(projectStyle.organizationId, auth.organizationId)

    // Check if room exists
    const existingRoom = await prisma.projectRoom.findUnique({
      where: {
        id: roomId,
        projectStyleId: projectStyle.id,
      },
    })

    if (!existingRoom) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    // Delete room
    await prisma.projectRoom.delete({
      where: { id: roomId },
    })

    return NextResponse.json({ message: 'Room deleted successfully' })
  } catch (error) {
    return handleError(error)
  }
})
