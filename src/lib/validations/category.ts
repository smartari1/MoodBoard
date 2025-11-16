/**
 * Category & SubCategory Validation Schemas
 * Zod schemas for category and sub-category CRUD operations
 */

import { z } from 'zod'
import { imagesSchema } from './upload'
import { detailedContentSchema, localizedDetailedContentSchema } from './approach'

// LocalizedString schema
const localizedStringSchema = z.object({
  he: z.string().min(1, 'Hebrew name is required'),
  en: z.string().min(1, 'English name is required'),
})

// Optional LocalizedString schema for descriptions
const optionalLocalizedStringSchema = z.object({
  he: z.string().optional(),
  en: z.string().optional(),
}).refine(
  (data) => {
    // If both are empty strings or undefined, allow it (means no description)
    if (!data) return true
    const he = data.he?.trim() || ''
    const en = data.en?.trim() || ''
    // Either both empty (no description) or at least one has content
    return !he && !en || he || en
  },
  { message: 'At least one description (Hebrew or English) is required if description is provided' }
).optional()

// Category schemas
export const createCategorySchema = z.object({
  name: localizedStringSchema,
  description: optionalLocalizedStringSchema,
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  order: z.number().int().min(0).default(0),
  images: imagesSchema.optional(),
  detailedContent: localizedDetailedContentSchema.optional(),
})

export const updateCategorySchema = createCategorySchema.partial()

export type CreateCategory = z.infer<typeof createCategorySchema>
export type UpdateCategory = z.infer<typeof updateCategorySchema>

// SubCategory schemas
export const createSubCategorySchema = z.object({
  categoryId: z.string().min(1, 'Category ID is required'),
  name: localizedStringSchema,
  description: optionalLocalizedStringSchema,
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  order: z.number().int().min(0).default(0),
  images: imagesSchema.optional(),
  detailedContent: localizedDetailedContentSchema.optional(),
})

export const updateSubCategorySchema = createSubCategorySchema.partial().omit({ categoryId: true })

export type CreateSubCategory = z.infer<typeof createSubCategorySchema>
export type UpdateSubCategory = z.infer<typeof updateSubCategorySchema>

