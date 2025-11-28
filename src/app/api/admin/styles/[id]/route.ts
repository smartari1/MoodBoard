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
        approach: {
          select: {
            id: true,
            slug: true,
            name: true,
            order: true,
            metadata: true,
            detailedContent: true,
          },
        },
        color: { select: { id: true, name: true, hex: true, pantone: true, category: true } },
        // Include StyleImage records (categorized images from Phase 2)
        images: {
          orderBy: { displayOrder: 'asc' },
        },
        // Include linked textures
        textureLinks: {
          include: {
            texture: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
              },
            },
          },
        },
        // Include linked materials
        materialLinks: {
          include: {
            material: {
              select: {
                id: true,
                name: true,
                assets: true,
                category: true,
                aiDescription: true,
              },
            },
          },
        },
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

    if (body.approachId) {
      const approach = await prisma.approach.findUnique({ where: { id: body.approachId } })
      if (!approach) {
        return NextResponse.json({ error: 'Approach not found' }, { status: 404 })
      }
    }

    if (body.colorId) {
      const color = await prisma.color.findUnique({ where: { id: body.colorId } })
      if (!color) {
        return NextResponse.json({ error: 'Color not found' }, { status: 404 })
      }
    }

    // Verify room profiles if provided
    if (body.roomProfiles && body.roomProfiles.length > 0) {
      for (const [index, profile] of body.roomProfiles.entries()) {
        // Verify room type exists
        const roomType = await prisma.roomType.findUnique({
          where: { id: profile.roomTypeId },
        })
        if (!roomType) {
          return NextResponse.json(
            { error: `Room type not found for room profile ${index + 1}` },
            { status: 404 }
          )
        }

        // Verify all colors exist if provided
        if (profile.colors && profile.colors.length > 0) {
          for (const colorId of profile.colors) {
            const roomColor = await prisma.color.findUnique({
              where: { id: colorId },
            })
            if (!roomColor) {
              return NextResponse.json(
                { error: `Color not found in room profile ${index + 1}: ${colorId}` },
                { status: 404 }
              )
            }
          }
        }
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
    if (body.description !== undefined) updateData.description = body.description
    if (body.slug) updateData.slug = body.slug
    if (body.categoryId) updateData.categoryId = body.categoryId
    if (body.subCategoryId) updateData.subCategoryId = body.subCategoryId
    if (body.approachId) updateData.approachId = body.approachId
    if (body.colorId) updateData.colorId = body.colorId
    if (body.images !== undefined) updateData.images = sanitizeImages(body.images as string[])
    if (body.roomProfiles !== undefined) updateData.roomProfiles = body.roomProfiles
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
        approach: { select: { id: true, slug: true, name: true, order: true } },
        color: { select: { id: true, name: true, hex: true, pantone: true, category: true } },
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

