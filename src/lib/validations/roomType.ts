/**
 * Room Type Validation Schemas
 * Handles CRUD validation for room types (Living Room, Bedroom, Kitchen, etc.)
 */

import { z } from 'zod'
import { clientImagesSchema, serverImagesSchema } from './upload'
import { detailedContentSchema, localizedDetailedContentSchema } from './approach'

// Localized String Schema
export const localizedStringSchema = z.object({
  he: z.string().min(1, 'Hebrew name is required'),
  en: z.string().min(1, 'English name is required'),
})

// Create Room Type Schema (API)
export const createRoomTypeSchema = z.object({
  name: localizedStringSchema,
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Invalid slug format'),
  description: localizedStringSchema.optional(),
  icon: z.string().optional(),
  order: z.number().int().min(0).default(0),
  detailedContent: localizedDetailedContentSchema.optional(),
})

// Update Room Type Schema (API)
export const updateRoomTypeSchema = z.object({
  name: localizedStringSchema.optional(),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Invalid slug format').optional(),
  description: localizedStringSchema.optional(),
  icon: z.string().optional(),
  order: z.number().int().min(0).optional(),
  detailedContent: localizedDetailedContentSchema.optional(),
})

// Client Form Schema
export const createRoomTypeFormSchema = createRoomTypeSchema
export const updateRoomTypeFormSchema = createRoomTypeFormSchema.partial()

// Types
export type CreateRoomType = z.infer<typeof createRoomTypeSchema>
export type UpdateRoomType = z.infer<typeof updateRoomTypeSchema>

