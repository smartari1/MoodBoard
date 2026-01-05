/**
 * Project Style API
 * GET /api/project-style/[projectId] - Get project style
 * POST /api/project-style/[projectId] - Create project style
 * PUT /api/project-style/[projectId] - Update project style
 * DELETE /api/project-style/[projectId] - Delete project style
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth, handleError, requirePermission, validateRequest, verifyOrganizationAccess } from '@/lib/api/middleware'
import { createProjectStyleSchema, updateProjectStyleSchema } from '@/lib/validations/project-style'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ projectId: string }>
}

/**
 * GET /api/project-style/[projectId] - Get project style
 */
export const GET = withAuth(async (req: NextRequest, auth, context: RouteContext) => {
  try {
    requirePermission(auth, 'project:read')

    const { projectId } = await context.params

    // Verify project exists and belongs to organization
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, organizationId: true, name: true },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    await verifyOrganizationAccess(project.organizationId, auth.organizationId)

    // Get project style with all related data
    const projectStyle = await prisma.projectStyle.findUnique({
      where: { projectId },
      include: {
        baseStyle: {
          select: {
            id: true,
            name: true,
            slug: true,
            images: true,
            category: { select: { id: true, name: true, slug: true } },
            subCategory: { select: { id: true, name: true, slug: true } },
          },
        },
        rooms: {
          orderBy: { createdAt: 'asc' },
        },
        project: {
          select: {
            id: true,
            name: true,
            client: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    })

    if (!projectStyle) {
      return NextResponse.json({
        exists: false,
        projectId,
        project: {
          id: project.id,
          name: project.name,
        }
      })
    }

    // Fetch related entities for display
    const [colors, textures, materials] = await Promise.all([
      projectStyle.colorIds.length > 0
        ? prisma.color.findMany({
            where: { id: { in: projectStyle.colorIds } },
            select: { id: true, name: true, hex: true, category: true },
          })
        : [],
      projectStyle.textureIds.length > 0
        ? prisma.texture.findMany({
            where: { id: { in: projectStyle.textureIds } },
            select: { id: true, name: true, images: true },
          })
        : [],
      projectStyle.materialIds.length > 0
        ? prisma.material.findMany({
            where: { id: { in: projectStyle.materialIds } },
            select: { id: true, name: true, images: true, pricing: true },
          })
        : [],
    ])

    return NextResponse.json({
      exists: true,
      ...projectStyle,
      colors,
      textures,
      materials,
    })
  } catch (error) {
    return handleError(error)
  }
})

/**
 * POST /api/project-style/[projectId] - Create project style
 */
export const POST = withAuth(async (req: NextRequest, auth, context: RouteContext) => {
  try {
    requirePermission(auth, 'project:write')

    const { projectId } = await context.params
    const body = await validateRequest(req, createProjectStyleSchema)

    // Verify project exists and belongs to organization
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, organizationId: true },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    await verifyOrganizationAccess(project.organizationId, auth.organizationId)

    // Check if project style already exists
    const existingStyle = await prisma.projectStyle.findUnique({
      where: { projectId },
    })

    if (existingStyle) {
      return NextResponse.json(
        { error: 'Project already has a style. Use PUT to update or fork endpoint to replace.' },
        { status: 409 }
      )
    }

    // Create project style
    const projectStyle = await prisma.projectStyle.create({
      data: {
        projectId,
        organizationId: auth.organizationId,
        baseStyleId: body.baseStyleId,
        categoryId: body.categoryId,
        subCategoryId: body.subCategoryId,
        colorIds: body.colorIds,
        textureIds: body.textureIds,
        materialIds: body.materialIds,
        customPrompt: body.customPrompt,
        createdBy: auth.userId,
      },
      include: {
        baseStyle: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        rooms: true,
      },
    })

    return NextResponse.json(projectStyle, { status: 201 })
  } catch (error) {
    return handleError(error)
  }
})

/**
 * PUT /api/project-style/[projectId] - Update project style
 */
export const PUT = withAuth(async (req: NextRequest, auth, context: RouteContext) => {
  try {
    requirePermission(auth, 'project:write')

    const { projectId } = await context.params
    const body = await validateRequest(req, updateProjectStyleSchema)

    // Get existing project style
    const existingStyle = await prisma.projectStyle.findUnique({
      where: { projectId },
      select: { id: true, organizationId: true },
    })

    if (!existingStyle) {
      return NextResponse.json({ error: 'Project style not found' }, { status: 404 })
    }

    await verifyOrganizationAccess(existingStyle.organizationId, auth.organizationId)

    // Build update data
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    }

    if (body.baseStyleId !== undefined) updateData.baseStyleId = body.baseStyleId
    if (body.categoryId !== undefined) updateData.categoryId = body.categoryId
    if (body.subCategoryId !== undefined) updateData.subCategoryId = body.subCategoryId
    if (body.colorIds !== undefined) updateData.colorIds = body.colorIds
    if (body.textureIds !== undefined) updateData.textureIds = body.textureIds
    if (body.materialIds !== undefined) updateData.materialIds = body.materialIds
    if (body.customPrompt !== undefined) updateData.customPrompt = body.customPrompt

    // Update project style
    const projectStyle = await prisma.projectStyle.update({
      where: { id: existingStyle.id },
      data: updateData,
      include: {
        baseStyle: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        rooms: true,
      },
    })

    return NextResponse.json(projectStyle)
  } catch (error) {
    return handleError(error)
  }
})

/**
 * DELETE /api/project-style/[projectId] - Delete project style
 */
export const DELETE = withAuth(async (req: NextRequest, auth, context: RouteContext) => {
  try {
    requirePermission(auth, 'project:write')

    const { projectId } = await context.params

    // Get existing project style
    const existingStyle = await prisma.projectStyle.findUnique({
      where: { projectId },
      select: { id: true, organizationId: true },
    })

    if (!existingStyle) {
      return NextResponse.json({ error: 'Project style not found' }, { status: 404 })
    }

    await verifyOrganizationAccess(existingStyle.organizationId, auth.organizationId)

    // Delete project style (cascade will delete rooms)
    await prisma.projectStyle.delete({
      where: { id: existingStyle.id },
    })

    return NextResponse.json({ message: 'Project style deleted successfully' })
  } catch (error) {
    return handleError(error)
  }
})
