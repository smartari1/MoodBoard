/**
 * Admin SubCategories API
 * CRUD operations for style sub-categories (admin only)
 */

import { withAdmin } from '@/lib/api/admin-middleware'
import { handleError, validateRequest } from '@/lib/api/middleware'
import { prisma } from '@/lib/db'
import { createSubCategorySchema } from '@/lib/validations/category'
import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'


/**
 * GET /api/admin/sub-categories - List all sub-categories
 */
export const GET = withAdmin(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const categoryId = searchParams.get('categoryId')

    const subCategories = await prisma.subCategory.findMany({
      where: {
        ...(categoryId ? { categoryId } : {}),
        ...(search
          ? {
              OR: [
                { 'name.he': { contains: search } },
                { 'name.en': { contains: search } },
                { slug: { contains: search } },
              ],
            }
          : {}),
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            styles: true,
          },
        },
      },
      orderBy: [
        { categoryId: 'asc' },
        { order: 'asc' },
      ],
    })

    return NextResponse.json({
      data: subCategories,
      count: subCategories.length,
    })
  } catch (error) {
    return handleError(error)
  }
})

/**
 * POST /api/admin/sub-categories - Create a new sub-category
 */
export const POST = withAdmin(async (req: NextRequest) => {
  try {
    const data = await validateRequest(req, createSubCategorySchema)

    // Verify category exists
    const category = await prisma.category.findUnique({
      where: { id: data.categoryId },
    })

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    // Check if slug already exists within this category
    const existing = await prisma.subCategory.findUnique({
      where: {
        categoryId_slug: {
          categoryId: data.categoryId,
          slug: data.slug,
        },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Sub-category with this slug already exists in this category' },
        { status: 409 }
      )
    }

    // Only include description if HTML actually has text content
    const hasHtmlText = (html: string | undefined): boolean => {
      if (!html) return false
      const textOnly = html.replace(/<[^>]*>/g, '').trim()
      return textOnly.length > 0
    }
    
    const hasDescription = data.description && (
      hasHtmlText(data.description.he) || 
      hasHtmlText(data.description.en)
    )
    
    const subCategory = await prisma.subCategory.create({
      data: {
        categoryId: data.categoryId,
        name: data.name,
        ...(hasDescription && {
          description: data.description,
        }),
        slug: data.slug,
        order: data.order,
        ...(data.images && { images: data.images }),
        ...(data.detailedContent && { detailedContent: data.detailedContent }),
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            styles: true,
          },
        },
      },
    })

    return NextResponse.json(subCategory, { status: 201 })
  } catch (error) {
    return handleError(error)
  }
})

