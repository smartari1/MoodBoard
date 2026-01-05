/**
 * Style Textures API
 * Fetch Texture entities linked to a style via:
 * 1. StyleTexture join table (style-level textures)
 * 2. Materials linked to the style that have textures (room-level via material.textureId)
 *
 * Returns both separately for proper UI display
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

    const roomProfiles = style.roomProfiles as any[] || []

    // 1. Get style-level textures from StyleTexture join table
    const styleTextureLinks = await prisma.styleTexture.findMany({
      where: { styleId },
      include: {
        texture: {
          include: {
            category: true,
            type: true,
          },
        },
      },
    })

    const styleLevelTextures = await Promise.all(
      styleTextureLinks.map(async (st) => {
        const usageCount = await prisma.styleTexture.count({
          where: { textureId: st.texture.id },
        })
        return {
          ...st.texture,
          usageCount,
          notes: st.notes,
          source: 'style' as const,
        }
      })
    )

    // 2. Get room-level textures from materials in roomProfiles
    const roomMaterialIds = new Set<string>()
    const materialToRoomMap = new Map<string, {
      roomTypeId: string
      roomDescription: any
      application: any
      finish: string | null
    }[]>()

    roomProfiles.forEach((profile) => {
      const embeddedMaterials = profile.materials || []
      embeddedMaterials.forEach((mat: any) => {
        if (mat.materialId) {
          roomMaterialIds.add(mat.materialId)
          if (!materialToRoomMap.has(mat.materialId)) {
            materialToRoomMap.set(mat.materialId, [])
          }
          materialToRoomMap.get(mat.materialId)!.push({
            roomTypeId: profile.roomTypeId,
            roomDescription: profile.description,
            application: mat.application,
            finish: mat.finish,
          })
        }
      })
    })

    // Also get materials from StyleMaterial join table
    const styleMaterialLinks = await prisma.styleMaterial.findMany({
      where: { styleId },
      select: { materialId: true },
    })
    styleMaterialLinks.forEach((sm) => roomMaterialIds.add(sm.materialId))

    // Fetch materials with their textures
    let roomLevelTextures: any[] = []
    if (roomMaterialIds.size > 0) {
      const materialsWithTextures = await prisma.material.findMany({
        where: {
          id: { in: Array.from(roomMaterialIds) },
          textureId: { not: null },
        },
        include: {
          texture: {
            include: {
              category: true,
              type: true,
            },
          },
        },
      })

      // Build texture list with material info
      const textureMap = new Map<string, any>()
      for (const material of materialsWithTextures) {
        if (material.texture && !textureMap.has(material.texture.id)) {
          const usageCount = await prisma.styleTexture.count({
            where: { textureId: material.texture.id },
          })
          const roomInfo = materialToRoomMap.get(material.id) || []

          textureMap.set(material.texture.id, {
            ...material.texture,
            usageCount: Math.max(usageCount, 1),
            source: 'room' as const,
            linkedMaterial: {
              id: material.id,
              name: material.name,
              category: material.category,
            },
            roomUsages: roomInfo,
          })
        }
      }
      roomLevelTextures = Array.from(textureMap.values())
    }

    // Filter out room-level textures that are also style-level (avoid duplicates)
    const styleLevelTextureIds = new Set(styleLevelTextures.map(t => t.id))
    const filteredRoomLevelTextures = roomLevelTextures.filter(t => !styleLevelTextureIds.has(t.id))

    // Combine all textures
    const allTextures = [...styleLevelTextures, ...filteredRoomLevelTextures]

    // Group by category
    const groupedByCategory: Record<string, typeof allTextures> = {}
    allTextures.forEach((texture) => {
      const catName = texture.category?.name?.en || 'Uncategorized'
      if (!groupedByCategory[catName]) {
        groupedByCategory[catName] = []
      }
      groupedByCategory[catName].push(texture)
    })

    return NextResponse.json({
      success: true,
      data: {
        // Separated by source
        styleLevelTextures,
        roomLevelTextures: filteredRoomLevelTextures,
        // Combined (for backward compatibility)
        textures: allTextures,
        groupedByCategory,
        counts: {
          total: allTextures.length,
          styleLevel: styleLevelTextures.length,
          roomLevel: filteredRoomLevelTextures.length,
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
