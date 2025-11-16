/**
 * Admin Category API - Single Category
 * GET, PATCH, DELETE operations for a single category
 */

// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { withAdmin } from '@/lib/api/admin-middleware'
import { prisma } from '@/lib/db'
import { updateCategorySchema } from '@/lib/validations/category'
import { handleError, validateRequest } from '@/lib/api/middleware'

// Force dynamic rendering
export const dynamic = 'force-dynamic'


/**
 * GET /api/admin/categories/[id] - Get single category
 */
export const GET = withAdmin(async (
  req: NextRequest,
  _auth,
  context: { params: Promise<{ id: string }> }
) => {
  try {
    const params = await context.params
    const category = await prisma.category.findUnique({
      where: { id: params.id },
      include: {
        subCategories: {
          orderBy: { order: 'asc' },
        },
        _count: {
          select: {
            styles: true,
            subCategories: true,
          },
        },
      },
    })

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    return NextResponse.json(category)
  } catch (error) {
    return handleError(error)
  }
})

/**
 * PATCH /api/admin/categories/[id] - Update category
 */
export const PATCH = withAdmin(async (
  req: NextRequest,
  _auth,
  context: { params: Promise<{ id: string }> }
) => {
  try {
    const params = await context.params
    const data = await validateRequest(req, updateCategorySchema)

    // Check if category exists
    const existing = await prisma.category.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    // Check if slug already exists (if updating slug)
    if (data.slug && data.slug !== existing.slug) {
      const slugExists = await prisma.category.findUnique({
        where: { slug: data.slug },
      })

      if (slugExists) {
        return NextResponse.json(
          { error: 'Category with this slug already exists' },
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
    
    const category = await prisma.category.update({
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
        subCategories: {
          orderBy: { order: 'asc' },
        },
        _count: {
          select: {
            styles: true,
            subCategories: true,
          },
        },
      },
    })

    return NextResponse.json(category)
  } catch (error) {
    return handleError(error)
  }
})

/**
 * DELETE /api/admin/categories/[id] - Delete category
 */
export const DELETE = withAdmin(async (
  req: NextRequest,
  _auth,
  context: { params: Promise<{ id: string }> }
) => {
  try {
    const params = await context.params
    const category = await prisma.category.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            styles: true,
            subCategories: true,
          },
        },
      },
    })

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    // Cascade delete: First delete all associated styles, then subcategories, then the category
    if (category._count.styles > 0) {
      await prisma.style.deleteMany({
        where: { categoryId: params.id },
      })
    }

    if (category._count.subCategories > 0) {
      // For each subcategory, delete its styles first
      const subCategories = await prisma.subCategory.findMany({
        where: { categoryId: params.id },
        select: { id: true },
      })

      for (const subCat of subCategories) {
        await prisma.style.deleteMany({
          where: { subCategoryId: subCat.id },
        })
      }

      // Then delete the subcategories
      await prisma.subCategory.deleteMany({
        where: { categoryId: params.id },
      })
    }

    await prisma.category.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleError(error)
  }
})

