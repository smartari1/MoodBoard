/**
 * Organization Validation Schemas
 * Zod schemas for organization CRUD operations
 */

import { z } from 'zod'

/**
 * Brand Settings Schema
 */
export const brandSettingsSchema = z.object({
  logo: z.string().url().optional().nullable(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Primary color must be a valid hex color').default('#df2538'),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Secondary color must be a valid hex color').optional().nullable(),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Background color must be a valid hex color').default('#f7f7ed'),
})

export type BrandSettings = z.infer<typeof brandSettingsSchema>

/**
 * Feature Flags Schema
 */
export const featureFlagsSchema = z.object({
  aiAssist: z.boolean().default(false),
  advancedBudgeting: z.boolean().default(false),
})

export type FeatureFlags = z.infer<typeof featureFlagsSchema>

/**
 * Organization Settings Schema
 */
export const organizationSettingsSchema = z.object({
  locale: z.enum(['he', 'en', 'ar']).default('he'),
  currency: z.enum(['ILS', 'USD', 'EUR']).default('ILS'),
  units: z.enum(['metric', 'imperial']).default('metric'),
  brand: brandSettingsSchema.optional(),
  features: featureFlagsSchema.optional(),
})

export type OrganizationSettings = z.infer<typeof organizationSettingsSchema>

/**
 * Subscription Schema
 */
export const subscriptionSchema = z.object({
  plan: z.enum(['free', 'pro', 'enterprise']),
  validUntil: z.string().datetime(),
  seats: z.number().int().positive().default(1),
  stripeId: z.string().optional().nullable(),
})

export type Subscription = z.infer<typeof subscriptionSchema>

/**
 * Create Organization Schema
 */
export const createOrganizationSchema = z.object({
  name: z.string().min(1, 'שם הארגון הוא שדה חובה').max(200),
  slug: z.string()
    .min(1, 'Slug is required')
    .max(200)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens only'),
  settings: organizationSettingsSchema.optional(),
  subscription: subscriptionSchema.optional(),
})

export type CreateOrganization = z.infer<typeof createOrganizationSchema>

/**
 * Update Organization Schema (partial)
 */
export const updateOrganizationSchema = createOrganizationSchema.partial()

export type UpdateOrganization = z.infer<typeof updateOrganizationSchema>

