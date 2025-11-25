/**
 * Admin Materials API
 * GET /api/admin/materials - List all materials (organization-scoped)
 * POST /api/admin/materials - Create material (admin only)
 */

import { handleError, validateRequest, withAdmin } from '@/lib/api/admin-middleware'
import { prisma } from '@/lib/db'
import { createMaterialSchema, materialFiltersSchema } from '@/lib/validations/material'
import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'


/**
 * GET /api/admin/materials - List all materials
 * Returns materials with their suppliers (organizations)
 */
export const GET = withAdmin(async (req: NextRequest, auth) => {
  try {
    // Parse query parameters
    const { searchParams } = new URL(req.url)
    const filters = materialFiltersSchema.parse({
      search: searchParams.get('search') || undefined,
      categoryId: searchParams.get('categoryId') || undefined,
      typeId: searchParams.get('typeId') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
    })

    // Build where clause - materials are now global or filtered by supplier
    const where: any = {
      AND: [],
    }

    // Add search filter (by name or SKU)
    if (filters.search && filters.search.trim()) {
      where.AND.push({
        OR: [
          { 'name.he': { contains: filters.search } },
          { 'name.en': { contains: filters.search } },
          { sku: { contains: filters.search.toUpperCase() } },
        ],
      })
    }

    // Add category filter
    if (filters.categoryId) {
      where.AND.push({ categoryId: filters.categoryId })
    }

    // Add type filter
    if (filters.typeId) {
      where.AND.push({ 'properties.typeId': filters.typeId })
    }

    // Remove empty AND array
    if (where.AND.length === 0) {
      delete where.AND
    }

    // Get total count
    const total = await prisma.material.count({ where: Object.keys(where).length > 0 ? where : undefined })

    // Get materials with suppliers
    const materials = await prisma.material.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
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
      orderBy: { createdAt: 'desc' },
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
    })

    return NextResponse.json({
      data: materials || [],
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: total || 0,
        totalPages: Math.ceil((total || 0) / filters.limit),
      },
    })
  } catch (error) {
    console.error('Error fetching materials:', error)
    return handleError(error)
  }
})

/**
 * POST /api/admin/materials - Create material (admin only)
 * Creates material and links to suppliers (organizations) via MaterialSupplier join table
 */
export const POST = withAdmin(async (req: NextRequest, auth) => {
  try {
    // Validate request body
    const body = await validateRequest(req, createMaterialSchema)

    // Validate that all colorIds exist in Color model (colors are global, no org check)
    if (body.properties.colorIds && body.properties.colorIds.length > 0) {
      const colors = await prisma.color.findMany({
        where: {
          id: { in: body.properties.colorIds },
        },
      })

      if (colors.length !== body.properties.colorIds.length) {
        return NextResponse.json(
          { error: 'One or more color IDs are invalid' },
          { status: 400 }
        )
      }
    }

    // Validate that all supplierIds exist
    const supplierIds = body.supplierIds || []
    if (supplierIds.length > 0) {
      const orgs = await prisma.organization.findMany({
        where: {
          id: { in: supplierIds },
        },
      })

      if (orgs.length !== supplierIds.length) {
        return NextResponse.json(
          { error: 'One or more supplier IDs are invalid' },
          { status: 400 }
        )
      }
    }

    // Check if SKU already exists globally (SKU is now unique across all materials)
    const existingMaterial = await prisma.material.findFirst({
      where: {
        sku: body.sku.toUpperCase(),
      },
    })

    if (existingMaterial) {
      return NextResponse.json(
        { error: 'Material with this SKU already exists' },
        { status: 409 }
      )
    }

    // Create material and suppliers in a transaction
    const material = await prisma.$transaction(async (tx) => {
      // Create material
      const newMaterial = await tx.material.create({
        data: {
          sku: body.sku.toUpperCase(), // Store in uppercase for consistency
          name: body.name,
          categoryId: body.categoryId,
          textureId: body.textureId || null, // Link to Texture entity
          properties: body.properties as any,
          pricing: body.pricing as any,
          availability: body.availability as any,
          assets: body.assets || {
            thumbnail: '',
            images: [],
          } as any,
        },
      })

      // Create supplier links if any
      if (supplierIds.length > 0) {
        await tx.materialSupplier.createMany({
          data: supplierIds.map((orgId) => ({
            materialId: newMaterial.id,
            organizationId: orgId,
          })),
        })
      }

      // Return material with suppliers
      return tx.material.findUnique({
        where: { id: newMaterial.id },
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

    return NextResponse.json(material, { status: 201 })
  } catch (error) {
    return handleError(error)
  }
})

