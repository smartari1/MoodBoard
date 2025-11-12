import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAdmin, handleError } from '@/lib/api/admin-middleware'
import { updateStyleSchema } from '@/lib/validations/style'

export const dynamic = 'force-dynamic'

const objectIdRegex = /^[0-9a-fA-F]{24}$/
const isValidObjectId = (id: string) => objectIdRegex.test(id)

const sanitizeImages = (images?: string[]) =>
  Array.isArray(images)
    ? images.filter((url) => {
        try {
          if (typeof url !== 'string' || url.startsWith('blob:')) return false
          const parsed = new URL(url)
          return parsed.protocol === 'http:' || parsed.protocol === 'https:'
        } catch {
          return false
        }
      })
    : []

export const GET = withAdmin(async (req: NextRequest) => {
  try {
    const styleId = req.nextUrl.pathname.split('/').pop()
    if (!styleId || !isValidObjectId(styleId)) {
      return NextResponse.json({ error: 'Invalid style ID' }, { status: 400 })
    }

    const style = await prisma.style.findUnique({
      where: { id: styleId },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        subCategory: { select: { id: true, name: true, slug: true } },
        color: { select: { id: true, name: true, hex: true, pantone: true, category: true } },
        approaches: true,
      },
    })

    if (!style || style.organizationId !== null) {
      return NextResponse.json({ error: 'Style not found' }, { status: 404 })
    }

    return NextResponse.json(style)
  } catch (error) {
    return handleError(error)
  }
})

export const PATCH = withAdmin(async (req: NextRequest) => {
  try {
    const styleId = req.nextUrl.pathname.split('/').pop()
    if (!styleId || !isValidObjectId(styleId)) {
      return NextResponse.json({ error: 'Invalid style ID' }, { status: 400 })
    }

    const existingStyle = await prisma.style.findUnique({ where: { id: styleId } })
    if (!existingStyle || existingStyle.organizationId !== null) {
      return NextResponse.json({ error: 'Style not found' }, { status: 404 })
    }

    const rawBody = await req.json()
    const parseResult = updateStyleSchema.safeParse(rawBody)
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Validation failed', details: parseResult.error.flatten() }, { status: 400 })
    }

    const body = parseResult.data

    if (body.categoryId || body.subCategoryId) {
      const categoryId = body.categoryId || existingStyle.categoryId
      const subCategoryId = body.subCategoryId || existingStyle.subCategoryId

      const category = await prisma.category.findUnique({ where: { id: categoryId } })
      if (!category) {
        return NextResponse.json({ error: 'Category not found' }, { status: 404 })
      }

      const subCategory = await prisma.subCategory.findUnique({ where: { id: subCategoryId } })
      if (!subCategory) {
        return NextResponse.json({ error: 'Sub-category not found' }, { status: 404 })
      }

      if (subCategory.categoryId !== categoryId) {
        return NextResponse.json(
          { error: 'Sub-category does not belong to the specified category' },
          { status: 400 }
        )
      }
    }

    if (body.slug) {
      const duplicate = await prisma.style.findFirst({
        where: {
          slug: body.slug,
          id: { not: styleId },
        },
      })
      if (duplicate) {
        return NextResponse.json({ error: 'Style with this slug already exists' }, { status: 409 })
      }
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() }

    if (body.name) updateData.name = body.name
    if (body.slug) updateData.slug = body.slug
    if (body.categoryId) updateData.categoryId = body.categoryId
    if (body.subCategoryId) updateData.subCategoryId = body.subCategoryId
    if (body.colorId) updateData.colorId = body.colorId
    if (body.images !== undefined) updateData.images = sanitizeImages(body.images as string[])
    if (body.metadata) {
      updateData.metadata = {
        ...existingStyle.metadata,
        ...body.metadata,
      }
    }

    const updatedStyle = await prisma.style.update({
      where: { id: styleId },
      data: updateData,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        subCategory: { select: { id: true, name: true, slug: true } },
        color: { select: { id: true, name: true, hex: true, pantone: true, category: true } },
        approaches: true,
      },
    })

    return NextResponse.json(updatedStyle)
  } catch (error) {
    return handleError(error)
  }
})

export const DELETE = withAdmin(async (req: NextRequest) => {
  try {
    const styleId = req.nextUrl.pathname.split('/').pop()
    if (!styleId || !isValidObjectId(styleId)) {
      return NextResponse.json({ error: 'Invalid style ID' }, { status: 400 })
    }

    const existingStyle = await prisma.style.findUnique({ where: { id: styleId } })
    if (!existingStyle || existingStyle.organizationId !== null) {
      return NextResponse.json({ error: 'Style not found' }, { status: 404 })
    }

    await prisma.style.delete({ where: { id: styleId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleError(error)
  }
})
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

