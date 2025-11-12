import { handleError, withAdmin } from '@/lib/api/admin-middleware'
import { prisma } from '@/lib/db'
import { ValidationError } from '@/lib/errors'
import { createApproachSchema } from '@/lib/validations/approach'
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
  if (!materialSet) return { defaults: [], alternatives: [] }

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
  (profiles || []).map((profile) => ({
    roomType: profile.roomType,
    materials: (profile.materials || []).filter((id: string) => isValidObjectId(id)),
    images: sanitizeImages(profile.images),
    constraints: profile.constraints || null,
  }))

export const GET = withAdmin(async (req: NextRequest, auth, { params }: { params: { styleId: string } }) => {
  try {
    const { styleId } = params

    if (!isValidObjectId(styleId)) {
      throw new ValidationError('Invalid style ID')
    }

    const approaches = await prisma.approach.findMany({
      where: { styleId },
      orderBy: { order: 'asc' },
    })

    return NextResponse.json({ data: approaches })
  } catch (error) {
    return handleError(error)
  }
})

export const POST = withAdmin(async (req: NextRequest, auth, { params }: { params: { styleId: string } }) => {
  try {
    const { styleId } = params

    if (!isValidObjectId(styleId)) {
      throw new ValidationError('Invalid style ID')
    }

    const style = await prisma.style.findUnique({
      where: { id: styleId },
    })

    if (!style) {
      return NextResponse.json({ error: 'Style not found' }, { status: 404 })
    }

    const rawBody = await req.json()
    const parseResult = createApproachSchema.safeParse(rawBody)

    if (!parseResult.success) {
      throw new ValidationError('Invalid request data', parseResult.error.errors)
    }

    const body = parseResult.data

    const existingSlug = await prisma.approach.findFirst({
      where: {
        styleId,
        slug: body.slug,
      },
    })

    if (existingSlug) {
      return NextResponse.json({ error: 'Approach with this slug already exists' }, { status: 409 })
    }

    const approach = await prisma.approach.create({
      data: {
        styleId,
        slug: body.slug,
        name: body.name,
        order: body.order ?? 0,
        description: body.description,
        images: sanitizeImages(body.images as string[]),
        materialSet: sanitizeMaterialSet(body.materialSet),
        roomProfiles: sanitizeRoomProfiles(body.roomProfiles as any[]),
        metadata: {
          isDefault: body.metadata?.isDefault ?? false,
          version: body.metadata?.version ?? '1.0.0',
          tags: body.metadata?.tags ?? [],
          usage: body.metadata?.usage ?? 0,
        },
      },
    })

    return NextResponse.json(approach, { status: 201 })
  } catch (error) {
    return handleError(error)
  }
})

