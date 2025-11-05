/**
 * Style Validation Schemas
 * Zod schemas for Style CRUD operations
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

// Style Metadata Schema
export const styleMetadataSchema = z.object({
  version: z.string().default('1.0.0'),
  isPublic: z.boolean().default(false),
  approvalStatus: z.enum(['pending', 'approved', 'rejected']).nullable().optional(),
  approvedBy: z.string().nullable().optional(),
  approvedAt: z.date().nullable().optional(),
  rejectionReason: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]),
  usage: z.number().int().default(0),
  rating: z.number().min(0).max(5).nullable().optional(),
})

// Create Style Schema (API - only accepts HTTPS URLs)
export const createStyleSchema = z.object({
  name: localizedStringSchema,
  categoryId: objectIdSchema,
  subCategoryId: objectIdSchema,
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Invalid slug format').optional(),
  colorId: objectIdSchema,
  images: serverImagesSchema.optional(),
  materialSet: materialSetSchema,
  roomProfiles: z.array(roomProfileApiSchema).optional().default([]),
  metadata: styleMetadataSchema.optional(),
})

// Update Style Schema (API - only accepts HTTPS URLs)
// Make all fields optional for partial updates, but keep the same validation rules
export const updateStyleSchema = z.object({
  name: localizedStringSchema.optional(),
  categoryId: objectIdSchema.optional(),
  subCategoryId: objectIdSchema.optional(),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Invalid slug format').optional(),
  colorId: objectIdSchema.optional(),
  images: serverImagesSchema.optional(),
  materialSet: materialSetSchema.optional(),
  roomProfiles: z.array(roomProfileApiSchema).optional(),
  metadata: styleMetadataSchema.partial().optional(),
})

// Create Style Schema for client forms (allows blob URLs for preview)
export const createStyleFormSchema = z.object({
  name: localizedStringSchema,
  categoryId: objectIdSchema,
  subCategoryId: objectIdSchema,
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Invalid slug format').optional(),
  colorId: objectIdSchema,
  images: clientImagesSchema.optional(),
  materialSet: materialSetSchema,
  roomProfiles: z.array(roomProfileSchema).optional().default([]),
  metadata: styleMetadataSchema.optional(),
})

// Style Filters Schema
export const styleFiltersSchema = z.object({
  search: z.string().optional(),
  categoryId: z.string().optional(),
  subCategoryId: z.string().optional(),
  scope: z.enum(['global', 'public', 'personal', 'all']).optional(),
  approvalStatus: z.enum(['pending', 'approved', 'rejected']).optional(),
  tags: z.array(z.string()).optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
})

// Approve/Reject Style Schema
export const approveStyleSchema = z.object({
  approved: z.boolean(),
  rejectionReason: z.string().optional(),
})

// Export types
export type MaterialDefault = z.infer<typeof materialDefaultSchema>
export type MaterialAlternative = z.infer<typeof materialAlternativeSchema>
export type MaterialSet = z.infer<typeof materialSetSchema>
export type RoomConstraint = z.infer<typeof roomConstraintSchema>
export type RoomProfile = z.infer<typeof roomProfileSchema>
export type LocalizedString = z.infer<typeof localizedStringSchema>
export type StyleMetadata = z.infer<typeof styleMetadataSchema>
export type CreateStyle = z.infer<typeof createStyleSchema>
export type UpdateStyle = z.infer<typeof updateStyleSchema>
export type StyleFilters = z.infer<typeof styleFiltersSchema>
export type ApproveStyle = z.infer<typeof approveStyleSchema>

