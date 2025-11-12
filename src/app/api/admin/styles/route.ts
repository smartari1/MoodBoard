/**
 * Admin Styles API
 * GET /api/admin/styles - List all global styles
 * POST /api/admin/styles - Create global style (admin only)
 */

import { handleError, withAdmin } from '@/lib/api/admin-middleware'
import { prisma } from '@/lib/db'
import { ValidationError } from '@/lib/errors'
import { createStyleSchema, styleFiltersSchema } from '@/lib/validations/style'
import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'


/**
 * GET /api/admin/styles - List all global styles (organizationId = null)
 */
export const GET = withAdmin(async (req: NextRequest, auth) => {
  try {
    // Parse query parameters
    const { searchParams } = new URL(req.url)
    const filters = styleFiltersSchema.parse({
      search: searchParams.get('search') || undefined,
      categoryId: searchParams.get('categoryId') || undefined,
      subCategoryId: searchParams.get('subCategoryId') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
    })

    // Build where clause - only global styles (organizationId = null)
    const where: any = {
      organizationId: null,
    }

    // Add search filter (by name)
    if (filters.search) {
      where.OR = [
        { 'name.he': { contains: filters.search, mode: 'insensitive' } },
        { 'name.en': { contains: filters.search, mode: 'insensitive' } },
      ]
    }

    // Add category filters
    if (filters.categoryId) {
      where.categoryId = filters.categoryId
    }
    if (filters.subCategoryId) {
      where.subCategoryId = filters.subCategoryId
    }

    // Get total count
    const total = await prisma.style.count({ where })

    // Get styles
    const styles = await prisma.style.findMany({
      where,
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
        color: {
          select: {
            id: true,
            name: true,
            hex: true,
            pantone: true,
            category: true,
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
      orderBy: { createdAt: 'desc' },
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
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
 * POST /api/admin/styles - Create global style (admin only)
 */
export const POST = withAdmin(async (req: NextRequest, auth) => {
  try {
    const rawBody = await req.json()
    const parseResult = createStyleSchema.safeParse(rawBody)

    if (!parseResult.success) {
      throw new ValidationError('Invalid request data', parseResult.error.errors)
    }

    const body = parseResult.data

    // Verify category and sub-category exist and are related
    const category = await prisma.category.findUnique({
      where: { id: body.categoryId },
    })

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    const subCategory = await prisma.subCategory.findUnique({
      where: { id: body.subCategoryId },
    })

    if (!subCategory) {
      return NextResponse.json({ error: 'Sub-category not found' }, { status: 404 })
    }

    // Verify sub-category belongs to category
    if (subCategory.categoryId !== body.categoryId) {
      return NextResponse.json(
        { error: 'Sub-category does not belong to the specified category' },
        { status: 400 }
      )
    }

    // Verify color exists
    const color = await prisma.color.findUnique({
      where: { id: body.colorId },
    })

    if (!color) {
      return NextResponse.json({ error: 'Color not found' }, { status: 404 })
    }

    // Generate slug if not provided
    const slug =
      body.slug ||
      body.name.en
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')

    // Check if slug already exists
    const existingStyle = await prisma.style.findUnique({
      where: { slug },
    })

    if (existingStyle) {
      return NextResponse.json(
        { error: 'Style with this slug already exists' },
        { status: 409 }
      )
    }

    const styleData = {
      organizationId: null, // Global style
      slug,
      name: body.name,
      categoryId: body.categoryId,
      subCategoryId: body.subCategoryId,
      colorId: body.colorId,
      images: body.images || [],
      metadata: {
        version: body.metadata?.version || '1.0.0',
        isPublic: true, // Global styles are always public
        approvalStatus: null, // No approval needed for admin-created styles
        tags: body.metadata?.tags || [],
        usage: 0,
        rating: body.metadata?.rating,
      },
    }
    const style = await prisma.style.create({
      data: styleData,
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
        color: {
          select: {
            id: true,
            name: true,
            hex: true,
            pantone: true,
            category: true,
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

    return NextResponse.json(style, { status: 201 })
  } catch (error) {
    return handleError(error)
  }
})

