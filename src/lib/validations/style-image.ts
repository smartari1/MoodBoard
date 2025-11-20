/**
 * StyleImage Validation Schemas
 * Phase 2: Categorized images for styles
 */

import { z } from 'zod'

// MongoDB ObjectID validation helper
const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectID format')

/**
 * Image categories enum
 */
export const IMAGE_CATEGORIES = [
  'ROOM_OVERVIEW',
  'ROOM_DETAIL',
  'MATERIAL',
  'TEXTURE',
  'COMPOSITE',
  'ANCHOR',
] as const

export type ImageCategory = (typeof IMAGE_CATEGORIES)[number]

/**
 * Create StyleImage Schema (API)
 */
export const createStyleImageSchema = z.object({
  styleId: objectIdSchema,
  url: z.string().url('Invalid image URL'),
  imageCategory: z.enum(IMAGE_CATEGORIES).default('ROOM_OVERVIEW'),
  displayOrder: z.number().int().min(0).default(0),
  description: z.string().max(500).optional(),
  tags: z.array(z.string()).default([]),
  roomType: z.string().max(50).optional(),
  textureId: objectIdSchema.optional(), // Link to Texture entity
})

export type CreateStyleImage = z.infer<typeof createStyleImageSchema>

/**
 * Update StyleImage Schema
 */
export const updateStyleImageSchema = z.object({
  url: z.string().url('Invalid image URL').optional(),
  imageCategory: z.enum(IMAGE_CATEGORIES).optional(),
  displayOrder: z.number().int().min(0).optional(),
  description: z.string().max(500).optional(),
  tags: z.array(z.string()).optional(),
  roomType: z.string().max(50).optional(),
  textureId: objectIdSchema.optional().nullable(),
})

export type UpdateStyleImage = z.infer<typeof updateStyleImageSchema>

/**
 * Bulk Create StyleImages Schema
 */
export const bulkCreateStyleImagesSchema = z.object({
  styleId: objectIdSchema,
  images: z.array(
    z.object({
      url: z.string().url('Invalid image URL'),
      imageCategory: z.enum(IMAGE_CATEGORIES),
      displayOrder: z.number().int().min(0).default(0),
      description: z.string().max(500).optional(),
      tags: z.array(z.string()).default([]),
      roomType: z.string().max(50).optional(),
      textureId: objectIdSchema.optional(),
    })
  ),
})

export type BulkCreateStyleImages = z.infer<typeof bulkCreateStyleImagesSchema>

/**
 * Filter StyleImages by category
 */
export const filterStyleImagesSchema = z.object({
  styleId: objectIdSchema,
  imageCategory: z.enum(IMAGE_CATEGORIES).optional(),
  roomType: z.string().optional(),
  limit: z.number().int().min(1).max(200).default(100),
  offset: z.number().int().min(0).default(0),
})

export type FilterStyleImages = z.infer<typeof filterStyleImagesSchema>
