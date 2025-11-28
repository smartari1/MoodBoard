/**
 * Style Textures API
 * Fetch Texture entities linked to a style via StyleTexture join table
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

    // Fetch textures via StyleTexture join table
    const styleTextures = await prisma.styleTexture.findMany({
      where: {
        styleId,
      },
      include: {
        texture: {
          include: {
            category: true,
            type: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    // Extract texture data with usage count
    const textures = await Promise.all(
      styleTextures.map(async (st) => {
        const usageCount = await prisma.styleTexture.count({
          where: {
            textureId: st.texture.id,
          },
        })

        return {
          ...st.texture,
          usageCount,
          notes: st.notes,
        }
      })
    )

    // Group by category
    const groupedByCategory: Record<string, typeof textures> = {}

    textures.forEach((texture) => {
      const catName = texture.category.name.en
      if (!groupedByCategory[catName]) {
        groupedByCategory[catName] = []
      }
      groupedByCategory[catName].push(texture)
    })

    return NextResponse.json({
      success: true,
      data: {
        textures,
        groupedByCategory,
        counts: {
          total: textures.length,
          byCategory: Object.entries(groupedByCategory).map(([category, items]) => ({
            category,
            count: items.length,
          })),
        },
      },
    })
  } catch (error: any) {
    console.error('[STYLE TEXTURES GET] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
