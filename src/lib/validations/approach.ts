/**
 * Approach Validation Schemas
 * Handles CRUD validation for style approaches
 */

import { z } from 'zod'
import { ROOM_TYPES } from './room'
import { clientImagesSchema, serverImagesSchema } from './upload'

// MongoDB ObjectID validation helper
const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectID format')

// Material Default Schema (General materials - apply to all rooms)
// Only stores materialId - material details come from the referenced Material object
export const materialDefaultSchema = z.object({
  materialId: objectIdSchema,
})

// Material Alternative Schema
export const materialAlternativeSchema = z.object({
  usageArea: z.string().min(1, 'Usage area is required'),
  alternatives: z.array(objectIdSchema).min(1, 'At least one alternative is required'),
})

// Material Set Schema
// defaults: General materials that apply to all rooms
// Room-specific materials go in roomProfiles[].materials
export const materialSetSchema = z.object({
  defaults: z.array(materialDefaultSchema).optional().default([]),
  alternatives: z.array(materialAlternativeSchema).optional(),
})

// Room Constraint Schema
export const roomConstraintSchema = z.object({
  waterResistance: z.boolean().optional(),
  durability: z.number().int().min(1).max(10).optional(),
  maintenance: z.number().int().min(1).max(10).optional(),
})

// Room Profile Schema (for client-side forms - allows blob URLs for preview)
export const roomProfileSchema = z.object({
  roomType: z.enum(ROOM_TYPES, {
    errorMap: () => ({ message: 'Invalid room type' }),
  }),
  materials: z.array(objectIdSchema).optional().default([]),
  images: clientImagesSchema.optional(),
  constraints: roomConstraintSchema.nullable().optional(),
})

// Room Profile Schema for API (server-side - only HTTPS URLs)
export const roomProfileApiSchema = z.object({
  roomType: z.enum(ROOM_TYPES, {
    errorMap: () => ({ message: 'Invalid room type' }),
  }),
  materials: z.array(objectIdSchema).optional().default([]),
  images: serverImagesSchema.optional(),
  constraints: roomConstraintSchema.nullable().optional(),
})

// Localized String Schema
export const localizedStringSchema = z.object({
  he: z.string().min(1, 'Hebrew name is required'),
  en: z.string().min(1, 'English name is required'),
})

// Approach Metadata Schema
export const approachMetadataSchema = z.object({
  isDefault: z.boolean().default(false),
  version: z.string().default('1.0.0'),
  tags: z.array(z.string()).default([]),
  usage: z.number().int().default(0),
})

// Create Approach Schema (API - only accepts HTTPS URLs)
export const createApproachSchema = z.object({
  name: localizedStringSchema,
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Invalid slug format'),
  order: z.number().int().min(0).default(0),
  description: localizedStringSchema.optional(),
  images: serverImagesSchema.optional(),
  materialSet: materialSetSchema.optional(),
  roomProfiles: z.array(roomProfileApiSchema).optional().default([]),
  metadata: approachMetadataSchema.optional(),
})

// Update Approach Schema (API)
export const updateApproachSchema = z.object({
  name: localizedStringSchema.optional(),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Invalid slug format').optional(),
  order: z.number().int().min(0).optional(),
  description: localizedStringSchema.optional(),
  images: serverImagesSchema.optional(),
  materialSet: materialSetSchema.optional(),
  roomProfiles: z.array(roomProfileApiSchema).optional(),
  metadata: approachMetadataSchema.partial().optional(),
})

// Client Form Schema (allows blob URLs for preview images)
export const createApproachFormSchema = z.object({
  name: localizedStringSchema,
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Invalid slug format'),
  order: z.number().int().min(0).default(0),
  description: localizedStringSchema.optional(),
  images: clientImagesSchema.optional(),
  materialSet: materialSetSchema.optional(),
  roomProfiles: z.array(roomProfileSchema).optional().default([]),
  metadata: approachMetadataSchema.optional(),
})

export const updateApproachFormSchema = createApproachFormSchema.partial()

// Types
export type MaterialDefault = z.infer<typeof materialDefaultSchema>
export type MaterialAlternative = z.infer<typeof materialAlternativeSchema>
export type MaterialSet = z.infer<typeof materialSetSchema>
export type RoomConstraint = z.infer<typeof roomConstraintSchema>
export type RoomProfile = z.infer<typeof roomProfileSchema>
export type ApproachMetadata = z.infer<typeof approachMetadataSchema>
export type CreateApproach = z.infer<typeof createApproachSchema>
export type UpdateApproach = z.infer<typeof updateApproachSchema>

