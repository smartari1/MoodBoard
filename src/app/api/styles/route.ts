/**
 * User Styles API
 * GET /api/styles - List available styles (global + approved public + org personal)
 * POST /api/styles - Create style (personal or public)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth, handleError, validateRequest, requirePermission } from '@/lib/api/middleware'
import { createStyleSchema, styleFiltersSchema } from '@/lib/validations/style'

// Force dynamic rendering
export const dynamic = 'force-dynamic'


/**
 * GET /api/styles - List available styles
 * Returns: global styles + approved public styles + organization's personal styles
 */
export const GET = withAuth(async (req: NextRequest, auth) => {
  try {
    // Check permission
    requirePermission(auth, 'style:read')

    // Parse query parameters
    const { searchParams } = new URL(req.url)
    const filters = styleFiltersSchema.parse({
      search: searchParams.get('search') || undefined,
      categoryId: searchParams.get('categoryId') || undefined,
      subCategoryId: searchParams.get('subCategoryId') || undefined,
      scope: (searchParams.get('scope') as any) || 'all',
      tags: searchParams.get('tags')?.split(',') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
    })

    // Build where clause based on scope
    const whereConditions: any[] = []

    if (filters.scope === 'all' || filters.scope === 'global') {
      // Global styles (organizationId = null)
      whereConditions.push({
        organizationId: null,
      })
    }

    if (filters.scope === 'all' || filters.scope === 'public') {
      // Approved public styles from other organizations
      whereConditions.push({
        organizationId: { not: null, not: auth.organizationId },
        'metadata.isPublic': true,
        'metadata.approvalStatus': 'approved',
      })
    }

    if (filters.scope === 'all' || filters.scope === 'personal') {
      // Organization's personal/public styles
      whereConditions.push({
        organizationId: auth.organizationId,
      })
    }

    const where: any = {
      OR: whereConditions,
    }

    // Add search filter (by name)
    if (filters.search) {
      where.AND = [
        {
          OR: [
            { 'name.he': { contains: filters.search, mode: 'insensitive' } },
            { 'name.en': { contains: filters.search, mode: 'insensitive' } },
          ],
        },
      ]
    }

    // Add category filters
    if (filters.categoryId) {
      if (!where.AND) where.AND = []
      where.AND.push({ categoryId: filters.categoryId })
    }
    if (filters.subCategoryId) {
      if (!where.AND) where.AND = []
      where.AND.push({ subCategoryId: filters.subCategoryId })
    }

    // Add tags filter
    if (filters.tags && filters.tags.length > 0) {
      if (!where.AND) where.AND = []
      where.AND.push({
        'metadata.tags': { hasSome: filters.tags },
      })
    }

    // Get total count
    const total = await prisma.style.count({ where })

    // Get styles
    const styles = await prisma.style.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
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
        approaches: {
          select: {
            id: true,
            slug: true,
            name: true,
            order: true,
            metadata: true,
          },
          orderBy: { order: 'asc' },
        },
      },
    })

    return NextResponse.json({
      data: styles,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    })
  } catch (error) {
    return handleError(error)
  }
})

/**
 * POST /api/styles - Create style (personal or public)
 */
export const POST = withAuth(async (req: NextRequest, auth) => {
  try {
    // Check permission
    requirePermission(auth, 'style:write')

    // Validate request body
    const body = await validateRequest(req, createStyleSchema)

    // Determine if style is public or personal based on metadata
    const isPublic = body.metadata?.isPublic || false

    // Generate slug if not provided
    const slug =
      body.slug ||
      body.name.en
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')

    // Make slug unique for organization
    let uniqueSlug = slug
    let counter = 1
    while (
      await prisma.style.findFirst({
        where: {
          slug: uniqueSlug,
          organizationId: auth.organizationId,
        },
      })
    ) {
      uniqueSlug = `${slug}-${counter}`
      counter++
    }

    // Create style
    const style = await prisma.style.create({
      data: {
        organizationId: auth.organizationId, // Organization-specific
        slug: uniqueSlug,
        name: body.name,
        categoryId: body.categoryId,
        subCategoryId: body.subCategoryId,
        colorId: body.colorId,
        images: body.images || [],
        metadata: {
          version: body.metadata?.version || '1.0.0',
          isPublic,
          approvalStatus: isPublic ? 'pending' : null, // Public styles need approval
          tags: body.metadata?.tags || [],
          usage: 0,
          rating: body.metadata?.rating,
        },
      },
    })

    return NextResponse.json(style, { status: 201 })
  } catch (error) {
    return handleError(error)
  }
})

