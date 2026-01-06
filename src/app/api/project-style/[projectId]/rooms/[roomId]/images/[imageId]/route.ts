/**
 * Project Style Room Image API
 * DELETE /api/project-style/[projectId]/rooms/[roomId]/images/[imageId] - Delete single image
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth, handleError, requirePermission, verifyOrganizationAccess } from '@/lib/api/middleware'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ projectId: string; roomId: string; imageId: string }>
}

interface GeneratedImage {
  id: string
  url: string
  prompt?: string
  createdAt: string | Date
  isForked?: boolean
}

/**
 * DELETE /api/project-style/[projectId]/rooms/[roomId]/images/[imageId] - Delete single image
 */
export const DELETE = withAuth(async (req: NextRequest, auth, context: RouteContext) => {
  try {
    requirePermission(auth, 'project:write')

    const { projectId, roomId, imageId } = await context.params

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

    // Find and remove the image from generatedImages array
    const generatedImages = (room.generatedImages as GeneratedImage[]) || []
    const imageIndex = generatedImages.findIndex((img) => img.id === imageId)

    if (imageIndex === -1) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 })
    }

    // Get the image URL before removing (for potential R2 cleanup)
    const imageUrl = generatedImages[imageIndex].url

    // Remove image from array
    const updatedImages = [...generatedImages]
    updatedImages.splice(imageIndex, 1)

    // Update room with the new images array
    await prisma.projectRoom.update({
      where: { id: roomId },
      data: {
        generatedImages: updatedImages,
        updatedAt: new Date(),
      },
    })

    // TODO: Delete from R2 storage if URL is from our bucket
    // This would require parsing the URL and calling the storage service
    // For now, images remain in storage but are removed from the room

    return NextResponse.json({
      message: 'Image deleted successfully',
      deletedImageId: imageId,
    })
  } catch (error) {
    return handleError(error)
  }
})
