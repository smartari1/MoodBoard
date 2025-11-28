/**
 * Zod schemas for AI-generated content structures
 *
 * These schemas are used with Vercel AI SDK's generateObject
 * to ensure type-safe, validated responses from AI models.
 */

import { z } from 'zod'

/**
 * Bilingual text schema
 */
export const BilingualTextSchema = z.object({
  he: z.string().describe('Hebrew text (RTL)'),
  en: z.string().describe('English text'),
})

/**
 * Detailed content schema (for categories, subcategories, approaches, room types)
 */
export const DetailedContentSchema = z.object({
  introduction: z.string().optional().describe('Brief introduction (2-3 sentences)'),
  description: z.string().optional().describe('Full detailed description (5-8 sentences)'),
  period: z.string().optional().describe('Historical period if applicable'),
  characteristics: z.array(z.string()).optional().describe('Key characteristics (5 items)'),
  visualElements: z.array(z.string()).optional().describe('Visual elements (3-5 items)'),
  philosophy: z.string().optional().describe('Design philosophy'),
  colorGuidance: z.string().optional().describe('Color palette guidance'),
  materialGuidance: z.string().optional().describe('Material and texture guidance'),
  applications: z.array(z.string()).optional().describe('Typical applications'),
  historicalContext: z.string().optional().describe('Historical and cultural background'),
  culturalContext: z.string().optional().describe('Cultural influences and significance'),
  // Materials used in the style (for style generation)
  requiredMaterials: z.array(z.string()).optional().describe('Required materials for this style'),
})

/**
 * Localized detailed content schema
 */
export const LocalizedDetailedContentSchema = z.object({
  he: DetailedContentSchema.describe('Hebrew content'),
  en: DetailedContentSchema.describe('English content'),
})

/**
 * Poetic content schema (for style introductions)
 */
export const PoeticContentSchema = z.object({
  title: z.string().describe('Evocative title'),
  subtitle: z.string().describe('Poetic subtitle'),
  paragraph1: z.string().describe('Opening paragraph - sets the mood'),
  paragraph2: z.string().describe('Second paragraph - describes the aesthetic'),
  paragraph3: z.string().describe('Third paragraph - materials and textures'),
  paragraph4: z.string().describe('Closing paragraph - emotional impact'),
})

/**
 * Poetic intro response schema (bilingual)
 */
export const PoeticIntroResponseSchema = z.object({
  poeticIntro: z.object({
    he: PoeticContentSchema.describe('Hebrew poetic introduction'),
    en: PoeticContentSchema.describe('English poetic introduction'),
  }),
})

/**
 * Factual details response schema (bilingual)
 */
export const FactualDetailsResponseSchema = z.object({
  factualDetails: z.object({
    he: DetailedContentSchema.describe('Hebrew factual details'),
    en: DetailedContentSchema.describe('English factual details'),
  }),
})

/**
 * Color description schema
 */
export const ColorDescriptionSchema = z.object({
  he: z.string().describe('Hebrew color description (3-4 sentences)'),
  en: z.string().describe('English color description (3-4 sentences)'),
})

/**
 * Room profile schemas
 */
export const ColorPaletteSchema = z.object({
  primary: z.string().describe('Primary color hex'),
  secondary: z.array(z.string()).describe('Secondary colors'),
  accent: z.array(z.string()).describe('Accent colors'),
  description: BilingualTextSchema.describe('Palette description'),
})

export const MaterialItemSchema = z.object({
  name: BilingualTextSchema.describe('Material name'),
  application: BilingualTextSchema.describe('How the material is applied'),
  finish: z.string().describe('Material finish type'),
})

export const FurnitureItemSchema = z.object({
  item: BilingualTextSchema.describe('Furniture item name'),
  description: BilingualTextSchema.describe('Item description'),
  importance: z.enum(['essential', 'recommended', 'optional']).describe('Item importance level'),
})

export const LightingTypeSchema = z.object({
  type: BilingualTextSchema.describe('Lighting type'),
  description: BilingualTextSchema.describe('Lighting description'),
})

export const FunctionalZoneSchema = z.object({
  zone: BilingualTextSchema.describe('Zone name'),
  purpose: BilingualTextSchema.describe('Zone purpose'),
})

export const DecorativeElementSchema = z.object({
  element: BilingualTextSchema.describe('Element name'),
  role: BilingualTextSchema.describe('Element role in the design'),
})

export const DesignTipSchema = z.object({
  tip: BilingualTextSchema.describe('Design tip'),
})

export const RoomProfileContentSchema = z.object({
  roomProfile: z.object({
    description: BilingualTextSchema.describe('Room description in this style'),
    colorPalette: ColorPaletteSchema.describe('Recommended color palette'),
    materials: z.array(MaterialItemSchema).describe('Recommended materials (3-5 items)'),
    furnitureAndFixtures: z.array(FurnitureItemSchema).describe('Furniture recommendations (5-8 items)'),
    lighting: z.object({
      natural: BilingualTextSchema.describe('Natural lighting recommendations'),
      artificial: z.array(LightingTypeSchema).describe('Artificial lighting types (3-5 items)'),
    }),
    spatialConsiderations: z.object({
      layout: BilingualTextSchema.describe('Layout recommendations'),
      circulation: BilingualTextSchema.describe('Circulation and flow'),
      functionalZones: z.array(FunctionalZoneSchema).describe('Functional zones (2-4 items)'),
    }),
    decorativeElements: z.array(DecorativeElementSchema).describe('Decorative elements (3-5 items)'),
    designTips: z.array(DesignTipSchema).describe('Design tips (3-5 items)'),
  }),
})

/**
 * Category content response schema
 */
export const CategoryContentResponseSchema = LocalizedDetailedContentSchema

/**
 * Sub-category content response schema
 */
export const SubCategoryContentResponseSchema = LocalizedDetailedContentSchema

/**
 * Approach content response schema
 */
export const ApproachContentResponseSchema = LocalizedDetailedContentSchema

/**
 * Room type content response schema
 */
export const RoomTypeContentResponseSchema = LocalizedDetailedContentSchema

// Type exports
export type BilingualText = z.infer<typeof BilingualTextSchema>
export type DetailedContent = z.infer<typeof DetailedContentSchema>
export type LocalizedDetailedContent = z.infer<typeof LocalizedDetailedContentSchema>
export type PoeticContent = z.infer<typeof PoeticContentSchema>
export type PoeticIntroResponse = z.infer<typeof PoeticIntroResponseSchema>
export type FactualDetailsResponse = z.infer<typeof FactualDetailsResponseSchema>
export type ColorDescription = z.infer<typeof ColorDescriptionSchema>
export type RoomProfileContent = z.infer<typeof RoomProfileContentSchema>

/**
 * Entity type for AI content generation
 */
export type EntityType = 'category' | 'subcategory' | 'style' | 'approach' | 'roomType'
