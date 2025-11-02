/**
 * Admin Materials API
 * GET /api/admin/materials - List all materials (organization-scoped)
 * POST /api/admin/materials - Create material (admin only)
 */

import { handleError, validateRequest, withAdmin } from '@/lib/api/admin-middleware'
import { prisma } from '@/lib/db'
import { createMaterialSchema, materialFiltersSchema } from '@/lib/validations/material'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/admin/materials - List all materials (organization-scoped)
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

    // Build where clause - always filter by user's organization
    const where: any = {
      organizationId: auth.organizationId,
    }

    // Add search filter (by name or SKU)
    if (filters.search && filters.search.trim()) {
      where.OR = [
        { 'name.he': { contains: filters.search } },
        { 'name.en': { contains: filters.search } },
        { sku: { contains: filters.search.toUpperCase() } },
      ]
    }

    // Add category filter
    if (filters.categoryId) {
      where.categoryId = filters.categoryId
    }

    // Add type filter
    if (filters.typeId) {
      where['properties.typeId'] = filters.typeId
    }

    // Get total count
    const total = await prisma.material.count({ where })

    // Get materials
    const materials = await prisma.material.findMany({
      where,
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
 */
export const POST = withAdmin(async (req: NextRequest, auth) => {
  try {
    // Validate request body
    const body = await validateRequest(req, createMaterialSchema)

    // Use organizationId from body if provided, otherwise use auth context
    const organizationId = body.organizationId || auth.organizationId

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

    // Check if SKU already exists for this organization
    const existingMaterial = await prisma.material.findFirst({
      where: {
        sku: body.sku.toUpperCase(),
        organizationId: organizationId,
      },
    })

    if (existingMaterial) {
      return NextResponse.json(
        { error: 'Material with this SKU already exists in this organization' },
        { status: 409 }
      )
    }

    // Create material with organizationId
    const material = await prisma.material.create({
      data: {
        organizationId: organizationId,
        sku: body.sku.toUpperCase(), // Store in uppercase for consistency
        name: body.name,
        categoryId: body.categoryId,
        properties: body.properties as any,
        pricing: body.pricing as any,
        availability: body.availability as any,
        assets: body.assets || {
          thumbnail: '',
          images: [],
        } as any,
      },
    })

    return NextResponse.json(material, { status: 201 })
  } catch (error) {
    return handleError(error)
  }
})

