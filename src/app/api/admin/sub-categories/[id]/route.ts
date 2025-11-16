/**
 * Admin SubCategory API - Single SubCategory
 * GET, PATCH, DELETE operations for a single sub-category
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAdmin } from '@/lib/api/admin-middleware'
import { prisma } from '@/lib/db'
import { updateSubCategorySchema } from '@/lib/validations/category'
import { handleError, validateRequest } from '@/lib/api/middleware'

// Force dynamic rendering
export const dynamic = 'force-dynamic'


/**
 * GET /api/admin/sub-categories/[id] - Get single sub-category
 */
export const GET = withAdmin(async (
  req: NextRequest,
  _auth,
  context: { params: Promise<{ id: string }> }
) => {
  try {
    const params = await context.params
    const subCategory = await prisma.subCategory.findUnique({
      where: { id: params.id },
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

    if (!subCategory) {
      return NextResponse.json({ error: 'Sub-category not found' }, { status: 404 })
    }

    return NextResponse.json(subCategory)
  } catch (error) {
    return handleError(error)
  }
})

/**
 * PATCH /api/admin/sub-categories/[id] - Update sub-category
 */
export const PATCH = withAdmin(async (
  req: NextRequest,
  _auth,
  context: { params: Promise<{ id: string }> }
) => {
  try {
    const params = await context.params
    const data = await validateRequest(req, updateSubCategorySchema)

    // Check if sub-category exists
    const existing = await prisma.subCategory.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Sub-category not found' }, { status: 404 })
    }

    // Check if slug already exists within this category (if updating slug)
    if (data.slug && data.slug !== existing.slug) {
      const slugExists = await prisma.subCategory.findUnique({
        where: {
          categoryId_slug: {
            categoryId: existing.categoryId,
            slug: data.slug,
          },
        },
      })

      if (slugExists) {
        return NextResponse.json(
          { error: 'Sub-category with this slug already exists in this category' },
          { status: 409 }
        )
      }
    }

    // Check if description HTML has actual text content
    const hasHtmlText = (html: string | undefined): boolean => {
      if (!html) return false
      const textOnly = html.replace(/<[^>]*>/g, '').trim()
      return textOnly.length > 0
    }
    
    const hasDescription = data.description && (
      hasHtmlText(data.description.he) || 
      hasHtmlText(data.description.en)
    )
    
    const subCategory = await prisma.subCategory.update({
      where: { id: params.id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && {
          description: hasDescription ? data.description : null,
        }),
        ...(data.slug && { slug: data.slug }),
        ...(data.order !== undefined && { order: data.order }),
        ...(data.images !== undefined && { images: data.images }),
        ...(data.detailedContent !== undefined && { detailedContent: data.detailedContent }),
        updatedAt: new Date(),
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

    return NextResponse.json(subCategory)
  } catch (error) {
    return handleError(error)
  }
})

/**
 * DELETE /api/admin/sub-categories/[id] - Delete sub-category
 */
export const DELETE = withAdmin(async (
  req: NextRequest,
  _auth,
  context: { params: Promise<{ id: string }> }
) => {
  try {
    const params = await context.params
    const subCategory = await prisma.subCategory.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            styles: true,
          },
        },
      },
    })

    if (!subCategory) {
      return NextResponse.json({ error: 'Sub-category not found' }, { status: 404 })
    }

    // Cascade delete: First delete all associated styles, then the subcategory
    if (subCategory._count.styles > 0) {
      await prisma.style.deleteMany({
        where: { subCategoryId: params.id },
      })
    }

    await prisma.subCategory.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleError(error)
  }
})

