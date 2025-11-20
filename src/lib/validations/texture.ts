/**
 * Texture Validation Schemas
 * Phase 2: Texture entities for reusable textures
 */

import { z } from 'zod'
import { localizedStringSchema } from './approach'

// MongoDB ObjectID validation helper
const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectID format')

/**
 * Texture finish types
 */
export const TEXTURE_FINISHES = [
  'matte',
  'glossy',
  'satin',
  'rough',
  'smooth',
  'brushed',
  'polished',
  'natural',
  'lacquered',
  'oiled',
  'woven',
  'soft',
] as const

export type TextureFinish = (typeof TEXTURE_FINISHES)[number]

/**
 * Texture sheen levels
 */
export const TEXTURE_SHEENS = [
  'flat',
  'eggshell',
  'satin',
  'semi-gloss',
  'high-gloss',
] as const

export type TextureSheen = (typeof TEXTURE_SHEENS)[number]

/**
 * Create TextureCategory Schema
 */
export const createTextureCategorySchema = z.object({
  name: localizedStringSchema,
  description: localizedStringSchema.optional(),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Invalid slug format'),
  order: z.number().int().min(0).default(0),
  icon: z.string().max(100).optional(),
})

export type CreateTextureCategory = z.infer<typeof createTextureCategorySchema>

/**
 * Create TextureType Schema
 */
export const createTextureTypeSchema = z.object({
  name: localizedStringSchema,
  description: localizedStringSchema.optional(),
  categoryId: objectIdSchema,
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Invalid slug format'),
  order: z.number().int().min(0).default(0),
})

export type CreateTextureType = z.infer<typeof createTextureTypeSchema>

/**
 * Create Texture Schema
 */
export const createTextureSchema = z.object({
  organizationId: objectIdSchema.optional().nullable(), // Null for global textures
  name: localizedStringSchema,
  description: localizedStringSchema.optional(),
  categoryId: objectIdSchema,
  typeId: objectIdSchema.optional(),
  finish: z.string().max(50), // Use string to allow custom finishes
  sheen: z.string().max(50).optional(),
  baseColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid HEX color').optional(),
  isAbstract: z.boolean().default(false),
  aiDescription: z.string().max(500).optional(),
  imageUrl: z.string().url().optional(),
  thumbnailUrl: z.string().url().optional(),
  tags: z.array(z.string()).default([]),
})

export type CreateTexture = z.infer<typeof createTextureSchema>

/**
 * Update Texture Schema
 */
export const updateTextureSchema = z.object({
  name: localizedStringSchema.optional(),
  description: localizedStringSchema.optional(),
  categoryId: objectIdSchema.optional(),
  typeId: objectIdSchema.optional().nullable(),
  finish: z.string().max(50).optional(),
  sheen: z.string().max(50).optional().nullable(),
  baseColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid HEX color').optional().nullable(),
  isAbstract: z.boolean().optional(),
  aiDescription: z.string().max(500).optional(),
  imageUrl: z.string().url().optional(),
  thumbnailUrl: z.string().url().optional(),
  tags: z.array(z.string()).optional(),
  usage: z.number().int().min(0).optional(), // Admin can manually adjust usage count
})

export type UpdateTexture = z.infer<typeof updateTextureSchema>

/**
 * Find or Create Texture Schema
 * Used during AI generation to check if texture already exists
 */
export const findOrCreateTextureSchema = z.object({
  organizationId: objectIdSchema.optional().nullable(),
  name: localizedStringSchema,
  finish: z.string().max(50),
  categorySlug: z.string(), // To find category
  typeSlug: z.string().optional(), // To find type
  imageUrl: z.string().url(),
  description: localizedStringSchema.optional(),
  baseColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  aiDescription: z.string().max(500).optional(),
})

export type FindOrCreateTexture = z.infer<typeof findOrCreateTextureSchema>

/**
 * Filter Textures Schema
 */
export const filterTexturesSchema = z.object({
  organizationId: objectIdSchema.optional(),
  categoryId: objectIdSchema.optional(),
  typeId: objectIdSchema.optional(),
  finish: z.string().optional(),
  search: z.string().optional(), // Search in name (he/en)
  includeGlobal: z.boolean().default(true), // Include global textures (organizationId=null)
  sortBy: z.enum(['usage', 'name', 'createdAt']).default('usage'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
})

export type FilterTextures = z.infer<typeof filterTexturesSchema>

/**
 * Link Texture to Style Schema
 */
export const linkTextureToStyleSchema = z.object({
  styleId: objectIdSchema,
  textureId: objectIdSchema,
})

export type LinkTextureToStyle = z.infer<typeof linkTextureToStyleSchema>
