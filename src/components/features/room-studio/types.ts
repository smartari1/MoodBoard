/**
 * Room Studio Types
 * Shared type definitions for the Room Studio components
 */

export interface LocalizedString {
  he: string
  en: string
}

export interface ColorItem {
  id: string
  name: LocalizedString
  hex: string
  category?: string
}

export interface TextureItem {
  id: string
  name: LocalizedString
  imageUrl?: string
  thumbnailUrl?: string
}

export interface MaterialItem {
  id: string
  name: LocalizedString
  assets?: {
    thumbnail?: string
    images?: string[]
  }
}

export interface CategoryItem {
  id: string
  name: LocalizedString
  slug: string
}

export interface SubCategoryItem {
  id: string
  name: LocalizedString
  slug: string
  categoryId?: string
}

export interface GeneratedImage {
  id: string
  url: string
  prompt?: string
  createdAt: Date | string
  isForked?: boolean
}

export interface ProjectRoom {
  id: string
  projectStyleId: string
  roomType: string
  roomTypeId?: string | null
  name?: string | null
  overrideColorIds: string[]
  overrideTextureIds: string[]
  overrideMaterialIds: string[]
  customPrompt?: string | null
  generatedImages: GeneratedImage[]
  status: string
  isForked: boolean
  creditsUsed: number
  createdAt: Date | string
  updatedAt: Date | string
}

export type IngredientType = 'color' | 'texture' | 'material'

export interface IngredientSelections {
  colorIds: string[]
  textureIds: string[]
  materialIds: string[]
}
