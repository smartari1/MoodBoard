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

    // Build base where clause (without scope filtering)
    // Note: MongoDB + Prisma has issues with organizationId: null queries
    // We'll fetch all styles matching other filters, then filter by scope in JavaScript
    const where: any = {}

    // Add category filters
    if (filters.categoryId) {
      where.categoryId = filters.categoryId
    }
    if (filters.subCategoryId) {
      where.subCategoryId = filters.subCategoryId
    }

    // Get all matching styles (we'll filter by scope in JavaScript)
    const allStyles = await prisma.style.findMany({
      where,
      orderBy: { createdAt: 'desc' },
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
            metadata: true,
          },
        },
        color: {
          select: {
            id: true,
            name: true,
            hex: true,
          },
        },
      },
    })

    // Filter styles by scope in JavaScript (MongoDB null handling issue)
    let filteredStyles = allStyles.filter((style) => {
      // Global styles (organizationId is null or undefined)
      const isGlobal = !style.organizationId

      // Personal styles (belong to user's organization)
      const isPersonal = style.organizationId === auth.organizationId

      // Public styles (from other organizations, approved)
      const isPublic =
        style.organizationId &&
        style.organizationId !== auth.organizationId &&
        style.metadata?.isPublic === true &&
        style.metadata?.approvalStatus === 'approved'

      // Filter out incomplete styles (AI-generated styles that are not yet complete)
      // Incomplete styles are marked with isComplete: false during generation
      // This prevents showing partially generated styles to users
      const isIncomplete =
        style.metadata?.aiGenerated === true &&
        style.metadata?.isComplete === false

      if (isIncomplete) {
        return false // Hide incomplete AI-generated styles
      }

      // Filter based on scope
      if (filters.scope === 'global') {
        return isGlobal
      } else if (filters.scope === 'personal') {
        return isPersonal
      } else if (filters.scope === 'public') {
        return isPublic
      } else {
        // scope === 'all'
        return isGlobal || isPersonal || isPublic
      }
    })

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filteredStyles = filteredStyles.filter(
        (style) =>
          style.name.he.toLowerCase().includes(searchLower) ||
          style.name.en.toLowerCase().includes(searchLower)
      )
    }

    // Apply tags filter
    if (filters.tags && filters.tags.length > 0) {
      filteredStyles = filteredStyles.filter((style) =>
        filters.tags!.some((tag) => style.metadata.tags?.includes(tag))
      )
    }

    // Calculate pagination
    const total = filteredStyles.length
    const startIndex = (filters.page - 1) * filters.limit
    const endIndex = startIndex + filters.limit
    const styles = filteredStyles.slice(startIndex, endIndex)

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

