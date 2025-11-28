/**
 * Admin Materials API - Single Material
 * GET /api/admin/materials/[id] - Get material
 * PATCH /api/admin/materials/[id] - Update material
 * DELETE /api/admin/materials/[id] - Delete material
 */

import { handleError, validateRequest, withAdmin } from '@/lib/api/admin-middleware'
import { prisma } from '@/lib/db'
import { updateMaterialSchema } from '@/lib/validations/material'
import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'


/**
 * Helper function to validate ObjectID format
 */
function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id)
}

/**
 * GET /api/admin/materials/[id] - Get material with suppliers
 */
export const GET = withAdmin(async (req: NextRequest, auth) => {
  try {
    const url = new URL(req.url)
    const materialId = url.pathname.split('/').pop()

    if (!materialId) {
      return NextResponse.json({ error: 'Material ID is required' }, { status: 400 })
    }

    // Validate ObjectID format
    if (!isValidObjectId(materialId)) {
      return NextResponse.json(
        { error: 'Invalid material ID format' },
        { status: 400 }
      )
    }

    const material = await prisma.material.findUnique({
      where: {
        id: materialId,
      },
      include: {
        suppliers: {
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    })

    if (!material) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 })
    }

    return NextResponse.json(material)
  } catch (error) {
    return handleError(error)
  }
})

/**
 * PATCH /api/admin/materials/[id] - Update material with suppliers
 * Updates material shared properties and supplier-specific data (pricing, availability, colors)
 */
export const PATCH = withAdmin(async (req: NextRequest, auth) => {
  try {
    const url = new URL(req.url)
    const materialId = url.pathname.split('/').pop()

    if (!materialId) {
      return NextResponse.json({ error: 'Material ID is required' }, { status: 400 })
    }

    // Validate ObjectID format
    if (!isValidObjectId(materialId)) {
      return NextResponse.json(
        { error: 'Invalid material ID format' },
        { status: 400 }
      )
    }

    // Validate request body
    const body = await validateRequest(req, updateMaterialSchema)

    // Check if material exists
    const existingMaterial = await prisma.material.findUnique({
      where: { id: materialId },
      include: { suppliers: true },
    })

    if (!existingMaterial) {
      return NextResponse.json(
        { error: 'Material not found' },
        { status: 404 }
      )
    }

    const suppliers = body.suppliers

    // Validate suppliers if provided
    if (suppliers && suppliers.length > 0) {
      const orgIds = suppliers.map((s) => s.organizationId)
      const orgs = await prisma.organization.findMany({
        where: { id: { in: orgIds } },
      })

      if (orgs.length !== orgIds.length) {
        return NextResponse.json(
          { error: 'One or more supplier organization IDs are invalid' },
          { status: 400 }
        )
      }

      // Validate all colorIds across all suppliers
      const allColorIds = suppliers.flatMap((s) => s.colorIds || [])
      if (allColorIds.length > 0) {
        const uniqueColorIds = [...new Set(allColorIds)]
        const colors = await prisma.color.findMany({
          where: { id: { in: uniqueColorIds } },
        })

        if (colors.length !== uniqueColorIds.length) {
          return NextResponse.json(
            { error: 'One or more color IDs are invalid' },
            { status: 400 }
          )
        }
      }
    }

    // Check if SKU is being updated and if it conflicts
    if (body.sku && body.sku !== existingMaterial.sku) {
      const skuConflict = await prisma.material.findFirst({
        where: {
          sku: body.sku.toUpperCase(),
          id: { not: materialId },
        },
      })

      if (skuConflict) {
        return NextResponse.json(
          { error: 'Material with this SKU already exists' },
          { status: 409 }
        )
      }
    }

    // Update material and suppliers in a transaction
    const material = await prisma.$transaction(async (tx) => {
      // Update material (shared properties only)
      await tx.material.update({
        where: { id: materialId },
        data: {
          ...(body.sku && { sku: body.sku.toUpperCase() }),
          ...(body.name && { name: body.name }),
          ...(body.categoryId && { categoryId: body.categoryId }),
          ...(body.textureId !== undefined && { textureId: body.textureId || null }),
          ...(body.properties && { properties: body.properties as any }),
          ...(body.assets !== undefined && { assets: body.assets as any }),
          updatedAt: new Date(),
        },
      })

      // Update suppliers if provided (replace all)
      if (suppliers !== undefined) {
        // Delete existing suppliers
        await tx.materialSupplier.deleteMany({
          where: { materialId },
        })

        // Create new suppliers with their pricing, availability, and colors
        if (suppliers.length > 0) {
          for (const supplier of suppliers) {
            await tx.materialSupplier.create({
              data: {
                materialId,
                organizationId: supplier.organizationId,
                supplierSku: supplier.supplierSku,
                colorIds: supplier.colorIds || [],
                pricing: supplier.pricing as any,
                availability: supplier.availability as any,
                isPreferred: supplier.isPreferred || false,
                notes: supplier.notes,
              },
            })
          }
        }
      }

      // Return updated material with suppliers
      return tx.material.findUnique({
        where: { id: materialId },
        include: {
          suppliers: {
            include: {
              organization: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },
      })
    })

    return NextResponse.json(material)
  } catch (error) {
    return handleError(error)
  }
})

/**
 * DELETE /api/admin/materials/[id] - Delete material
 * Suppliers are automatically deleted via cascade
 */
export const DELETE = withAdmin(async (req: NextRequest, auth) => {
  try {
    const url = new URL(req.url)
    const materialId = url.pathname.split('/').pop()

    if (!materialId) {
      return NextResponse.json({ error: 'Material ID is required' }, { status: 400 })
    }

    // Validate ObjectID format
    if (!isValidObjectId(materialId)) {
      return NextResponse.json(
        { error: 'Invalid material ID format' },
        { status: 400 }
      )
    }

    // Check if material exists
    const existingMaterial = await prisma.material.findUnique({
      where: { id: materialId },
    })

    if (!existingMaterial) {
      return NextResponse.json(
        { error: 'Material not found' },
        { status: 404 }
      )
    }

    // Delete material (suppliers are automatically deleted via cascade)
    await prisma.material.delete({
      where: { id: materialId },
    })

    return NextResponse.json({ message: 'Material deleted successfully' })
  } catch (error) {
    return handleError(error)
  }
})

