/**
 * Style Images API
 * Fetch StyleImage entities for a style, optionally filtered by category
 */

import { prisma } from '@/lib/db/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const styleId = params.id
    const { searchParams } = new URL(request.url)

    const category = searchParams.get('category') // Optional: ROOM_OVERVIEW, MATERIAL, TEXTURE, etc.
    const roomType = searchParams.get('roomType') // Optional: filter by room type
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined

    // Verify style exists
    const style = await prisma.style.findUnique({
      where: { id: styleId },
      select: { id: true },
    })

    if (!style) {
      return NextResponse.json(
        { error: 'Style not found' },
        { status: 404 }
      )
    }

    // Build query filters
    const where: any = {
      styleId,
    }

    if (category) {
      where.imageCategory = category
    }

    if (roomType) {
      where.roomType = roomType
    }

    // Fetch style images
    const styleImages = await prisma.styleImage.findMany({
      where,
      orderBy: [
        { imageCategory: 'asc' },
        { displayOrder: 'asc' },
        { createdAt: 'asc' },
      ],
      take: limit,
      include: {
        texture: {
          include: {
            category: true,
            type: true,
          },
        },
      },
    })

    // Group by category for easier frontend consumption
    const groupedByCategory: Record<string, typeof styleImages> = {}

    styleImages.forEach((image) => {
      const cat = image.imageCategory
      if (!groupedByCategory[cat]) {
        groupedByCategory[cat] = []
      }
      groupedByCategory[cat].push(image)
    })

    return NextResponse.json({
      success: true,
      data: {
        images: styleImages,
        groupedByCategory,
        counts: {
          total: styleImages.length,
          ROOM_OVERVIEW: groupedByCategory.ROOM_OVERVIEW?.length || 0,
          ROOM_DETAIL: groupedByCategory.ROOM_DETAIL?.length || 0,
          MATERIAL: groupedByCategory.MATERIAL?.length || 0,
          TEXTURE: groupedByCategory.TEXTURE?.length || 0,
          COMPOSITE: groupedByCategory.COMPOSITE?.length || 0,
          ANCHOR: groupedByCategory.ANCHOR?.length || 0,
        },
      },
    })
  } catch (error: any) {
    console.error('[STYLE IMAGES GET] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
