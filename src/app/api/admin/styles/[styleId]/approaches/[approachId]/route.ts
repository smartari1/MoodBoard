import { handleError, withAdmin } from '@/lib/api/admin-middleware'
import { prisma } from '@/lib/db'
import { ValidationError } from '@/lib/errors'
import { updateApproachSchema } from '@/lib/validations/approach'
import { NextRequest, NextResponse } from 'next/server'

const objectIdRegex = /^[0-9a-fA-F]{24}$/

const isValidObjectId = (value: unknown): value is string =>
  typeof value === 'string' && objectIdRegex.test(value)

const isValidHttpUrl = (url: string): boolean => {
  if (typeof url !== 'string') return false
  if (url.startsWith('blob:')) return false
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

const sanitizeImages = (images: string[] | undefined) =>
  (images || []).filter((url) => isValidHttpUrl(url))

const sanitizeMaterialSet = (materialSet: any) => {
  if (!materialSet) return undefined

  return {
    defaults: (materialSet.defaults || []).filter(
      (item: any) => isValidObjectId(item?.materialId)
    ),
    alternatives: (materialSet.alternatives || []).map((group: any) => ({
      usageArea: group?.usageArea,
      alternatives: (group?.alternatives || []).filter((id: string) => isValidObjectId(id)),
    })),
  }
}

const sanitizeRoomProfiles = (profiles: any[] | undefined) =>
  profiles
    ? profiles.map((profile) => ({
        roomType: profile.roomType,
        materials: (profile.materials || []).filter((id: string) => isValidObjectId(id)),
        images: sanitizeImages(profile.images),
        constraints: profile.constraints || null,
      }))
    : undefined

const validateIds = (styleId: string, approachId: string) => {
  if (!isValidObjectId(styleId)) {
    throw new ValidationError('Invalid style ID')
  }
  if (!isValidObjectId(approachId)) {
    throw new ValidationError('Invalid approach ID')
  }
}

export const GET = withAdmin(
  async (req: NextRequest, auth, { params }: { params: { styleId: string; approachId: string } }) => {
    try {
      const { styleId, approachId } = params
      validateIds(styleId, approachId)

      const approach = await prisma.approach.findFirst({
        where: { id: approachId, styleId },
      })

      if (!approach) {
        return NextResponse.json({ error: 'Approach not found' }, { status: 404 })
      }

      return NextResponse.json(approach)
    } catch (error) {
      return handleError(error)
    }
  }
)

export const PATCH = withAdmin(
  async (req: NextRequest, auth, { params }: { params: { styleId: string; approachId: string } }) => {
    try {
      const { styleId, approachId } = params
      validateIds(styleId, approachId)

      const approach = await prisma.approach.findFirst({
        where: { id: approachId, styleId },
      })

      if (!approach) {
        return NextResponse.json({ error: 'Approach not found' }, { status: 404 })
      }

      const rawBody = await req.json()
      const parseResult = updateApproachSchema.safeParse(rawBody)

      if (!parseResult.success) {
        throw new ValidationError('Invalid request data', parseResult.error.errors)
      }

      const body = parseResult.data

      if (body.slug) {
        const duplicateSlug = await prisma.approach.findFirst({
          where: {
            styleId,
            slug: body.slug,
            NOT: { id: approachId },
          },
        })

        if (duplicateSlug) {
          return NextResponse.json({ error: 'Approach with this slug already exists' }, { status: 409 })
        }
      }

      const updateData: any = {}

      if (body.slug !== undefined) updateData.slug = body.slug
      if (body.name) updateData.name = body.name
      if (body.order !== undefined) updateData.order = body.order
      if (body.description !== undefined) updateData.description = body.description
      if (body.images !== undefined) updateData.images = sanitizeImages(body.images as string[])

      if (body.materialSet !== undefined) {
        updateData.materialSet = sanitizeMaterialSet(body.materialSet)
      }

      if (body.roomProfiles !== undefined) {
        updateData.roomProfiles = sanitizeRoomProfiles(body.roomProfiles as any[])
      }

      if (body.metadata !== undefined) {
        updateData.metadata = {
          ...approach.metadata,
          ...body.metadata,
          tags: body.metadata?.tags ?? approach.metadata.tags ?? [],
          usage: body.metadata?.usage ?? approach.metadata.usage ?? 0,
        }
      }

      const updatedApproach = await prisma.approach.update({
        where: { id: approachId },
        data: updateData,
      })

      return NextResponse.json(updatedApproach)
    } catch (error) {
      return handleError(error)
    }
  }
)

export const DELETE = withAdmin(
  async (req: NextRequest, auth, { params }: { params: { styleId: string; approachId: string } }) => {
    try {
      const { styleId, approachId } = params
      validateIds(styleId, approachId)

      const approach = await prisma.approach.findFirst({
        where: { id: approachId, styleId },
      })

      if (!approach) {
        return NextResponse.json({ error: 'Approach not found' }, { status: 404 })
      }

      await prisma.approach.delete({
        where: { id: approachId },
      })

      return NextResponse.json({ success: true })
    } catch (error) {
      return handleError(error)
    }
  }
)

