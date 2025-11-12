import { z } from 'zod'
import { clientImagesSchema, serverImagesSchema } from './upload'
import { localizedStringSchema } from './approach'

// MongoDB ObjectID validation helper
const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectID format')

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
  metadata: styleMetadataSchema.optional(),
})

// Update Style Schema (API - only accepts HTTPS URLs)
export const updateStyleSchema = z.object({
  name: localizedStringSchema.optional(),
  categoryId: objectIdSchema.optional(),
  subCategoryId: objectIdSchema.optional(),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Invalid slug format').optional(),
  colorId: objectIdSchema.optional(),
  images: serverImagesSchema.optional(),
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
export type CreateStyle = z.infer<typeof createStyleSchema>
export type UpdateStyle = z.infer<typeof updateStyleSchema>
export type StyleFilters = z.infer<typeof styleFiltersSchema>
export type ApproveStyle = z.infer<typeof approveStyleSchema>

export { localizedStringSchema } from './approach'

