/**
 * Admin Styles API - Single Style
 * GET /api/admin/styles/[id] - Get global style
 * PATCH /api/admin/styles/[id] - Update global style
 * DELETE /api/admin/styles/[id] - Delete global style
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAdmin, handleError, validateRequest } from '@/lib/api/admin-middleware'
import { updateStyleSchema } from '@/lib/validations/style'

/**
 * Helper function to validate ObjectID format
 */
function isValidObjectId(id: string): boolean {
  // MongoDB ObjectID is 24 hex characters
  return /^[0-9a-fA-F]{24}$/.test(id)
}

/**
 * GET /api/admin/styles/[id] - Get global style
 */
export const GET = withAdmin(async (req: NextRequest, auth) => {
  try {
    const url = new URL(req.url)
    const styleId = url.pathname.split('/').pop()

    if (!styleId) {
      return NextResponse.json({ error: 'Style ID is required' }, { status: 400 })
    }

    // Validate ObjectID format (prevents errors like "new" being treated as ID)
    if (!isValidObjectId(styleId)) {
      return NextResponse.json(
        { error: 'Invalid style ID format' },
        { status: 400 }
      )
    }

    const style = await prisma.style.findUnique({
      where: { id: styleId },
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

    if (!style) {
      return NextResponse.json({ error: 'Style not found' }, { status: 404 })
    }

    // Verify it's a global style
    if (style.organizationId !== null) {
      return NextResponse.json(
        { error: 'This is not a global style' },
        { status: 403 }
      )
    }

    return NextResponse.json(style)
  } catch (error) {
    return handleError(error)
  }
})

/**
 * PATCH /api/admin/styles/[id] - Update global style
 */
export const PATCH = withAdmin(async (req: NextRequest, auth) => {
  const logPrefix = '[UPDATE STYLE]'

  try {
    console.log(`${logPrefix} ========== START UPDATE REQUEST ==========`)

    const url = new URL(req.url)
    const styleId = url.pathname.split('/').pop()
    console.log(`${logPrefix} Style ID from URL:`, styleId)

    if (!styleId) {
      console.error(`${logPrefix} ERROR: No style ID provided`)
      return NextResponse.json({ error: 'Style ID is required' }, { status: 400 })
    }

    // Validate ObjectID format
    if (!isValidObjectId(styleId)) {
      console.error(`${logPrefix} ERROR: Invalid ObjectID format:`, styleId)
      return NextResponse.json(
        { error: 'Invalid style ID format' },
        { status: 400 }
      )
    }
    console.log(`${logPrefix} ✅ Style ID validation passed`)

    // Validate request body
    console.log(`${logPrefix} Reading request body...`)
    let body
    try {
      const rawBody = await req.json()
      console.log(`${logPrefix} Raw request body received:`, JSON.stringify(rawBody, null, 2))

      // Validate with schema
      console.log(`${logPrefix} Validating against updateStyleSchema...`)
      const parseResult = updateStyleSchema.safeParse(rawBody)

      if (!parseResult.success) {
        console.error(`${logPrefix} ========== VALIDATION ERROR ==========`)
        console.error(`${logPrefix} Zod validation failed`)
        console.error(`${logPrefix} Errors:`, JSON.stringify(parseResult.error.errors, null, 2))
        console.error(`${logPrefix} Error issues:`, parseResult.error.issues.map((issue: any) => ({
          path: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
          received: issue.received,
        })))
        console.error(`${logPrefix} =====================================`)

        return NextResponse.json(
          {
            error: 'Validation failed',
            details: parseResult.error.errors,
            issues: parseResult.error.issues.map((issue: any) => ({
              field: issue.path.join('.'),
              message: issue.message,
            })),
          },
          { status: 400 }
        )
      }

      body = parseResult.data
      console.log(`${logPrefix} ✅ Validation passed`)
      console.log(`${logPrefix} Validated body:`, JSON.stringify(body, null, 2))
    } catch (validationError) {
      console.error(`${logPrefix} ========== REQUEST PARSING ERROR ==========`)
      console.error(`${logPrefix} Error:`, validationError)
      if (validationError instanceof Error) {
        console.error(`${logPrefix} Message:`, validationError.message)
        console.error(`${logPrefix} Stack:`, validationError.stack)
      }
      console.error(`${logPrefix} ==========================================`)
      throw validationError
    }

    // Check if style exists and is global
    console.log(`${logPrefix} Checking if style exists...`)
    let existingStyle
    try {
      existingStyle = await prisma.style.findUnique({
        where: { id: styleId },
      })
      console.log(`${logPrefix} Style lookup result:`, existingStyle ? 'Found' : 'Not found')

      if (existingStyle) {
        console.log(`${logPrefix} Existing style data:`, {
          id: existingStyle.id,
          name: existingStyle.name,
          organizationId: existingStyle.organizationId,
          imagesCount: existingStyle.images?.length || 0,
          roomProfilesCount: existingStyle.roomProfiles?.length || 0,
        })
      }
    } catch (dbError) {
      console.error(`${logPrefix} ========== DATABASE LOOKUP ERROR ==========`)
      console.error(`${logPrefix} Error:`, dbError)
      if (dbError instanceof Error) {
        console.error(`${logPrefix} Message:`, dbError.message)
        console.error(`${logPrefix} Stack:`, dbError.stack)
      }
      console.error(`${logPrefix} ==========================================`)
      throw dbError
    }

    if (!existingStyle) {
      console.error(`${logPrefix} ERROR: Style not found in database`)
      return NextResponse.json({ error: 'Style not found' }, { status: 404 })
    }

    if (existingStyle.organizationId !== null) {
      console.error(`${logPrefix} ERROR: Style is not global (organizationId: ${existingStyle.organizationId})`)
      return NextResponse.json(
        { error: 'This is not a global style' },
        { status: 403 }
      )
    }
    console.log(`${logPrefix} ✅ Style exists and is global`)

    // Verify category and sub-category if updating
    if (body.categoryId || body.subCategoryId) {
      console.log(`${logPrefix} Verifying category/sub-category...`)
      const categoryId = body.categoryId || existingStyle.categoryId
      const subCategoryId = body.subCategoryId || existingStyle.subCategoryId
      console.log(`${logPrefix} Category ID to verify:`, categoryId)
      console.log(`${logPrefix} Sub-category ID to verify:`, subCategoryId)

      const category = await prisma.category.findUnique({
        where: { id: categoryId },
      })

      if (!category) {
        console.error(`${logPrefix} ERROR: Category not found:`, categoryId)
        return NextResponse.json({ error: 'Category not found' }, { status: 404 })
      }
      console.log(`${logPrefix} ✅ Category found:`, category.name)

      const subCategory = await prisma.subCategory.findUnique({
        where: { id: subCategoryId },
      })

      if (!subCategory) {
        console.error(`${logPrefix} ERROR: Sub-category not found:`, subCategoryId)
        return NextResponse.json({ error: 'Sub-category not found' }, { status: 404 })
      }
      console.log(`${logPrefix} ✅ Sub-category found:`, subCategory.name)

      // Verify sub-category belongs to category
      if (subCategory.categoryId !== categoryId) {
        console.error(`${logPrefix} ERROR: Sub-category mismatch:`, {
          subCategoryCategoryId: subCategory.categoryId,
          expectedCategoryId: categoryId,
        })
        return NextResponse.json(
          { error: 'Sub-category does not belong to the specified category' },
          { status: 400 }
        )
      }
      console.log(`${logPrefix} ✅ Category/sub-category relationship verified`)
    }

    // Validate and filter images - only accept HTTP/HTTPS URLs
    console.log(`${logPrefix} Building update data...`)

    const isValidHttpUrl = (url: string): boolean => {
      if (typeof url !== 'string') {
        console.warn(`${logPrefix} URL is not a string:`, typeof url, url)
        return false
      }
      // Reject blob URLs - they're client-side only
      if (url.startsWith('blob:')) {
        console.warn(`${logPrefix} Rejecting blob URL:`, url)
        return false
      }
      try {
        const parsed = new URL(url)
        const isValid = parsed.protocol === 'http:' || parsed.protocol === 'https:'
        if (!isValid) {
          console.warn(`${logPrefix} Invalid protocol:`, parsed.protocol, 'for URL:', url)
        }
        return isValid
      } catch (err) {
        console.warn(`${logPrefix} Invalid URL:`, url, 'Error:', err)
        return false
      }
    }

    // Build update data object
    const updateData: any = {
      updatedAt: new Date(),
    }

    // Only update fields that are provided
    if (body.name) {
      console.log(`${logPrefix} Updating name:`, body.name)
      updateData.name = body.name
    }
    if (body.categoryId) {
      console.log(`${logPrefix} Updating categoryId:`, body.categoryId)
      updateData.categoryId = body.categoryId
    }
    if (body.subCategoryId) {
      console.log(`${logPrefix} Updating subCategoryId:`, body.subCategoryId)
      updateData.subCategoryId = body.subCategoryId
    }
    if (body.slug) {
      console.log(`${logPrefix} Updating slug:`, body.slug)
      updateData.slug = body.slug
    }
    if (body.colorId) {
      console.log(`${logPrefix} Updating colorId:`, body.colorId)
      updateData.colorId = body.colorId
    }
    if (body.palette) {
      console.log(`${logPrefix} Updating palette`)
      updateData.palette = body.palette
    }

    // Filter and validate images if provided
    if (body.images !== undefined) {
      console.log(`${logPrefix} Processing images:`, {
        provided: body.images?.length || 0,
        type: Array.isArray(body.images) ? 'array' : typeof body.images,
        sample: body.images?.[0],
      })

      const validatedImages = Array.isArray(body.images)
        ? body.images.filter((url: string) => {
            const isValid = isValidHttpUrl(url)
            console.log(`${logPrefix} Image URL validation:`, { url, isValid })
            return isValid
          })
        : []

      console.log(`${logPrefix} Images after validation:`, {
        original: body.images?.length || 0,
        valid: validatedImages.length,
        urls: validatedImages,
      })
      updateData.images = validatedImages
    }

    // Handle materialSet if provided
    if (body.materialSet) {
      console.log(`${logPrefix} Updating materialSet:`, {
        defaultsCount: body.materialSet.defaults?.length || 0,
        alternativesCount: body.materialSet.alternatives?.length || 0,
      })

      // Clean empty strings from ObjectID fields (Prisma expects undefined or valid ObjectID)
      const cleanedMaterialSet = {
        defaults: (body.materialSet.defaults || []).map((d: any) => ({
          materialId: d.materialId,
        })),
        alternatives: body.materialSet.alternatives || [],
      }

      console.log(`${logPrefix} Cleaned materialSet:`, {
        defaults: cleanedMaterialSet.defaults.map((d: any) => ({
          materialId: d.materialId,
        })),
      })

      updateData.materialSet = cleanedMaterialSet
    }

    // Filter and validate roomProfiles if provided
    if (body.roomProfiles !== undefined) {
      console.log(`${logPrefix} Processing roomProfiles:`, {
        count: body.roomProfiles?.length || 0,
        type: Array.isArray(body.roomProfiles) ? 'array' : typeof body.roomProfiles,
      })

      const validatedRoomProfiles = Array.isArray(body.roomProfiles)
        ? body.roomProfiles.map((profile: any, index: number) => {
            console.log(`${logPrefix} Processing room profile ${index}:`, {
              roomType: profile.roomType,
              materialsCount: profile.materials?.length || 0,
              imagesCount: profile.images?.length || 0,
            })

            const validatedImages = Array.isArray(profile.images)
              ? profile.images.filter((url: string) => {
                  const isValid = isValidHttpUrl(url)
                  console.log(`${logPrefix} Room ${index} image validation:`, { url, isValid })
                  return isValid
                })
              : []

            console.log(`${logPrefix} Room ${index} after validation:`, {
              originalImages: profile.images?.length || 0,
              validImages: validatedImages.length,
            })

            return {
              roomType: profile.roomType,
              materials: profile.materials || [],
              images: validatedImages,
              constraints: profile.constraints || null,
            }
          })
        : []

      console.log(`${logPrefix} RoomProfiles after validation:`, {
        count: validatedRoomProfiles.length,
        profiles: validatedRoomProfiles.map((p: any) => ({
          roomType: p.roomType,
          materialsCount: p.materials.length,
          imagesCount: p.images.length,
        })),
      })
      updateData.roomProfiles = validatedRoomProfiles
    }

    // Handle metadata if provided
    if (body.metadata) {
      console.log(`${logPrefix} Updating metadata:`, body.metadata)
      updateData.metadata = {
        ...existingStyle.metadata,
        ...body.metadata,
      }
    }

    console.log(`${logPrefix} Final update data:`, JSON.stringify(updateData, null, 2))

    // Update style
    console.log(`${logPrefix} Executing Prisma update...`)
    let style
    try {
      style = await prisma.style.update({
        where: { id: styleId },
        data: updateData,
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

      console.log(`${logPrefix} ✅ Update successful`)
      console.log(`${logPrefix} Updated style:`, {
        id: style.id,
        name: style.name,
        imagesCount: style.images?.length || 0,
        roomProfilesCount: style.roomProfiles?.length || 0,
      })
    } catch (prismaError) {
      console.error(`${logPrefix} ========== PRISMA UPDATE ERROR ==========`)
      console.error(`${logPrefix} Error:`, prismaError)
      if (prismaError instanceof Error) {
        console.error(`${logPrefix} Name:`, prismaError.name)
        console.error(`${logPrefix} Message:`, prismaError.message)
        console.error(`${logPrefix} Stack:`, prismaError.stack)
      }
      if (prismaError && typeof prismaError === 'object') {
        console.error(`${logPrefix} Error keys:`, Object.keys(prismaError))
        if ('code' in prismaError) {
          console.error(`${logPrefix} Prisma error code:`, (prismaError as any).code)
        }
        if ('meta' in prismaError) {
          console.error(`${logPrefix} Prisma meta:`, JSON.stringify((prismaError as any).meta, null, 2))
        }
        if ('clientVersion' in prismaError) {
          console.error(`${logPrefix} Prisma client version:`, (prismaError as any).clientVersion)
        }
      }
      console.error(`${logPrefix} Update data that failed:`, JSON.stringify(updateData, null, 2))
      console.error(`${logPrefix} ========================================`)
      throw prismaError
    }

    console.log(`${logPrefix} ========== END UPDATE REQUEST (SUCCESS) ==========`)
    return NextResponse.json(style)
  } catch (error) {
    console.error(`${logPrefix} ========== UNHANDLED ERROR ==========`)
    console.error(`${logPrefix} Error:`, error)
    if (error instanceof Error) {
      console.error(`${logPrefix} Name:`, error.name)
      console.error(`${logPrefix} Message:`, error.message)
      console.error(`${logPrefix} Stack:`, error.stack)
    }
    console.error(`${logPrefix} ====================================`)
    console.log(`${logPrefix} ========== END UPDATE REQUEST (FAILED) ==========`)
    return handleError(error)
  }
})

/**
 * DELETE /api/admin/styles/[id] - Delete global style
 */
export const DELETE = withAdmin(async (req: NextRequest, auth) => {
  try {
    const url = new URL(req.url)
    const styleId = url.pathname.split('/').pop()

    if (!styleId) {
      return NextResponse.json({ error: 'Style ID is required' }, { status: 400 })
    }

    // Validate ObjectID format
    if (!isValidObjectId(styleId)) {
      return NextResponse.json(
        { error: 'Invalid style ID format' },
        { status: 400 }
      )
    }

    // Check if style exists and is global
    const existingStyle = await prisma.style.findUnique({
      where: { id: styleId },
    })

    if (!existingStyle) {
      return NextResponse.json({ error: 'Style not found' }, { status: 404 })
    }

    if (existingStyle.organizationId !== null) {
      return NextResponse.json(
        { error: 'This is not a global style' },
        { status: 403 }
      )
    }

    // Delete style
    await prisma.style.delete({
      where: { id: styleId },
    })

    return NextResponse.json({ message: 'Style deleted successfully' })
  } catch (error) {
    return handleError(error)
  }
})

