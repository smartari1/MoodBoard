/**
 * Material Validation Schemas
 * Zod schemas for Material CRUD operations
 */

import { z } from 'zod'
import { localizedStringSchema } from './style'

// Material Type Schema
export const materialTypeSchema = z.enum([
  'wood',
  'stone',
  'fabric',
  'metal',
  'glass',
  'ceramic',
  'composite',
])

// Pricing Unit Schema
export const pricingUnitSchema = z.enum(['sqm', 'unit', 'linear_m'])

// Dimension Unit Schema
export const dimensionUnitSchema = z.enum(['mm', 'cm', 'm'])

// Material Dimensions Schema
export const materialDimensionsSchema = z.object({
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  thickness: z.number().positive().optional(),
  unit: dimensionUnitSchema.default('mm'),
})

// Technical Specs Schema
export const technicalSpecsSchema = z.object({
  durability: z.number().int().min(1).max(10),
  maintenance: z.number().int().min(1).max(10),
  sustainability: z.number().int().min(1).max(10),
  fireRating: z.string().optional(),
  waterResistance: z.boolean().optional(),
})

// Material Properties Schema
export const materialPropertiesSchema = z.object({
  typeId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid material type ID format'),
  subType: z.string().min(1, 'Sub-type is required'),
  finish: z.array(z.string()).default([]),
  texture: z.string().min(1, 'Texture is required'),
  colorIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid color ID format')).min(1, 'At least one color is required'),
  dimensions: materialDimensionsSchema.optional(),
  technical: technicalSpecsSchema,
})

// Discount Tier Schema
export const discountTierSchema = z.object({
  minQuantity: z.number().int().min(1),
  discount: z.number().min(0).max(100), // Percentage
})

// Pricing Schema
export const pricingSchema = z.object({
  cost: z.number().nonnegative(),
  retail: z.number().nonnegative(),
  unit: pricingUnitSchema,
  currency: z.string().min(1, 'Currency is required'),
  bulkDiscounts: z.array(discountTierSchema).default([]),
})

// Availability Schema
export const availabilitySchema = z.object({
  inStock: z.boolean().default(false),
  leadTime: z.number().int().min(0), // days
  minOrder: z.number().nonnegative(),
  supplierId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid supplier ID format').optional(),
})

// Material Assets Schema
export const materialAssetsSchema = z.object({
  thumbnail: z.string().url().optional(),
  images: z.array(z.string().url()).default([]),
  texture: z.string().url().optional(),
  technicalSheet: z.string().url().optional(),
})

// Create Material Schema
export const createMaterialSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  name: localizedStringSchema,
  categoryId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid category ID format'),
  organizationId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid organization ID format').optional(),
  properties: materialPropertiesSchema,
  pricing: pricingSchema,
  availability: availabilitySchema,
  assets: materialAssetsSchema.optional(),
})

// Update Material Schema
export const updateMaterialSchema = createMaterialSchema.partial()

// Material Filters Schema
export const materialFiltersSchema = z.object({
  search: z.string().optional(),
  categoryId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  typeId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
})

// Export types
export type MaterialType = z.infer<typeof materialTypeSchema>
export type PricingUnit = z.infer<typeof pricingUnitSchema>
export type DimensionUnit = z.infer<typeof dimensionUnitSchema>
export type MaterialDimensions = z.infer<typeof materialDimensionsSchema>
export type TechnicalSpecs = z.infer<typeof technicalSpecsSchema>
export type MaterialProperties = z.infer<typeof materialPropertiesSchema>
export type DiscountTier = z.infer<typeof discountTierSchema>
export type Pricing = z.infer<typeof pricingSchema>
export type Availability = z.infer<typeof availabilitySchema>
export type MaterialAssets = z.infer<typeof materialAssetsSchema>
export type CreateMaterial = z.infer<typeof createMaterialSchema>
export type UpdateMaterial = z.infer<typeof updateMaterialSchema>
export type MaterialFilters = z.infer<typeof materialFiltersSchema>

