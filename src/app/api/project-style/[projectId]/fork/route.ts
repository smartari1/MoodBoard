/**
 * Project Style Fork API
 * POST /api/project-style/[projectId]/fork - Fork from existing style
 *
 * This endpoint:
 * 1. Creates a new ProjectStyle based on an existing Style
 * 2. Copies all design elements (colors, textures, materials)
 * 3. Copies ALL room profiles with their images (FREE - no credits)
 * 4. Marks forked rooms with isForked=true
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth, handleError, requirePermission, validateRequest, verifyOrganizationAccess } from '@/lib/api/middleware'
import { forkStyleSchema } from '@/lib/validations/project-style'
import { v4 as uuidv4 } from 'uuid'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

/**
 * POST /api/project-style/[projectId]/fork - Fork from existing style
 */
export const POST = withAuth(async (req: NextRequest, auth) => {
  try {
    requirePermission(auth, 'project:write')

    // Get project ID from URL
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    // URL is /api/project-style/[projectId]/fork, so projectId is second to last
    const projectId = pathParts[pathParts.length - 2]

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }
    const body = await validateRequest(req, forkStyleSchema)

    // Verify project exists and belongs to organization
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, organizationId: true, name: true },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    await verifyOrganizationAccess(project.organizationId, auth.organizationId)

    // Get source style with all related data
    const sourceStyle = await prisma.style.findUnique({
      where: { id: body.sourceStyleId },
      include: {
        textureLinks: {
          include: {
            texture: {
              select: { id: true },
            },
          },
        },
        materialLinks: {
          include: {
            material: {
              select: { id: true },
            },
          },
        },
      },
    })

    if (!sourceStyle) {
      return NextResponse.json({ error: 'Source style not found' }, { status: 404 })
    }

    // Check if project already has a style - if so, delete it first (replace)
    const existingStyle = await prisma.projectStyle.findUnique({
      where: { projectId },
    })

    if (existingStyle) {
      // Delete existing style (cascade will delete rooms)
      await prisma.projectStyle.delete({
        where: { id: existingStyle.id },
      })
    }

    // Extract texture and material IDs from links
    const textureIds = sourceStyle.textureLinks.map((link) => link.texture.id)
    const materialIds = sourceStyle.materialLinks.map((link) => link.material.id)

    // Get color IDs from roomProfiles if available
    const colorIds: string[] = []
    if (sourceStyle.colorId) {
      colorIds.push(sourceStyle.colorId)
    }
    // Add colors from room palettes
    const roomProfiles = (sourceStyle as any).roomProfiles || []
    for (const room of roomProfiles) {
      if (room.colorPalette?.primaryId) {
        if (!colorIds.includes(room.colorPalette.primaryId)) {
          colorIds.push(room.colorPalette.primaryId)
        }
      }
      for (const colorId of room.colorPalette?.secondaryIds || []) {
        if (!colorIds.includes(colorId)) {
          colorIds.push(colorId)
        }
      }
      for (const colorId of room.colorPalette?.accentIds || []) {
        if (!colorIds.includes(colorId)) {
          colorIds.push(colorId)
        }
      }
    }

    // Create project style
    const projectStyle = await prisma.projectStyle.create({
      data: {
        projectId,
        organizationId: auth.organizationId,
        baseStyleId: body.sourceStyleId,
        categoryId: sourceStyle.categoryId,
        subCategoryId: sourceStyle.subCategoryId,
        colorIds,
        textureIds,
        materialIds,
        createdBy: auth.userId,
      },
    })

    // Create ProjectRooms from roomProfiles (copy all rooms with their images FREE)
    const projectRooms = []
    for (const room of roomProfiles) {
      // Get all views (images) from the room
      const views = room.views || []

      // Convert views to GeneratedImages for ProjectRoom
      const generatedImages = views
        .filter((view: any) => view.url && view.status === 'COMPLETED')
        .map((view: any) => ({
          id: uuidv4(),
          url: view.url,
          prompt: view.prompt || '',
          createdAt: view.createdAt || new Date(),
          isForked: true, // Mark as forked
        }))

      // Create ProjectRoom
      const projectRoom = await prisma.projectRoom.create({
        data: {
          projectStyleId: projectStyle.id,
          roomType: room.roomTypeId || 'unknown',
          roomTypeId: room.roomTypeId,
          name: room.description?.he || room.description?.en || null,
          // Override with room-specific colors if available
          overrideColorIds: [
            ...(room.colorPalette?.primaryId ? [room.colorPalette.primaryId] : []),
            ...(room.colorPalette?.secondaryIds || []),
            ...(room.colorPalette?.accentIds || []),
          ],
          overrideTextureIds: [],
          overrideMaterialIds: room.materials?.map((m: any) => m.materialId).filter(Boolean) || [],
          customPrompt: null,
          generatedImages,
          status: generatedImages.length > 0 ? 'completed' : 'pending',
          isForked: true, // Mark room as forked (free)
          forkedFromView: views[0]?.id || null,
          creditsUsed: 0, // Forked rooms are free
        },
      })

      projectRooms.push(projectRoom)
    }

    // Fetch the complete project style with rooms
    const completeProjectStyle = await prisma.projectStyle.findUnique({
      where: { id: projectStyle.id },
      include: {
        baseStyle: {
          select: {
            id: true,
            name: true,
            slug: true,
            images: {
              select: { id: true, url: true, imageCategory: true },
              orderBy: { displayOrder: 'asc' },
              take: 5,
            },
          },
        },
        rooms: {
          orderBy: { createdAt: 'asc' },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    // Fetch related entities for display
    const [colors, textures, materials] = await Promise.all([
      colorIds.length > 0
        ? prisma.color.findMany({
            where: { id: { in: colorIds } },
            select: { id: true, name: true, hex: true, category: true },
          })
        : [],
      textureIds.length > 0
        ? prisma.texture.findMany({
            where: { id: { in: textureIds } },
            select: { id: true, name: true, imageUrl: true },
          })
        : [],
      materialIds.length > 0
        ? prisma.material.findMany({
            where: { id: { in: materialIds } },
            select: { id: true, name: true, assets: true },
          })
        : [],
    ])

    return NextResponse.json({
      ...completeProjectStyle,
      colors,
      textures,
      materials,
      forkedRoomsCount: projectRooms.length,
      message: `Forked ${projectRooms.length} rooms from style "${sourceStyle.name?.he || sourceStyle.name?.en}"`,
    }, { status: 201 })
  } catch (error) {
    return handleError(error)
  }
})
