/**
 * Admin Organizations API - Single Organization
 * GET /api/admin/organizations/[id] - Get single organization (admin only)
 * PATCH /api/admin/organizations/[id] - Update organization (admin only)
 * DELETE /api/admin/organizations/[id] - Delete organization (admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAdmin, handleError } from '@/lib/api/admin-middleware'
import { updateOrganizationSchema } from '@/lib/validations/organization'

/**
 * Helper function to validate ObjectID format
 */
function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id)
}

/**
 * GET /api/admin/organizations/[id] - Get single organization
 */
export const GET = withAdmin(async (req: NextRequest, auth) => {
  try {
    const url = new URL(req.url)
    const organizationId = url.pathname.split('/').pop()

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // Validate ObjectID format
    if (!isValidObjectId(organizationId)) {
      return NextResponse.json(
        { error: 'Invalid organization ID format' },
        { status: 400 }
      )
    }

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        slug: true,
        settings: true,
        subscription: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: organization })
  } catch (error) {
    return handleError(error)
  }
})

/**
 * PATCH /api/admin/organizations/[id] - Update organization
 */
export const PATCH = withAdmin(async (req: NextRequest, auth) => {
  try {
    const url = new URL(req.url)
    const organizationId = url.pathname.split('/').pop()

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // Validate ObjectID format
    if (!isValidObjectId(organizationId)) {
      return NextResponse.json(
        { error: 'Invalid organization ID format' },
        { status: 400 }
      )
    }

    const body = await req.json()
    
    // Validate input
    const validatedData = updateOrganizationSchema.parse(body)

    // Check if organization exists
    const existingOrg = await prisma.organization.findUnique({
      where: { id: organizationId },
    })

    if (!existingOrg) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Check if slug is being updated and if it conflicts
    if (validatedData.slug && validatedData.slug !== existingOrg.slug) {
      const slugConflict = await prisma.organization.findUnique({
        where: { slug: validatedData.slug },
      })

      if (slugConflict) {
        return NextResponse.json(
          { error: 'Organization with this slug already exists' },
          { status: 409 }
        )
      }
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date(),
    }

    if (validatedData.name !== undefined) updateData.name = validatedData.name
    if (validatedData.slug !== undefined) updateData.slug = validatedData.slug
    if (validatedData.settings !== undefined) {
      updateData.settings = validatedData.settings as any
    }
    if (validatedData.subscription !== undefined) {
      updateData.subscription = validatedData.subscription as any
    }

    // Update organization
    const organization = await prisma.organization.update({
      where: { id: organizationId },
      data: updateData,
      select: {
        id: true,
        name: true,
        slug: true,
        settings: true,
        subscription: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ data: organization })
  } catch (error) {
    return handleError(error)
  }
})

/**
 * DELETE /api/admin/organizations/[id] - Delete organization
 */
export const DELETE = withAdmin(async (req: NextRequest, auth) => {
  try {
    const url = new URL(req.url)
    const organizationId = url.pathname.split('/').pop()

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // Validate ObjectID format
    if (!isValidObjectId(organizationId)) {
      return NextResponse.json(
        { error: 'Invalid organization ID format' },
        { status: 400 }
      )
    }

    // Check if organization exists
    const existingOrg = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        _count: {
          select: {
            users: true,
            clients: true,
            projects: true,
          },
        },
      },
    })

    if (!existingOrg) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Warn if organization has related data (optional check)
    if (
      existingOrg._count.users > 0 ||
      existingOrg._count.clients > 0 ||
      existingOrg._count.projects > 0
    ) {
      // For now, we'll allow deletion but log a warning
      // In production, you might want to prevent deletion or require force flag
    }

    // Delete organization (cascade will handle related records based on schema)
    await prisma.organization.delete({
      where: { id: organizationId },
    })

    return NextResponse.json({ message: 'Organization deleted successfully' })
  } catch (error) {
    return handleError(error)
  }
})

