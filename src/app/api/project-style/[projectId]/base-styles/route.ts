/**
 * Base Styles Management API
 * POST /api/project-style/[projectId]/base-styles - Add a base style
 * DELETE /api/project-style/[projectId]/base-styles - Remove a base style
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth, handleError, requirePermission, validateRequest, verifyOrganizationAccess } from '@/lib/api/middleware'
import { addBaseStyleSchema, removeBaseStyleSchema } from '@/lib/validations/project-style'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

/**
 * Helper to extract projectId from URL
 */
function getProjectIdFromUrl(url: string): string | null {
  const urlObj = new URL(url)
  const pathParts = urlObj.pathname.split('/')
  // URL is /api/project-style/[projectId]/base-styles, so projectId is second to last
  return pathParts[pathParts.length - 2] || null
}

/**
 * POST /api/project-style/[projectId]/base-styles - Add a base style
 */
export const POST = withAuth(async (req: NextRequest, auth) => {
  try {
    requirePermission(auth, 'project:write')

    const projectId = getProjectIdFromUrl(req.url)
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    const body = await validateRequest(req, addBaseStyleSchema)

    // Get existing project style
    const existingStyle = await prisma.projectStyle.findUnique({
      where: { projectId },
      select: { id: true, organizationId: true, baseStyleIds: true },
    })

    if (!existingStyle) {
      return NextResponse.json({ error: 'Project style not found' }, { status: 404 })
    }

    await verifyOrganizationAccess(existingStyle.organizationId, auth.organizationId)

    // Verify the style exists
    const styleToAdd = await prisma.style.findUnique({
      where: { id: body.styleId },
      select: { id: true, name: true },
    })

    if (!styleToAdd) {
      return NextResponse.json({ error: 'Style not found' }, { status: 404 })
    }

    // Check if already added
    if (existingStyle.baseStyleIds.includes(body.styleId)) {
      return NextResponse.json({ error: 'Style already added' }, { status: 409 })
    }

    // Add the style
    const updatedStyle = await prisma.projectStyle.update({
      where: { id: existingStyle.id },
      data: {
        baseStyleIds: [...existingStyle.baseStyleIds, body.styleId],
        updatedAt: new Date(),
      },
    })

    // Fetch all base styles with ingredients
    const baseStyles = await prisma.style.findMany({
      where: { id: { in: updatedStyle.baseStyleIds } },
      select: {
        id: true,
        name: true,
        slug: true,
        images: {
          select: { id: true, url: true, imageCategory: true },
          orderBy: { displayOrder: 'asc' },
          take: 3,
        },
        textureLinks: { select: { textureId: true } },
        materialLinks: { select: { materialId: true } },
      },
    })

    // Aggregate available ingredients
    const aggregatedTextureIds = [...new Set(baseStyles.flatMap(s => s.textureLinks.map(l => l.textureId)))]
    const aggregatedMaterialIds = [...new Set(baseStyles.flatMap(s => s.materialLinks.map(l => l.materialId)))]

    // Fetch aggregated ingredients
    const [availableTextures, availableMaterials] = await Promise.all([
      aggregatedTextureIds.length > 0
        ? prisma.texture.findMany({
            where: { id: { in: aggregatedTextureIds } },
            select: { id: true, name: true, imageUrl: true, thumbnailUrl: true },
          })
        : [],
      aggregatedMaterialIds.length > 0
        ? prisma.material.findMany({
            where: { id: { in: aggregatedMaterialIds } },
            select: { id: true, name: true, assets: true },
          })
        : [],
    ])

    return NextResponse.json({
      ...updatedStyle,
      baseStyles: baseStyles.map(s => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
        images: s.images,
      })),
      availableTextures,
      availableMaterials,
    })
  } catch (error) {
    return handleError(error)
  }
})

/**
 * DELETE /api/project-style/[projectId]/base-styles - Remove a base style
 */
export const DELETE = withAuth(async (req: NextRequest, auth) => {
  try {
    requirePermission(auth, 'project:write')

    const projectId = getProjectIdFromUrl(req.url)
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    const body = await validateRequest(req, removeBaseStyleSchema)

    // Get existing project style
    const existingStyle = await prisma.projectStyle.findUnique({
      where: { projectId },
      select: { id: true, organizationId: true, baseStyleIds: true },
    })

    if (!existingStyle) {
      return NextResponse.json({ error: 'Project style not found' }, { status: 404 })
    }

    await verifyOrganizationAccess(existingStyle.organizationId, auth.organizationId)

    // Check if style is in the list
    if (!existingStyle.baseStyleIds.includes(body.styleId)) {
      return NextResponse.json({ error: 'Style not found in project' }, { status: 404 })
    }

    // Remove the style
    const updatedStyle = await prisma.projectStyle.update({
      where: { id: existingStyle.id },
      data: {
        baseStyleIds: existingStyle.baseStyleIds.filter(id => id !== body.styleId),
        updatedAt: new Date(),
      },
    })

    // Fetch remaining base styles with ingredients
    const baseStyles = updatedStyle.baseStyleIds.length > 0
      ? await prisma.style.findMany({
          where: { id: { in: updatedStyle.baseStyleIds } },
          select: {
            id: true,
            name: true,
            slug: true,
            images: {
              select: { id: true, url: true, imageCategory: true },
              orderBy: { displayOrder: 'asc' },
              take: 3,
            },
            textureLinks: { select: { textureId: true } },
            materialLinks: { select: { materialId: true } },
          },
        })
      : []

    // Aggregate available ingredients
    const aggregatedTextureIds = [...new Set(baseStyles.flatMap(s => s.textureLinks.map(l => l.textureId)))]
    const aggregatedMaterialIds = [...new Set(baseStyles.flatMap(s => s.materialLinks.map(l => l.materialId)))]

    // Fetch aggregated ingredients
    const [availableTextures, availableMaterials] = await Promise.all([
      aggregatedTextureIds.length > 0
        ? prisma.texture.findMany({
            where: { id: { in: aggregatedTextureIds } },
            select: { id: true, name: true, imageUrl: true, thumbnailUrl: true },
          })
        : [],
      aggregatedMaterialIds.length > 0
        ? prisma.material.findMany({
            where: { id: { in: aggregatedMaterialIds } },
            select: { id: true, name: true, assets: true },
          })
        : [],
    ])

    return NextResponse.json({
      ...updatedStyle,
      baseStyles: baseStyles.map(s => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
        images: s.images,
      })),
      availableTextures,
      availableMaterials,
    })
  } catch (error) {
    return handleError(error)
  }
})
