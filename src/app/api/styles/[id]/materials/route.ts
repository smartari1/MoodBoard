/**
 * Style Materials API
 * Fetch Material entities linked to a style via StyleMaterial join table
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

    // Fetch materials via StyleMaterial join table
    const styleMaterials = await prisma.styleMaterial.findMany({
      where: {
        styleId,
      },
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
      orderBy: {
        createdAt: 'asc',
      },
    })

    // Extract material data with usage count
    const materials = await Promise.all(
      styleMaterials.map(async (sm) => {
        const usageCount = await prisma.styleMaterial.count({
          where: {
            materialId: sm.material.id,
          },
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
