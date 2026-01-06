/**
 * Studio Conversation Generate API
 * POST /api/studio/conversations/[id]/generate - Generate image for conversation
 *
 * This endpoint:
 * 1. Verifies user has enough credits (1 credit per generation)
 * 2. Deducts 1 credit before generation
 * 3. Generates an AI image using the conversation's studio state
 * 4. Updates the conversation with the generated image
 * 5. Refunds credit if generation fails
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth, handleError, requirePermission, verifyOrganizationAccess, AuthContext } from '@/lib/api/middleware'
import * as creditService from '@/lib/services/credit-service'
import { generateImages } from '@/lib/ai/image-generation-ai-sdk'
import { v4 as uuidv4 } from 'uuid'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

const CREDITS_PER_GENERATION = 1

interface RouteContext {
  params: Promise<{ id: string }>
}

interface StudioState {
  selectedColorIds: string[]
  selectedTextureIds: string[]
  selectedMaterialIds: string[]
  categoryId?: string | null
  subCategoryId?: string | null
  roomPart?: string | null
  attachedImageUrls: string[]
}

async function handler(req: NextRequest, auth: AuthContext, context?: RouteContext): Promise<NextResponse> {
  try {
    requirePermission(auth, 'project:write')

    if (!context) {
      return NextResponse.json({ error: 'Missing context' }, { status: 400 })
    }

    const { id } = await context.params

    // Get conversation with relations
    const conversation = await prisma.studioConversation.findUnique({
      where: { id },
      include: {
        room: true,
        projectStyle: true,
      },
    })

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    await verifyOrganizationAccess(conversation.projectStyle.organizationId, auth.organizationId)

    const studioState = conversation.studioState as unknown as StudioState
    const room = conversation.room
    const projectStyle = conversation.projectStyle

    // Check credit balance
    const hasEnoughCredits = await creditService.hasCredits(auth.organizationId, CREDITS_PER_GENERATION)
    if (!hasEnoughCredits) {
      return NextResponse.json(
        { error: 'Insufficient credits. Please purchase more credits to generate images.' },
        { status: 402 }
      )
    }

    // Update conversation status to generating
    await prisma.studioConversation.update({
      where: { id },
      data: { status: 'generating' },
    })

    // Deduct credits upfront
    await creditService.deductCredits({
      organizationId: auth.organizationId,
      userId: auth.userId,
      type: 'usage',
      amount: CREDITS_PER_GENERATION,
      description: `Studio generation: ${room.name || room.roomType}`,
      referenceId: id,
      referenceType: 'generation',
    })

    try {
      // Get base style if available
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

      // Get room type info
      const roomTypeRecord = room.roomTypeId
        ? await prisma.roomType.findUnique({
            where: { id: room.roomTypeId },
            select: { name: true },
          })
        : null

      // Get colors from studio state or fallback to project style
      const colorIds = studioState.selectedColorIds?.length
        ? studioState.selectedColorIds
        : projectStyle.colorIds

      const colors =
        colorIds.length > 0
          ? await prisma.color.findMany({
              where: { id: { in: colorIds } },
              select: { name: true, hex: true },
            })
          : []

      // Build generation context
      const styleName = baseStyle?.name?.en || 'Custom'
      const subCategoryName = baseStyle?.subCategory?.name?.en || styleName
      const approachName = baseStyle?.approach?.name?.en || 'Modern'
      const primaryColor = colors[0] || baseStyle?.color || { name: { en: 'Neutral' }, hex: '#888888' }
      const colorName = typeof primaryColor.name === 'object' ? (primaryColor.name as { en: string }).en : primaryColor.name
      const colorHex = primaryColor.hex

      // Determine room type name
      const roomTypeName = roomTypeRecord?.name?.en || room.name || room.roomType

      // Get the last user message as prompt
      const messages = (conversation.messages as Array<{ role: string; content: string }>) || []
      const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')
      const customPrompt = lastUserMessage?.content || ''

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

      if (!result.images || result.images.length === 0) {
        throw new Error('Image generation failed')
      }

      const generatedImageUrl = result.images[0]

      // Create generated image object for room
      const newImage = {
        id: uuidv4(),
        url: generatedImageUrl,
        prompt: customPrompt || `${roomTypeName} in ${styleName} style`,
        createdAt: new Date(),
      }

      // Update room with new image
      const existingImages = (room.generatedImages as Array<{ id: string; url: string }>) || []
      await prisma.projectRoom.update({
        where: { id: room.id },
        data: {
          generatedImages: [...existingImages, newImage],
          creditsUsed: room.creditsUsed + CREDITS_PER_GENERATION,
        },
      })

      // Add assistant message with generated image
      const assistantMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: 'הנה התוצאה שיצרתי עבורך:',
        createdAt: new Date().toISOString(),
        metadata: {
          generatedImageUrl,
        },
      }

      const updatedMessages = [...messages, assistantMessage]

      // Update conversation with result
      const updatedConversation = await prisma.studioConversation.update({
        where: { id },
        data: {
          messages: updatedMessages,
          generatedImageUrl,
          status: 'completed',
        },
      })

      // Get updated credit balance
      const balance = await creditService.getBalance(auth.organizationId)

      return NextResponse.json({
        success: true,
        conversation: updatedConversation,
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
        referenceId: id,
      })

      // Update conversation status to failed
      await prisma.studioConversation.update({
        where: { id },
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
}

/**
 * POST /api/studio/conversations/[id]/generate - Generate image for conversation
 */
export const POST = withAuth(handler)
