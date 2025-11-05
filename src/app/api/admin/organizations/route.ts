/**
 * Admin Organizations API
 * GET /api/admin/organizations - List all organizations (admin only)
 * POST /api/admin/organizations - Create new organization (admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAdmin, handleError } from '@/lib/api/admin-middleware'
import { createOrganizationSchema } from '@/lib/validations/organization'

/**
 * GET /api/admin/organizations - List all organizations
 */
export const GET = withAdmin(async (req: NextRequest, auth) => {
  try {
    // Get all organizations
    const organizations = await prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({
      data: organizations,
    })
  } catch (error) {
    return handleError(error)
  }
})

/**
 * POST /api/admin/organizations - Create new organization
 */
export const POST = withAdmin(async (req: NextRequest, auth) => {
  try {
    const body = await req.json()
    
    // Validate input
    const validatedData = createOrganizationSchema.parse(body)

    // Check if slug already exists
    const existingOrg = await prisma.organization.findUnique({
      where: { slug: validatedData.slug },
    })

    if (existingOrg) {
      return NextResponse.json(
        { error: 'Organization with this slug already exists' },
        { status: 400 }
      )
    }

    // Create organization
    const organization = await prisma.organization.create({
      data: {
        name: validatedData.name,
        slug: validatedData.slug,
        settings: validatedData.settings || {
          locale: 'he',
          currency: 'ILS',
          units: 'metric',
          brand: {
            primaryColor: '#df2538',
            backgroundColor: '#f7f7ed',
          },
        },
        subscription: validatedData.subscription,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(
      { data: organization },
      { status: 201 }
    )
  } catch (error) {
    return handleError(error)
  }
})

