/**
 * Style Materials API
 * Fetch Material entities linked to a style via:
 * 1. StyleMaterial join table (style-level materials)
 * 2. Embedded roomProfiles[].materials[].materialId (room-level materials)
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

    // Fetch style with roomProfiles to get embedded material IDs
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

    // 1. Get style-level materials from StyleMaterial join table
    const styleMaterialLinks = await prisma.styleMaterial.findMany({
      where: { styleId },
      include: {
        material: {
          include: {
            category: true,
            texture: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
              },
            },
          },
        },
      },
    })

    const styleLevelMaterials = await Promise.all(
      styleMaterialLinks.map(async (sm) => {
        const usageCount = await prisma.styleMaterial.count({
          where: { materialId: sm.material.id },
        })
        return {
          id: sm.material.id,
          name: sm.material.name,
          sku: sm.material.sku,
          isAbstract: sm.material.isAbstract,
          aiDescription: sm.material.aiDescription,
          generationStatus: sm.material.generationStatus,
          category: sm.material.category,
          texture: sm.material.texture,
          assets: sm.material.assets,
          usageCount,
          linkedAt: sm.createdAt,
        }
      })
    )

    // 2. Get room-level materials from embedded roomProfiles
    const roomMaterialsMap = new Map<string, {
      materialId: string
      application: any
      finish: string | null
      roomTypeId: string
      roomDescription: any
    }[]>()

    roomProfiles.forEach((profile) => {
      const embeddedMaterials = profile.materials || []
      embeddedMaterials.forEach((mat: any) => {
        if (mat.materialId) {
          if (!roomMaterialsMap.has(mat.materialId)) {
            roomMaterialsMap.set(mat.materialId, [])
          }
          roomMaterialsMap.get(mat.materialId)!.push({
            materialId: mat.materialId,
            application: mat.application,
            finish: mat.finish,
            roomTypeId: profile.roomTypeId,
            roomDescription: profile.description,
          })
        }
      })
    })

    const roomMaterialIds = Array.from(roomMaterialsMap.keys())

    let roomLevelMaterials: any[] = []
    if (roomMaterialIds.length > 0) {
      const materialEntities = await prisma.material.findMany({
        where: {
          id: { in: roomMaterialIds },
        },
        include: {
          category: true,
          texture: {
            select: {
              id: true,
              name: true,
              imageUrl: true,
            },
          },
        },
      })

      roomLevelMaterials = await Promise.all(
        materialEntities.map(async (material) => {
          const usageCount = await prisma.styleMaterial.count({
            where: { materialId: material.id },
          })
          const roomUsages = roomMaterialsMap.get(material.id) || []

          return {
            id: material.id,
            name: material.name,
            sku: material.sku,
            isAbstract: material.isAbstract,
            aiDescription: material.aiDescription,
            generationStatus: material.generationStatus,
            category: material.category,
            texture: material.texture,
            assets: material.assets,
            usageCount: Math.max(usageCount, 1),
            // Include all room usages for this material
            roomUsages: roomUsages.map(ru => ({
              application: ru.application,
              finish: ru.finish,
              roomTypeId: ru.roomTypeId,
              roomDescription: ru.roomDescription,
            })),
            // Primary application (first one found)
            application: roomUsages[0]?.application,
            finish: roomUsages[0]?.finish,
          }
        })
      )
    }

    // Combine all materials (for backward compatibility)
    const styleMaterialIds = new Set(styleLevelMaterials.map(m => m.id))
    const allMaterials = [
      ...styleLevelMaterials,
      ...roomLevelMaterials.filter(m => !styleMaterialIds.has(m.id)),
    ]

    // Group by category
    const groupedByCategory: Record<string, typeof allMaterials> = {}
    allMaterials.forEach((material) => {
      const catName = material.category?.name?.en || 'Uncategorized'
      if (!groupedByCategory[catName]) {
        groupedByCategory[catName] = []
      }
      groupedByCategory[catName].push(material)
    })

    return NextResponse.json({
      success: true,
      data: {
        // Separated by source
        styleLevelMaterials,
        roomLevelMaterials,
        // Combined (for backward compatibility)
        materials: allMaterials,
        groupedByCategory,
        counts: {
          total: allMaterials.length,
          styleLevel: styleLevelMaterials.length,
          roomLevel: roomLevelMaterials.length,
          byCategory: Object.entries(groupedByCategory).map(([category, items]) => ({
            category,
            count: items.length,
          })),
        },
      },
    })
  } catch (error: any) {
    console.error('[STYLE MATERIALS GET] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
