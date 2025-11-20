import { z } from 'zod'
import { clientImagesSchema, serverImagesSchema } from './upload'
import { localizedStringSchema } from './approach'

// MongoDB ObjectID validation helper
const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectID format')

// Room Color Palette Schema (matches Prisma RoomColorPalette)
export const roomColorPaletteSchema = z.object({
  primaryId: objectIdSchema.optional(), // Optional for backward compatibility with old data
  secondaryIds: z.array(objectIdSchema).default([]),
  accentIds: z.array(objectIdSchema).default([]),
  description: localizedStringSchema.optional(),
})

// Room Material Schema (matches Prisma RoomMaterial)
export const roomMaterialSchema = z.object({
  materialId: objectIdSchema,
  application: localizedStringSchema.optional(),
  finish: z.string().optional(),
})

// Room Furniture Schema (matches Prisma RoomFurniture)
export const roomFurnitureSchema = z.object({
  item: localizedStringSchema,
  description: localizedStringSchema.optional(),
  importance: z.enum(['essential', 'recommended', 'optional']),
})

// Room Lighting Schema (matches Prisma RoomLighting)
export const roomLightingSchema = z.object({
  naturalLight: localizedStringSchema.optional(),
  artificialLight: localizedStringSchema.optional(),
  fixtures: z.array(localizedStringSchema).optional(),
})

// Room Spatial Considerations Schema (matches Prisma RoomSpatialConsiderations)
export const roomSpatialConsiderationsSchema = z.object({
  minimumSize: z.string().optional(),
  idealSize: z.string().optional(),
  layoutTips: z.array(localizedStringSchema).optional(),
})

// Room Decorative Element Schema (matches Prisma RoomDecorativeElement)
export const roomDecorativeElementSchema = z.object({
  element: localizedStringSchema,
  placement: localizedStringSchema.optional(),
  purpose: localizedStringSchema.optional(),
})

// Room Design Tip Schema (matches Prisma RoomDesignTip)
export const roomDesignTipSchema = z.object({
  tip: localizedStringSchema,
  category: z.enum(['layout', 'color', 'lighting', 'furniture', 'decoration', 'general']).optional(),
})

const roomViewSchema = z.object({
  id: z.string().optional(),
  url: z.string().optional().nullable(),
  orientation: z.string(),
  prompt: z.string().optional().nullable(),
  status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']).optional(),
  createdAt: z.date().optional()
})

// Room Profile Schema (for client-side forms - allows blob URLs for preview)
// Matches Prisma RoomProfile type
export const roomProfileSchema = z.object({
  roomTypeId: objectIdSchema,
  description: localizedStringSchema.optional(),
  colorPalette: roomColorPaletteSchema.optional(),
  materials: z.array(roomMaterialSchema).optional().default([]),
  furnitureAndFixtures: z.array(roomFurnitureSchema).optional().default([]),
  lighting: roomLightingSchema.nullable().optional(),
  spatialConsiderations: roomSpatialConsiderationsSchema.nullable().optional(),
  decorativeElements: z.array(roomDecorativeElementSchema).optional().default([]),
  designTips: z.array(roomDesignTipSchema).optional().default([]),
  images: clientImagesSchema.optional().default([]),
  views: z.array(roomViewSchema).optional().default([]),
})

// Room Profile Schema for API (server-side - only HTTPS URLs)
export const roomProfileApiSchema = z.object({
  roomTypeId: objectIdSchema,
  description: localizedStringSchema.optional(),
  colorPalette: roomColorPaletteSchema.optional(),
  materials: z.array(roomMaterialSchema).optional().default([]),
  furnitureAndFixtures: z.array(roomFurnitureSchema).optional().default([]),
  lighting: roomLightingSchema.nullable().optional(),
  spatialConsiderations: roomSpatialConsiderationsSchema.nullable().optional(),
  decorativeElements: z.array(roomDecorativeElementSchema).optional().default([]),
  designTips: z.array(roomDesignTipSchema).optional().default([]),
  images: serverImagesSchema.optional().default([]),
  views: z.array(roomViewSchema).optional().default([]),
})

// AI Selection Schema (for tracking AI-generated style decisions)
export const aiSelectionSchema = z.object({
  approachConfidence: z.number().min(0).max(1), // AI confidence score (0.0-1.0)
  reasoning: localizedStringSchema, // Why this approach/color was chosen
})

const styleGalleryItemSchema = z.object({
  id: z.string().optional(),
  url: z.string(),
  type: z.string(),
  sceneName: z.string().optional().nullable(),
  complementaryColor: z.string().optional().nullable(),
  linkedAssetId: objectIdSchema.optional().nullable(),
  prompt: z.string().optional().nullable(),
  createdAt: z.date().optional()
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

  // AI Generation tracking
  aiGenerated: z.boolean().default(false).optional(),
  aiSelection: aiSelectionSchema.nullable().optional(),
  isComplete: z.boolean().optional(),
})

// Create Style Schema (API - only accepts HTTPS URLs)
export const createStyleSchema = z.object({
  name: localizedStringSchema,
  description: localizedStringSchema.optional(),
  categoryId: objectIdSchema,
  subCategoryId: objectIdSchema,
  approachId: objectIdSchema,
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Invalid slug format').optional(),
  colorId: objectIdSchema,
  images: serverImagesSchema.optional(),
  gallery: z.array(styleGalleryItemSchema).optional(),
  priceTier: z.enum(['AFFORDABLE', 'LUXURY']).optional(),
  // Phase 2: Category & Price Level
  roomCategory: z.string().optional(),
  priceLevel: z.enum(['REGULAR', 'LUXURY']).default('REGULAR'),
  compositeImageUrl: z.string().url().optional(),
  anchorImageUrl: z.string().url().optional(),
  roomProfiles: z.array(roomProfileApiSchema).optional().default([]),
  metadata: styleMetadataSchema.optional(),
})

// Update Style Schema (API - only accepts HTTPS URLs)
export const updateStyleSchema = z.object({
  name: localizedStringSchema.optional(),
  description: localizedStringSchema.optional(),
  categoryId: objectIdSchema.optional(),
  subCategoryId: objectIdSchema.optional(),
  approachId: objectIdSchema.optional(),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Invalid slug format').optional(),
  colorId: objectIdSchema.optional(),
  images: serverImagesSchema.optional(),
  gallery: z.array(styleGalleryItemSchema).optional(),
  priceTier: z.enum(['AFFORDABLE', 'LUXURY']).optional(),
  // Phase 2: Category & Price Level
  roomCategory: z.string().optional(),
  priceLevel: z.enum(['REGULAR', 'LUXURY']).optional(),
  compositeImageUrl: z.string().url().optional(),
  anchorImageUrl: z.string().url().optional(),
  roomProfiles: z.array(roomProfileApiSchema).optional(),
  metadata: styleMetadataSchema.partial().optional(),
})

// Create Style Schema for client forms (allows blob URLs for preview)
export const createStyleFormSchema = z.object({
  name: localizedStringSchema,
  description: localizedStringSchema.optional(),
  categoryId: objectIdSchema,
  subCategoryId: objectIdSchema,
  approachId: objectIdSchema,
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Invalid slug format').optional(),
  colorId: objectIdSchema,
  images: clientImagesSchema.optional(),
  gallery: z.array(styleGalleryItemSchema).optional(),
  priceTier: z.enum(['AFFORDABLE', 'LUXURY']).optional(),
  // Phase 2: Category & Price Level
  roomCategory: z.string().optional(),
  priceLevel: z.enum(['REGULAR', 'LUXURY']).default('REGULAR'),
  compositeImageUrl: z.string().optional(), // Can be blob URL for preview
  anchorImageUrl: z.string().optional(), // Can be blob URL for preview
  roomProfiles: z.array(roomProfileSchema).optional().default([]),
  metadata: styleMetadataSchema.optional(),
})

// Style Filters Schema
export const styleFiltersSchema = z.object({
  search: z.string().optional(),
  categoryId: z.string().optional(),
  subCategoryId: z.string().optional(),
  approachId: z.string().optional(),
  colorId: z.string().optional(),
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
export type AISelection = z.infer<typeof aiSelectionSchema>
export type RoomColorPalette = z.infer<typeof roomColorPaletteSchema>
export type RoomMaterial = z.infer<typeof roomMaterialSchema>
export type RoomFurniture = z.infer<typeof roomFurnitureSchema>
export type RoomLighting = z.infer<typeof roomLightingSchema>
export type RoomSpatialConsiderations = z.infer<typeof roomSpatialConsiderationsSchema>
export type RoomDecorativeElement = z.infer<typeof roomDecorativeElementSchema>
export type RoomDesignTip = z.infer<typeof roomDesignTipSchema>
export type RoomProfile = z.infer<typeof roomProfileSchema>
export type CreateStyle = z.infer<typeof createStyleSchema>
export type UpdateStyle = z.infer<typeof updateStyleSchema>
export type StyleFilters = z.infer<typeof styleFiltersSchema>
export type ApproveStyle = z.infer<typeof approveStyleSchema>

export { localizedStringSchema } from './approach'

