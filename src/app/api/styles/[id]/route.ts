/**
 * User Styles API - Single Style
 * GET /api/styles/[id] - Get style details
 * PATCH /api/styles/[id] - Update style (if owner)
 * DELETE /api/styles/[id] - Delete style (if owner)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth, handleError, validateRequest, requirePermission, verifyOrganizationAccess } from '@/lib/api/middleware'
import { updateStyleSchema } from '@/lib/validations/style'

// Force dynamic rendering
export const dynamic = 'force-dynamic'


/**
 * GET /api/styles/[id] - Get style details
 * Supports lookup by ID or slug
 */
export const GET = withAuth(async (req: NextRequest, auth) => {
  try {
    // Check permission
    requirePermission(auth, 'style:read')

    const url = new URL(req.url)
    const idOrSlug = url.pathname.split('/').pop()

    if (!idOrSlug) {
      return NextResponse.json({ error: 'Style ID or slug is required' }, { status: 400 })
    }

    // Check if it's a valid MongoDB ObjectId (24 hex characters)
    const isObjectId = /^[a-f\d]{24}$/i.test(idOrSlug)

    const style = await prisma.style.findFirst({
      where: isObjectId
        ? { id: idOrSlug }
        : { slug: idOrSlug },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        subCategory: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        approach: {
          select: {
            id: true,
            slug: true,
            name: true,
            order: true,
            description: true,
            images: true,
            metadata: true,
          },
        },
        color: {
          select: {
            id: true,
            name: true,
            hex: true,
            pantone: true,
            category: true,
          },
        },
      },
    })

    if (!style) {
      return NextResponse.json({ error: 'Style not found' }, { status: 404 })
    }

    // Check access:
    // - Global styles: accessible to all
    // - Approved public styles: accessible to all
    // - Personal styles: only accessible to owning organization
    const metadata = style.metadata as any
    if (style.organizationId !== null) {
      // Not a global style
      if (!metadata.isPublic || metadata.approvalStatus !== 'approved') {
        // Personal or pending/rejected public style - check ownership
        await verifyOrganizationAccess(style.organizationId, auth.organizationId)
      }
    }

    return NextResponse.json(style)
  } catch (error) {
    return handleError(error)
  }
})

/**
 * PATCH /api/styles/[id] - Update style (if owner)
 * Supports lookup by ID or slug
 */
export const PATCH = withAuth(async (req: NextRequest, auth) => {
  try {
    // Check permission
    requirePermission(auth, 'style:write')

    const url = new URL(req.url)
    const idOrSlug = url.pathname.split('/').pop()

    if (!idOrSlug) {
      return NextResponse.json({ error: 'Style ID or slug is required' }, { status: 400 })
    }

    // Check if it's a valid MongoDB ObjectId (24 hex characters)
    const isObjectId = /^[a-f\d]{24}$/i.test(idOrSlug)

    // Validate request body
    const body = await validateRequest(req, updateStyleSchema)

    // Check if style exists
    const existingStyle = await prisma.style.findFirst({
      where: isObjectId
        ? { id: idOrSlug }
        : { slug: idOrSlug },
    })

    if (!existingStyle) {
      return NextResponse.json({ error: 'Style not found' }, { status: 404 })
    }

    // Only allow editing organization's own styles (not global styles)
    if (existingStyle.organizationId === null) {
      return NextResponse.json(
        { error: 'Cannot edit global styles' },
        { status: 403 }
      )
    }

    // Verify ownership
    await verifyOrganizationAccess(existingStyle.organizationId, auth.organizationId)

    // Update style
    const updatedMetadata = existingStyle.metadata as any
    const updateData: Record<string, unknown> = { updatedAt: new Date() }

    if (body.name) updateData.name = body.name
    if (body.slug) updateData.slug = body.slug
    if (body.categoryId) updateData.categoryId = body.categoryId
    if (body.subCategoryId) updateData.subCategoryId = body.subCategoryId
    if (body.colorId) updateData.colorId = body.colorId
    if (body.images !== undefined) updateData.images = body.images
    if (body.metadata) {
      updateData.metadata = {
        ...updatedMetadata,
        ...body.metadata,
        approvalStatus:
          body.metadata.isPublic && !updatedMetadata.isPublic ? 'pending' : updatedMetadata.approvalStatus,
      }
    }

    const style = await prisma.style.update({
      where: { id: existingStyle.id },
      data: updateData,
    })

    return NextResponse.json(style)
  } catch (error) {
    return handleError(error)
  }
})

/**
 * DELETE /api/styles/[id] - Delete style (if owner)
 * Supports lookup by ID or slug
 */
export const DELETE = withAuth(async (req: NextRequest, auth) => {
  try {
    // Check permission
    requirePermission(auth, 'style:delete')

    const url = new URL(req.url)
    const idOrSlug = url.pathname.split('/').pop()

    if (!idOrSlug) {
      return NextResponse.json({ error: 'Style ID or slug is required' }, { status: 400 })
    }

    // Check if it's a valid MongoDB ObjectId (24 hex characters)
    const isObjectId = /^[a-f\d]{24}$/i.test(idOrSlug)

    // Check if style exists
    const existingStyle = await prisma.style.findFirst({
      where: isObjectId
        ? { id: idOrSlug }
        : { slug: idOrSlug },
    })

    if (!existingStyle) {
      return NextResponse.json({ error: 'Style not found' }, { status: 404 })
    }

    // Only allow deleting organization's own styles (not global styles)
    if (existingStyle.organizationId === null) {
      return NextResponse.json(
        { error: 'Cannot delete global styles' },
        { status: 403 }
      )
    }

    // Verify ownership
    await verifyOrganizationAccess(existingStyle.organizationId, auth.organizationId)

    // Delete style
    await prisma.style.delete({
      where: { id: existingStyle.id },
    })

    return NextResponse.json({ message: 'Style deleted successfully' })
  } catch (error) {
    return handleError(error)
  }
})

