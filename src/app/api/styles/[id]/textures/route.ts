/**
 * Style Textures API
 * Fetch Texture entities linked to a style via:
 * 1. StyleTexture join table (explicit links)
 * 2. Materials linked to the style that have textures (implicit via material.textureId)
 * 3. Embedded roomProfiles[].materials[] that reference materials with textures
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

    // Fetch style with roomProfiles
    const style = await prisma.style.findUnique({
      where: { id: styleId },
      select: {
        id: true,
        roomProfiles: true,
      },
    })

    if (!style) {
      return NextResponse.json(
        { error: 'Style not found' },
        { status: 404 }
      )
    }

    // Collect all texture IDs from multiple sources
    const textureIdsSet = new Set<string>()

    // 1. Get textures from StyleTexture join table
    const styleTextures = await prisma.styleTexture.findMany({
      where: { styleId },
      select: { textureId: true, notes: true },
    })
    const textureNotes: Record<string, string | null> = {}
    styleTextures.forEach((st) => {
      textureIdsSet.add(st.textureId)
      textureNotes[st.textureId] = st.notes
    })

    // 2. Get material IDs from embedded roomProfiles
    const materialIdsSet = new Set<string>()
    const roomProfiles = style.roomProfiles as any[] || []
    roomProfiles.forEach((profile) => {
      const embeddedMaterials = profile.materials || []
      embeddedMaterials.forEach((mat: any) => {
        if (mat.materialId) {
          materialIdsSet.add(mat.materialId)
        }
      })
    })

    // 3. Get materials from StyleMaterial join table
    const styleMaterials = await prisma.styleMaterial.findMany({
      where: { styleId },
      select: { materialId: true },
    })
    styleMaterials.forEach((sm) => materialIdsSet.add(sm.materialId))

    // 4. Fetch materials to get their texture IDs
    if (materialIdsSet.size > 0) {
      const materials = await prisma.material.findMany({
        where: {
          id: { in: Array.from(materialIdsSet) },
          textureId: { not: null },
        },
        select: { textureId: true },
      })
      materials.forEach((m) => {
        if (m.textureId) {
          textureIdsSet.add(m.textureId)
        }
      })
    }

    const allTextureIds = Array.from(textureIdsSet)

    if (allTextureIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          textures: [],
          groupedByCategory: {},
          counts: { total: 0, byCategory: [] },
        },
      })
    }

    // Fetch all textures by IDs
    const textureEntities = await prisma.texture.findMany({
      where: {
        id: { in: allTextureIds },
      },
      include: {
        category: true,
        type: true,
      },
    })

    // Build textures array with usage count
    const textures = await Promise.all(
      textureEntities.map(async (texture) => {
        const usageCount = await prisma.styleTexture.count({
          where: { textureId: texture.id },
        })

        return {
          ...texture,
          usageCount: Math.max(usageCount, 1), // At least 1 since it's used in this style
          notes: textureNotes[texture.id] || null,
        }
      })
    )

    // Group by category
    const groupedByCategory: Record<string, typeof textures> = {}

    textures.forEach((texture) => {
      const catName = texture.category?.name?.en || 'Uncategorized'
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
