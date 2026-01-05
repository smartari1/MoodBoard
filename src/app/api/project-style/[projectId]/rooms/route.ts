/**
 * Project Style Rooms API
 * POST /api/project-style/[projectId]/rooms - Add room to project style
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth, handleError, requirePermission, validateRequest, verifyOrganizationAccess } from '@/lib/api/middleware'
import { createProjectRoomSchema } from '@/lib/validations/project-style'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ projectId: string }>
}

/**
 * POST /api/project-style/[projectId]/rooms - Add room to project style
 */
export const POST = withAuth(async (req: NextRequest, auth, context: RouteContext) => {
  try {
    requirePermission(auth, 'project:write')

    const { projectId } = await context.params
    const body = await validateRequest(req, createProjectRoomSchema)

    // Get project style
    const projectStyle = await prisma.projectStyle.findUnique({
      where: { projectId },
      select: { id: true, organizationId: true },
    })

    if (!projectStyle) {
      return NextResponse.json(
        { error: 'Project style not found. Create a style first.' },
        { status: 404 }
      )
    }

    await verifyOrganizationAccess(projectStyle.organizationId, auth.organizationId)

    // Create room
    const room = await prisma.projectRoom.create({
      data: {
        projectStyleId: projectStyle.id,
        roomType: body.roomType,
        roomTypeId: body.roomTypeId,
        name: body.name,
        dimensions: body.dimensions,
        overrideColorIds: body.overrideColorIds,
        overrideTextureIds: body.overrideTextureIds,
        overrideMaterialIds: body.overrideMaterialIds,
        customPrompt: body.customPrompt,
        status: 'pending',
        isForked: false,
        creditsUsed: 0,
      },
    })

    return NextResponse.json(room, { status: 201 })
  } catch (error) {
    return handleError(error)
  }
})

/**
 * GET /api/project-style/[projectId]/rooms - List rooms
 */
export const GET = withAuth(async (req: NextRequest, auth, context: RouteContext) => {
  try {
    requirePermission(auth, 'project:read')

    const { projectId } = await context.params

    // Get project style
    const projectStyle = await prisma.projectStyle.findUnique({
      where: { projectId },
      select: { id: true, organizationId: true },
    })

    if (!projectStyle) {
      return NextResponse.json({ error: 'Project style not found' }, { status: 404 })
    }

    await verifyOrganizationAccess(projectStyle.organizationId, auth.organizationId)

    // Get rooms
    const rooms = await prisma.projectRoom.findMany({
      where: { projectStyleId: projectStyle.id },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({ data: rooms })
  } catch (error) {
    return handleError(error)
  }
})
