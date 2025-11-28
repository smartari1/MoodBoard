/**
 * Material Validation Schemas
 * Zod schemas for Material CRUD operations
 *
 * Architecture:
 * - Material: Base entity with shared properties (name, category, properties, assets)
 * - MaterialSupplier: Per-supplier data (pricing, availability, colors)
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
// Note: min(0) allows empty/default values, max(10) for rating scale
// nullable() allows null values from database
export const technicalSpecsSchema = z.object({
  durability: z.number().int().min(0).max(10).default(0),
  maintenance: z.number().int().min(0).max(10).default(0),
  sustainability: z.number().int().min(0).max(10).default(0),
  fireRating: z.string().optional().nullable(),
  waterResistance: z.boolean().optional().nullable(),
})

// Material Properties Schema (shared across all suppliers)
// NOTE: colorIds moved to MaterialSupplier (per-supplier colors)
export const materialPropertiesSchema = z.object({
  typeId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid material type ID format'),
  subType: z.string().min(1, 'Sub-type is required'),
  finish: z.array(z.string()).default([]),
  texture: z.string().optional().default(''), // Free text texture description (optional - prefer textureId)
  dimensions: materialDimensionsSchema.optional().nullable(),
  technical: technicalSpecsSchema,
})

// Lenient properties schema for updates (allows partial data)
export const materialPropertiesUpdateSchema = z.object({
  typeId: z.string().optional(),
  subType: z.string().optional(),
  finish: z.array(z.string()).optional(),
  texture: z.string().optional(),
  dimensions: materialDimensionsSchema.optional().nullable(),
  technical: technicalSpecsSchema.partial().optional(),
})

// Discount Tier Schema
export const discountTierSchema = z.object({
  minQuantity: z.number().int().min(1),
  discount: z.number().min(0).max(100), // Percentage
})

// Supplier Pricing Schema (per-supplier)
export const supplierPricingSchema = z.object({
  cost: z.number().nonnegative().default(0),
  retail: z.number().nonnegative().default(0),
  unit: pricingUnitSchema.default('sqm'),
  currency: z.string().min(1, 'Currency is required').default('ILS'),
  bulkDiscounts: z.array(discountTierSchema).default([]),
})

// Supplier Availability Schema (per-supplier)
export const supplierAvailabilitySchema = z.object({
  inStock: z.boolean().default(false),
  leadTime: z.number().int().min(0).default(0), // days
  minOrder: z.number().nonnegative().default(0),
})

// Material Assets Schema (shared across all suppliers)
// nullable() allows null values from database
const assetUrlSchema = z.union([
  z.string().url(),
  z.string().startsWith('blob:'),
  z.literal(''),
]).optional().nullable()

export const materialAssetsSchema = z.object({
  thumbnail: assetUrlSchema,
  images: z.array(z.union([
    z.string().url(),
    z.string().startsWith('blob:'),
    z.literal(''),
  ])).default([]),
  texture: assetUrlSchema,
  technicalSheet: assetUrlSchema,
})

// Supplier Data Schema (full supplier details including pricing, availability, colors)
// organizationId can be empty on the form, but will be filtered before submission
export const supplierDataSchema = z.object({
  organizationId: z.string().min(1, 'Supplier organization is required'),
  supplierSku: z.string().optional(),
  // Colors available from this supplier (from system color palette)
  colorIds: z.array(z.string()).default([]),
  // Supplier-specific pricing
  pricing: supplierPricingSchema,
  // Supplier-specific availability
  availability: supplierAvailabilitySchema,
  // Metadata
  isPreferred: z.boolean().default(false),
  notes: z.string().optional(),
})

// Lenient supplier schema for form (allows empty organizationId during editing)
export const supplierDataFormSchema = z.object({
  organizationId: z.string(), // Can be empty during editing
  supplierSku: z.string().optional(),
  colorIds: z.array(z.string()).default([]),
  pricing: supplierPricingSchema,
  availability: supplierAvailabilitySchema,
  isPreferred: z.boolean().default(false),
  notes: z.string().optional(),
})

// Create Material Schema
// NOTE: pricing, availability, and colors are now per-supplier in the suppliers array
export const createMaterialSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  name: localizedStringSchema,
  categoryId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid category ID format'),
  textureId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid texture ID format').optional().nullable(),
  // Shared properties (same across all suppliers)
  properties: materialPropertiesSchema,
  // Shared assets (same images for all suppliers)
  assets: materialAssetsSchema.optional(),
  // Suppliers with their specific pricing, availability, and colors
  // Optional - materials without suppliers are considered global/generic
  suppliers: z.array(supplierDataSchema).optional().default([]),
})

// Update Material Schema - uses lenient supplier schema for form editing
// Empty suppliers (without organizationId) should be filtered before API submission
export const updateMaterialSchema = z.object({
  sku: z.string().min(1, 'SKU is required').optional(),
  name: localizedStringSchema.optional(),
  categoryId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid category ID format').optional(),
  textureId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid texture ID format').optional().nullable(),
  properties: materialPropertiesSchema.optional(),
  assets: materialAssetsSchema.optional(),
  // Use lenient form schema - empty suppliers will be filtered out
  suppliers: z.array(supplierDataFormSchema).optional(),
})

// Material Filters Schema
export const materialFiltersSchema = z.object({
  search: z.string().optional(),
  categoryId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  typeId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(200).default(20),
})

// Export types
export type MaterialType = z.infer<typeof materialTypeSchema>
export type PricingUnit = z.infer<typeof pricingUnitSchema>
export type DimensionUnit = z.infer<typeof dimensionUnitSchema>
export type MaterialDimensions = z.infer<typeof materialDimensionsSchema>
export type TechnicalSpecs = z.infer<typeof technicalSpecsSchema>
export type MaterialProperties = z.infer<typeof materialPropertiesSchema>
export type MaterialPropertiesUpdate = z.infer<typeof materialPropertiesUpdateSchema>
export type DiscountTier = z.infer<typeof discountTierSchema>
export type SupplierPricing = z.infer<typeof supplierPricingSchema>
export type SupplierAvailability = z.infer<typeof supplierAvailabilitySchema>
export type MaterialAssets = z.infer<typeof materialAssetsSchema>
export type SupplierData = z.infer<typeof supplierDataSchema>
export type SupplierDataForm = z.infer<typeof supplierDataFormSchema>
export type CreateMaterial = z.infer<typeof createMaterialSchema>
export type UpdateMaterial = z.infer<typeof updateMaterialSchema>
export type MaterialFilters = z.infer<typeof materialFiltersSchema>
