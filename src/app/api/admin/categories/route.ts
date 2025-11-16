/**
 * Admin Categories API
 * CRUD operations for style categories (admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAdmin } from '@/lib/api/admin-middleware'
import { prisma } from '@/lib/db'
import { createCategorySchema, updateCategorySchema } from '@/lib/validations/category'
import { handleError, validateRequest } from '@/lib/api/middleware'

// Force dynamic rendering
export const dynamic = 'force-dynamic'


/**
 * GET /api/admin/categories - List all categories
 */
export const GET = withAdmin(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''

    // Build where clause
    const where: any = {}
    
    if (search) {
      where.OR = [
        { 'name.he': { contains: search } },
        { 'name.en': { contains: search } },
        { 'description.he': { contains: search } },
        { 'description.en': { contains: search } },
        { slug: { contains: search } },
      ]
    }

    const categories = await prisma.category.findMany({
      where: Object.keys(where).length > 0 ? where : {},
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
      orderBy: { order: 'asc' },
    })

    return NextResponse.json({
      data: categories,
      count: categories.length,
    })
  } catch (error: any) {
    console.error('Categories API Error:', error)
    
    // Check if it's a Prisma model not found error
    if (error.message?.includes('Unknown model') || error.message?.includes('model `Category`')) {
      return NextResponse.json(
        { 
          error: 'Category model not found in database',
          message: 'Please run: pnpm prisma db push',
          details: error.message
        },
        { status: 500 }
      )
    }
    
    return handleError(error)
  }
})

/**
 * POST /api/admin/categories - Create a new category
 */
export const POST = withAdmin(async (req: NextRequest) => {
  try {
    const data = await validateRequest(req, createCategorySchema)

    // Check if slug already exists
    const existing = await prisma.category.findUnique({
      where: { slug: data.slug },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Category with this slug already exists' },
        { status: 409 }
      )
    }

    // Only include description if HTML actually has text content
    // Strip HTML tags and check for meaningful text
    const hasHtmlText = (html: string | undefined): boolean => {
      if (!html) return false
      // Remove HTML tags and check if there's actual text
      const textOnly = html.replace(/<[^>]*>/g, '').trim()
      return textOnly.length > 0
    }
    
    const hasDescription = data.description && (
      hasHtmlText(data.description.he) || 
      hasHtmlText(data.description.en)
    )

    const category = await prisma.category.create({
      data: {
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
        _count: {
          select: {
            styles: true,
            subCategories: true,
          },
        },
      },
    })

    return NextResponse.json(category, { status: 201 })
  } catch (error: any) {
    console.error('Category creation error:', error)
    
    // Check for Prisma validation errors specifically
    if (error?.name === 'PrismaClientValidationError' || error?.message?.includes('Unknown argument')) {
      console.error('Prisma validation error details:', {
        message: error.message,
        code: error.code,
        meta: error.meta,
      })
      
      return NextResponse.json(
        {
          error: 'Database schema error',
          message: 'The description field may not be recognized. Please ensure Prisma Client is regenerated.',
          details: error.message,
          code: 'PRISMA_VALIDATION_ERROR',
        },
        { status: 500 }
      )
    }
    
    return handleError(error)
  }
})

