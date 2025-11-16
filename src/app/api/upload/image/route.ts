/**
 * Image Upload API
 * POST /api/upload/image - Upload image to GCP Storage
 * DELETE /api/upload/image - Delete image from GCP Storage
 */

import { handleError, requirePermission, withAuth } from '@/lib/api/middleware'
import { prisma } from '@/lib/db'
import { deleteImageFromGCP, uploadImageToGCP, type EntityType } from '@/lib/storage/gcp-storage'
import { imageDeleteSchema, imageUploadSchema, validateImageFile } from '@/lib/validations/upload'
import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'


/**
 * POST /api/upload/image - Upload image to R2
 */
export const POST = withAuth(async (req: NextRequest, auth) => {
  try {
    requirePermission(auth, 'project:write')

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const entityType = formData.get('entityType') as string
    const entityId = formData.get('entityId') as string
    const projectId = formData.get('projectId') as string | null
    const roomId = formData.get('roomId') as string | null
    const roomType = formData.get('roomType') as string | null
    const organizationId = formData.get('organizationId') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file is a valid File object
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Invalid file object' }, { status: 400 })
    }

    // Validate file size
    if (file.size === 0) {
      return NextResponse.json({ error: 'File is empty' }, { status: 400 })
    }

    // Validate request data
    const validatedData = imageUploadSchema.parse({
      entityType,
      entityId,
      projectId: projectId || undefined,
      roomId: roomId || undefined,
      roomType: roomType || undefined,
    })

    // Validate file
    const validation = validateImageFile(file)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    // Verify entity exists and user has access
    if (validatedData.entityType === 'category' || validatedData.entityType === 'subcategory') {
      // For categories/subcategories, admin only
      if (auth.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
    } else if (validatedData.entityType === 'style') {
      // For styles, admin only
      if (auth.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }

      // In creation mode (empty entityId), allow upload - will be associated with style after creation
      if (validatedData.entityId && validatedData.entityId !== '') {
        // Edit mode - verify style exists and is a global style
        const style = await prisma.style.findUnique({
          where: { id: validatedData.entityId },
        })

        if (!style) {
          return NextResponse.json({ error: 'Style not found' }, { status: 404 })
        }

        // Verify it's a global style (organizationId = null)
        if (style.organizationId !== null) {
          return NextResponse.json(
            { error: 'Only global styles can be edited by admin' },
            { status: 403 }
          )
        }
      }
      // Creation mode - no validation needed, will use temporary ID for R2 path
    } else if (validatedData.entityType === 'room') {
      // For rooms, verify project exists and user has access
      if (!projectId) {
        return NextResponse.json({ error: 'Project ID is required for room images' }, { status: 400 })
      }

      const project = await prisma.project.findUnique({
        where: { id: projectId },
      })

      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 })
      }

      // Verify organization access
      if (project.organizationId !== auth.organizationId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
    } else if (validatedData.entityType === 'material') {
      // For materials in creation mode (empty entityId), allow upload using auth.organizationId
      if (!validatedData.entityId || validatedData.entityId === '') {
        // Creation mode - use auth.organizationId
        // This is allowed since we're creating a new material
      } else {
        // Edit mode - verify material exists and user has access
        const material = await prisma.material.findUnique({
          where: { id: validatedData.entityId },
        })

        if (!material) {
          return NextResponse.json({ error: 'Material not found' }, { status: 404 })
        }

        // Verify organization access
        if (material.organizationId !== auth.organizationId) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }
      }
    }

    // Convert file to buffer with error handling
    let arrayBuffer: ArrayBuffer
    try {
      arrayBuffer = await file.arrayBuffer()
    } catch (err) {
      return NextResponse.json(
        { error: `Failed to read file: ${err instanceof Error ? err.message : 'Unknown error'}` },
        { status: 400 }
      )
    }

    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      return NextResponse.json({ error: 'File data is empty' }, { status: 400 })
    }

    const buffer = Buffer.from(arrayBuffer)

    // Get organizationId for material uploads
    let orgId: string | undefined
    if (validatedData.entityType === 'material') {
      if (organizationId) {
        orgId = organizationId
      } else if (!validatedData.entityId || validatedData.entityId === '') {
        // Creation mode - use auth.organizationId
        orgId = auth.organizationId
      } else {
        // Fetch from material if not provided
        const material = await prisma.material.findUnique({
          where: { id: validatedData.entityId },
          select: { organizationId: true },
        })
        if (material) {
          orgId = material.organizationId
        }
      }
    }

    // Upload to GCP Storage
    const imageUrl = await uploadImageToGCP(
      buffer,
      file.type,
      validatedData.entityType as EntityType,
      validatedData.entityId,
      file.name,
      {
        projectId: validatedData.projectId,
        roomId: validatedData.roomId,
        roomType: validatedData.roomType,
        organizationId: orgId,
      }
    )

    return NextResponse.json(
      {
        url: imageUrl,
        success: true,
      },
      { status: 201 }
    )
  } catch (error) {
    return handleError(error)
  }
})

/**
 * DELETE /api/upload/image - Delete image from GCP Storage
 */
export const DELETE = withAuth(async (req: NextRequest, auth) => {
  try {
    requirePermission(auth, 'project:write')

    const body = await req.json()
    const validatedData = imageDeleteSchema.parse(body)

    // Extract key from URL to verify it's a valid GCP Storage URL
    const url = new URL(validatedData.url)
    if (!url.hostname.includes('storage.googleapis.com') && !url.hostname.includes('moodb-assets')) {
      return NextResponse.json({ error: 'Invalid image URL' }, { status: 400 })
    }

    // Delete from GCP Storage
    await deleteImageFromGCP(validatedData.url)

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleError(error)
  }
})

