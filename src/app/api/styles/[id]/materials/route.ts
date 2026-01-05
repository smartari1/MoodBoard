/**
 * Style Materials API
 * Fetch Material entities linked to a style via:
 * 1. StyleMaterial join table (explicit links)
 * 2. Embedded roomProfiles[].materials[].materialId (implicit links)
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

    // Collect all material IDs from both sources
    const materialIdsSet = new Set<string>()

    // 1. Get materials from StyleMaterial join table
    const styleMaterials = await prisma.styleMaterial.findMany({
      where: { styleId },
      select: { materialId: true },
    })
    styleMaterials.forEach((sm) => materialIdsSet.add(sm.materialId))

    // 2. Get materials from embedded roomProfiles
    const roomProfiles = style.roomProfiles as any[] || []
    roomProfiles.forEach((profile) => {
      const embeddedMaterials = profile.materials || []
      embeddedMaterials.forEach((mat: any) => {
        if (mat.materialId) {
          materialIdsSet.add(mat.materialId)
        }
      })
    })

    const allMaterialIds = Array.from(materialIdsSet)

    if (allMaterialIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          materials: [],
          groupedByCategory: {},
          counts: { total: 0, byCategory: [] },
        },
      })
    }

    // Fetch all materials by IDs
    const materialEntities = await prisma.material.findMany({
      where: {
        id: { in: allMaterialIds },
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

    // Build materials array with usage count and application info
    const materials = await Promise.all(
      materialEntities.map(async (material) => {
        const usageCount = await prisma.styleMaterial.count({
          where: { materialId: material.id },
        })

        // Find application info from embedded data
        let application: any = null
        let finish: string | null = null
        for (const profile of roomProfiles) {
          const embeddedMat = (profile.materials || []).find(
            (m: any) => m.materialId === material.id
          )
          if (embeddedMat) {
            application = embeddedMat.application
            finish = embeddedMat.finish
            break
          }
        }

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
          usageCount: Math.max(usageCount, 1), // At least 1 since it's used in this style
          application,
          finish,
          linkedAt: new Date(),
        }
      })
    )

    // Group by category
    const groupedByCategory: Record<string, typeof materials> = {}

    materials.forEach((material) => {
      const catName = material.category?.name?.en || 'Uncategorized'
      if (!groupedByCategory[catName]) {
        groupedByCategory[catName] = []
      }
      groupedByCategory[catName].push(material)
    })

    return NextResponse.json({
      success: true,
      data: {
        materials,
        groupedByCategory,
        counts: {
          total: materials.length,
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
