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
    console.log('[CREATE STYLE] Starting request processing...')
    
    // Validate request body
    let body
    try {
      // Read raw body first
      const rawBody = await req.json()
      console.log('[CREATE STYLE] Raw request body received:', JSON.stringify(rawBody, null, 2))
      
      // Validate using Zod directly
      const parseResult = createStyleSchema.safeParse(rawBody)
      
      if (!parseResult.success) {
        console.error('[CREATE STYLE] ========== VALIDATION ERROR ==========')
        console.error('[CREATE STYLE] Zod validation failed')
        console.error('[CREATE STYLE] Zod errors:', JSON.stringify(parseResult.error.errors, null, 2))
        console.error('[CREATE STYLE] =====================================')
        throw new ValidationError('Invalid request data', parseResult.error.errors)
      }
      
      body = parseResult.data
      console.log('[CREATE STYLE] Validation passed')
    } catch (validationError) {
      console.error('[CREATE STYLE] ========== VALIDATION ERROR ==========')
      console.error('[CREATE STYLE] Validation failed:', validationError)
      if (validationError instanceof Error) {
        console.error('[CREATE STYLE] Validation error message:', validationError.message)
        console.error('[CREATE STYLE] Validation error stack:', validationError.stack)
        console.error('[CREATE STYLE] Validation error name:', validationError.name)
      }
      // Check if it's a ValidationError with details
      if (validationError && typeof validationError === 'object' && 'details' in validationError) {
        console.error('[CREATE STYLE] Validation error details:', JSON.stringify((validationError as any).details, null, 2))
      }
      console.error('[CREATE STYLE] =====================================')
      throw validationError
    }
    
    // Log the incoming data for debugging
    console.log('[CREATE STYLE] Creating style with data:', JSON.stringify({
      name: body.name,
      categoryId: body.categoryId,
      subCategoryId: body.subCategoryId,
      colorId: body.colorId,
      slug: body.slug,
      images: body.images,
      materialSet: {
        defaultsCount: body.materialSet?.defaults?.length || 0,
        defaults: body.materialSet?.defaults,
        alternativesCount: body.materialSet?.alternatives?.length || 0,
      },
      roomProfilesCount: body.roomProfiles?.length || 0,
      roomProfiles: body.roomProfiles,
      metadata: body.metadata,
    }, null, 2))

    // Verify category and sub-category exist and are related
    console.log('[CREATE STYLE] Verifying category:', body.categoryId)
    const category = await prisma.category.findUnique({
      where: { id: body.categoryId },
    })

    if (!category) {
      console.error('[CREATE STYLE] Category not found:', body.categoryId)
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }
    console.log('[CREATE STYLE] Category found:', category.name)

    console.log('[CREATE STYLE] Verifying sub-category:', body.subCategoryId)
    const subCategory = await prisma.subCategory.findUnique({
      where: { id: body.subCategoryId },
    })

    if (!subCategory) {
      console.error('[CREATE STYLE] Sub-category not found:', body.subCategoryId)
      return NextResponse.json({ error: 'Sub-category not found' }, { status: 404 })
    }
    console.log('[CREATE STYLE] Sub-category found:', subCategory.name)

    // Verify sub-category belongs to category
    if (subCategory.categoryId !== body.categoryId) {
      console.error('[CREATE STYLE] Sub-category mismatch:', {
        subCategoryCategoryId: subCategory.categoryId,
        providedCategoryId: body.categoryId,
      })
      return NextResponse.json(
        { error: 'Sub-category does not belong to the specified category' },
        { status: 400 }
      )
    }

    // Verify color exists
    console.log('[CREATE STYLE] Verifying color:', body.colorId)
    const color = await prisma.color.findUnique({
      where: { id: body.colorId },
    })

    if (!color) {
      console.error('[CREATE STYLE] Color not found:', body.colorId)
      return NextResponse.json({ error: 'Color not found' }, { status: 404 })
    }
    console.log('[CREATE STYLE] Color found:', color.name)

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

    // Filter out invalid data (ObjectIDs, blob URLs, etc.)
    console.log('[CREATE STYLE] Filtering materialSet, roomProfiles, and images...')
    const isValidObjectId = (id: string) => /^[0-9a-fA-F]{24}$/.test(id)
    const isValidHttpUrl = (url: string): boolean => {
      if (typeof url !== 'string') return false
      // Reject blob URLs - they're client-side only
      if (url.startsWith('blob:')) {
        console.warn('[CREATE STYLE] Rejected blob URL:', url)
        return false
      }
      try {
        const parsed = new URL(url)
        return parsed.protocol === 'http:' || parsed.protocol === 'https:'
      } catch {
        return false
      }
    }

    // Filter images - only accept HTTP/HTTPS URLs (R2)
    const validatedImages = (body.images || []).filter((url: string) => {
      const isValid = isValidHttpUrl(url)
      if (!isValid && url) {
        console.warn('[CREATE STYLE] Invalid or blob URL in images:', url)
      }
      return isValid
    })
    console.log('[CREATE STYLE] Validated images:', {
      original: body.images?.length || 0,
      valid: validatedImages.length,
    })

    const filteredMaterialSet = {
      defaults: (body.materialSet?.defaults || []).filter((d: any) => {
        const isValid = d.materialId && isValidObjectId(d.materialId)
        if (!isValid && d.materialId) {
          console.warn('[CREATE STYLE] Invalid materialId in defaults:', d.materialId)
        }
        return isValid
      }).map((d: any) => ({
        materialId: d.materialId,
      })),
      alternatives: (body.materialSet?.alternatives || []).map((alt: any) => ({
        ...alt,
        alternatives: (alt.alternatives || []).filter((id: string) => {
          const isValid = isValidObjectId(id)
          if (!isValid) {
            console.warn('[CREATE STYLE] Invalid alternative materialId:', id)
          }
          return isValid
        }),
      })),
    }
    console.log('[CREATE STYLE] Filtered materialSet:', {
      defaultsCount: filteredMaterialSet.defaults.length,
      alternativesCount: filteredMaterialSet.alternatives.length,
    })

    const filteredRoomProfiles = (body.roomProfiles || []).map((profile: any) => ({
      ...profile,
      materials: (profile.materials || []).filter((id: string) => {
        const isValid = isValidObjectId(id)
        if (!isValid) {
          console.warn('[CREATE STYLE] Invalid materialId in room profile:', id)
        }
        return isValid
      }),
      // Filter room profile images - only accept HTTP/HTTPS URLs
      images: (profile.images || []).filter((url: string) => {
        const isValid = isValidHttpUrl(url)
        if (!isValid && url) {
          console.warn('[CREATE STYLE] Invalid or blob URL in room profile images:', url)
        }
        return isValid
      }),
    }))
    console.log('[CREATE STYLE] Filtered roomProfiles:', {
      count: filteredRoomProfiles.length,
      withImages: filteredRoomProfiles.filter((p: any) => p.images?.length > 0).length,
    })

    // Create global style (organizationId = null)
    console.log('[CREATE STYLE] Creating style in database...')
    const styleData = {
      organizationId: null, // Global style
      slug,
      name: body.name,
      categoryId: body.categoryId,
      subCategoryId: body.subCategoryId,
      colorId: body.colorId,
      images: validatedImages, // Only HTTP/HTTPS URLs (R2 URLs)
      materialSet: filteredMaterialSet as any,
      roomProfiles: filteredRoomProfiles as any,
      metadata: {
        version: body.metadata?.version || '1.0.0',
        isPublic: true, // Global styles are always public
        approvalStatus: null, // No approval needed for admin-created styles
        tags: body.metadata?.tags || [],
        usage: 0,
        rating: body.metadata?.rating,
      },
    }
    console.log('[CREATE STYLE] Style data to create:', JSON.stringify({
      ...styleData,
      materialSet: {
        defaultsCount: filteredMaterialSet.defaults.length,
        alternativesCount: filteredMaterialSet.alternatives.length,
      },
      roomProfilesCount: filteredRoomProfiles.length,
    }, null, 2))
    
    let style
    try {
      console.log('[CREATE STYLE] Calling prisma.style.create...')
      style = await prisma.style.create({
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
      },
    })
      console.log('[CREATE STYLE] Prisma create succeeded')
    } catch (prismaError) {
      console.error('[CREATE STYLE] ========== PRISMA ERROR ==========')
      console.error('[CREATE STYLE] Prisma error:', prismaError)
      if (prismaError instanceof Error) {
        console.error('[CREATE STYLE] Prisma error message:', prismaError.message)
        console.error('[CREATE STYLE] Prisma error stack:', prismaError.stack)
      }
      if (prismaError && typeof prismaError === 'object' && 'code' in prismaError) {
        console.error('[CREATE STYLE] Prisma error code:', (prismaError as any).code)
        console.error('[CREATE STYLE] Prisma error meta:', JSON.stringify((prismaError as any).meta, null, 2))
      }
      console.error('[CREATE STYLE] ===================================')
      throw prismaError
    }

    console.log('[CREATE STYLE] Style created successfully:', style.id)
    return NextResponse.json(style, { status: 201 })
  } catch (error) {
    // Log the full error for debugging
    console.error('[CREATE STYLE] ========== ERROR ==========')
    console.error('[CREATE STYLE] Error type:', error?.constructor?.name)
    console.error('[CREATE STYLE] Error:', error)
    
    if (error instanceof Error) {
      console.error('[CREATE STYLE] Error message:', error.message)
      console.error('[CREATE STYLE] Error stack:', error.stack)
      console.error('[CREATE STYLE] Error name:', error.name)
    }
    
    // Log additional error details
    if (error && typeof error === 'object') {
      console.error('[CREATE STYLE] Error keys:', Object.keys(error))
      if ('cause' in error) {
        console.error('[CREATE STYLE] Error cause:', error.cause)
      }
      if ('code' in error) {
        console.error('[CREATE STYLE] Error code:', (error as any).code)
      }
      if ('meta' in error) {
        console.error('[CREATE STYLE] Error meta:', (error as any).meta)
      }
    }
    
    console.error('[CREATE STYLE] ===========================')
    return handleError(error)
  }
})

