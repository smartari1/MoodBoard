/**
 * Project Room Image Generation API
 * POST /api/project-style/[projectId]/rooms/[roomId]/generate - Generate room image
 *
 * This endpoint:
 * 1. Verifies user has enough credits (1 credit per generation)
 * 2. Deducts 1 credit before generation
 * 3. Generates an AI image using the room's style context
 * 4. Updates the room with the generated image
 * 5. Refunds credit if generation fails
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth, handleError, requirePermission, validateRequest, verifyOrganizationAccess } from '@/lib/api/middleware'
import { generateRoomSchema } from '@/lib/validations/project-style'
import * as creditService from '@/lib/services/credit-service'
import { generateImages } from '@/lib/ai/image-generation-ai-sdk'
import { v4 as uuidv4 } from 'uuid'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

const CREDITS_PER_GENERATION = 1

interface RouteContext {
  params: Promise<{ projectId: string; roomId: string }>
}

/**
 * POST /api/project-style/[projectId]/rooms/[roomId]/generate - Generate room image
 */
export const POST = withAuth(async (req: NextRequest, auth, context: RouteContext) => {
  try {
    requirePermission(auth, 'project:write')

    const { projectId, roomId } = await context.params
    const body = await validateRequest(req, generateRoomSchema)

    // Get project style
    const projectStyle = await prisma.projectStyle.findUnique({
      where: { projectId },
    })

    if (!projectStyle) {
      return NextResponse.json({ error: 'Project style not found' }, { status: 404 })
    }

    // Get base style if available (baseStyleIds is an array)
    const baseStyleId = projectStyle.baseStyleIds?.[0]
    const baseStyle = baseStyleId
      ? await prisma.style.findUnique({
          where: { id: baseStyleId },
          select: {
            id: true,
            name: true,
            slug: true,
            category: { select: { name: true } },
            subCategory: { select: { name: true } },
            approach: { select: { name: true } },
            color: { select: { name: true, hex: true } },
          },
        })
      : null

    await verifyOrganizationAccess(projectStyle.organizationId, auth.organizationId)

    // Get the room
    const room = await prisma.projectRoom.findUnique({
      where: {
        id: roomId,
        projectStyleId: projectStyle.id,
      },
    })

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    // Check credit balance
    const hasEnoughCredits = await creditService.hasCredits(auth.organizationId, CREDITS_PER_GENERATION)
    if (!hasEnoughCredits) {
      return NextResponse.json(
        { error: 'Insufficient credits. Please purchase more credits to generate images.' },
        { status: 402 }
      )
    }

    // Deduct credits upfront
    await creditService.deductCredits({
      organizationId: auth.organizationId,
      userId: auth.userId,
      type: 'usage',
      amount: CREDITS_PER_GENERATION,
      description: `Room image generation: ${room.name || room.roomType}`,
      referenceId: roomId,
      referenceType: 'generation',
    })

    // Update room status to generating
    await prisma.projectRoom.update({
      where: { id: roomId },
      data: { status: 'generating' },
    })

    try {
      // Get colors for the style
      const colorIds = body.overrideColorIds?.length
        ? body.overrideColorIds
        : room.overrideColorIds.length
        ? room.overrideColorIds
        : projectStyle.colorIds

      const colors = colorIds.length > 0
        ? await prisma.color.findMany({
            where: { id: { in: colorIds } },
            select: { name: true, hex: true },
          })
        : []

      // Get room type info
      const roomType = room.roomTypeId
        ? await prisma.roomType.findUnique({
            where: { id: room.roomTypeId },
            select: { name: true },
          })
        : null

      // Build generation context
      const styleName = baseStyle?.name?.en || 'Custom'
      const subCategoryName = baseStyle?.subCategory?.name?.en || styleName
      const approachName = baseStyle?.approach?.name?.en || 'Modern'
      const primaryColor = colors[0] || baseStyle?.color || { name: { en: 'Neutral' }, hex: '#888888' }
      const colorName = typeof primaryColor.name === 'object' ? primaryColor.name.en : primaryColor.name
      const colorHex = primaryColor.hex

      // Determine room type name
      const roomTypeName = roomType?.name?.en || room.name || room.roomType

      // Generate image
      const result = await generateImages({
        entityType: 'style-room',
        entityName: {
          he: room.name || room.roomType,
          en: room.name || room.roomType,
        },
        numberOfImages: 1,
        styleContext: {
          subCategoryName,
          approachName,
          colorName,
          colorHex,
        },
        roomContext: {
          roomTypeName,
          styleName,
          colorHex,
        },
        variationType: 'main',
      })

      if (!result.success || result.images.length === 0) {
        throw new Error(result.error || 'Image generation failed')
      }

      // Create generated image object
      const newImage = {
        id: uuidv4(),
        url: result.images[0],
        prompt: body.customPrompt || `${roomTypeName} in ${styleName} style`,
        createdAt: new Date(),
      }

      // Update room with new image
      const existingImages = (room.generatedImages as any[]) || []
      const updatedRoom = await prisma.projectRoom.update({
        where: { id: roomId },
        data: {
          generatedImages: [...existingImages, newImage],
          status: 'completed',
          creditsUsed: room.creditsUsed + CREDITS_PER_GENERATION,
        },
      })

      // Get updated credit balance
      const balance = await creditService.getBalance(auth.organizationId)

      return NextResponse.json({
        success: true,
        room: updatedRoom,
        generatedImage: newImage,
        creditsUsed: CREDITS_PER_GENERATION,
        creditsRemaining: balance.balance,
      })
    } catch (generationError) {
      console.error('Generation failed, refunding credit:', generationError)

      // Refund credit on failure
      await creditService.refundCredits({
        organizationId: auth.organizationId,
        userId: auth.userId,
        type: 'refund',
        amount: CREDITS_PER_GENERATION,
        description: `Refund for failed generation: ${room.name || room.roomType}`,
        referenceId: roomId,
      })

      // Update room status to failed
      await prisma.projectRoom.update({
        where: { id: roomId },
        data: { status: 'failed' },
      })

      return NextResponse.json(
        {
          error: 'Image generation failed. Credit has been refunded.',
          details: generationError instanceof Error ? generationError.message : 'Unknown error',
        },
        { status: 500 }
      )
    }
  } catch (error) {
    return handleError(error)
  }
})
