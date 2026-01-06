/**
 * Project Style Room Image Approve API
 * POST /api/project-style/[projectId]/rooms/[roomId]/images/approve - Save preview image to DB
 *
 * This endpoint saves a preview image (already uploaded to GCP) to the room's generatedImages array.
 * Used when user approves a generated image after preview.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth, handleError, requirePermission, verifyOrganizationAccess } from '@/lib/api/middleware'
import { z } from 'zod'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ projectId: string; roomId: string }>
}

// Validation schema for the preview image
const approveImageSchema = z.object({
  image: z.object({
    id: z.string(),
    url: z.string().url(),
    prompt: z.string().optional(),
    createdAt: z.string(),
  }),
})

interface GeneratedImage {
  id: string
  url: string
  prompt?: string
  createdAt: string | Date
}

/**
 * POST /api/project-style/[projectId]/rooms/[roomId]/images/approve - Save preview image to DB
 */
export const POST = withAuth(async (req: NextRequest, auth, context?: RouteContext) => {
  try {
    requirePermission(auth, 'project:write')

    if (!context) {
      return NextResponse.json({ error: 'Missing route context' }, { status: 400 })
    }

    const { projectId, roomId } = await context.params
    const body = await req.json()

    // Validate request body
    const { image } = approveImageSchema.parse(body)

    // Get project style to verify ownership
    const projectStyle = await prisma.projectStyle.findUnique({
      where: { projectId },
      select: { id: true, organizationId: true },
    })

    if (!projectStyle) {
      return NextResponse.json({ error: 'Project style not found' }, { status: 404 })
    }

    await verifyOrganizationAccess(projectStyle.organizationId, auth.organizationId)

    // Get room
    const room = await prisma.projectRoom.findUnique({
      where: {
        id: roomId,
        projectStyleId: projectStyle.id,
      },
    })

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    // Check if image with this ID already exists (prevent duplicates)
    const existingImages = (room.generatedImages as GeneratedImage[]) || []
    const alreadyExists = existingImages.some((img) => img.id === image.id)

    if (alreadyExists) {
      return NextResponse.json(
        { error: 'Image already saved', imageId: image.id },
        { status: 409 }
      )
    }

    // Add image to generatedImages array
    const updatedRoom = await prisma.projectRoom.update({
      where: { id: roomId },
      data: {
        generatedImages: [...existingImages, image],
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Image approved and saved',
      room: updatedRoom,
      savedImage: image,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request body', details: error.errors },
        { status: 400 }
      )
    }
    return handleError(error)
  }
})
