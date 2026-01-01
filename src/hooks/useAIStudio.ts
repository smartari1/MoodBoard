/**
 * AI Studio State Management Hook
 * Manages the state for the AI Style Studio page
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { Category, SubCategory } from './useCategories'
import type { Color } from './useColors'
import type { Texture } from './useTextures'
import type { Material } from './useMaterials'

// Room specification types
export interface RoomDimensions {
  width: number // meters
  length: number
  height: number
}

export interface WindowSpec {
  count: number
  position: 'north' | 'south' | 'east' | 'west' | 'multiple'
  size: 'small' | 'medium' | 'large' | 'floor-to-ceiling'
}

export interface FurnitureZone {
  id: string
  type: 'seating' | 'dining' | 'sleeping' | 'work' | 'storage'
  position: 'center' | 'corner' | 'wall' | 'window'
}

export interface RoomSpecification {
  roomTypeId: string | null
  roomTypeName?: { he: string; en: string }
  dimensions: RoomDimensions
  windows: WindowSpec
  furnitureZones: FurnitureZone[]
  specialFeatures: string[]
}

// Highlight area for image annotation
export interface HighlightArea {
  id: string
  type: 'rectangle'
  label: 'wall' | 'floor' | 'ceiling' | 'furniture' | 'window'
  points: { x: number; y: number }[]
}

// Generation input - what we send to the API
export interface GenerationInput {
  categoryId: string | null
  subCategoryId: string | null
  colorIds: string[]
  textureIds: string[]
  materialIds: string[]
  roomSpec: RoomSpecification
  highlightAreas: HighlightArea[]
  customPrompt: string
  sourceStyleId?: string // If starting from an existing style
}

// Selected items with full data for display
export interface SelectedItems {
  category: Category | null
  subCategory: SubCategory | null
  colors: Color[]
  textures: Texture[]
  materials: Material[]
}

// AI Studio state
interface AIStudioState {
  // Current step (for potential wizard mode)
  currentStep: 'ingredients' | 'room' | 'highlight' | 'preview'

  // Generation input
  input: GenerationInput

  // Selected items (full objects for display)
  selectedItems: SelectedItems

  // UI state
  isGenerating: boolean
  generationProgress: number
  generationError: string | null

  // Preview image (base style or generated)
  previewImageUrl: string | null

  // Actions - Categories
  setCategory: (category: Category | null) => void
  setSubCategory: (subCategory: SubCategory | null) => void

  // Actions - Design elements
  addColor: (color: Color) => void
  removeColor: (colorId: string) => void
  addTexture: (texture: Texture) => void
  removeTexture: (textureId: string) => void
  addMaterial: (material: Material) => void
  removeMaterial: (materialId: string) => void

  // Actions - Room specification
  setRoomType: (roomTypeId: string, roomTypeName: { he: string; en: string }) => void
  setDimensions: (dimensions: Partial<RoomDimensions>) => void
  setWindows: (windows: Partial<WindowSpec>) => void
  addFurnitureZone: (zone: Omit<FurnitureZone, 'id'>) => void
  removeFurnitureZone: (zoneId: string) => void
  toggleSpecialFeature: (feature: string) => void

  // Actions - Highlight areas
  setHighlightAreas: (areas: HighlightArea[]) => void
  addHighlightArea: (area: HighlightArea) => void
  removeHighlightArea: (areaId: string) => void

  // Actions - Custom prompt
  setCustomPrompt: (prompt: string) => void

  // Actions - Navigation
  setStep: (step: AIStudioState['currentStep']) => void

  // Actions - Generation
  setGenerating: (isGenerating: boolean) => void
  setProgress: (progress: number) => void
  setError: (error: string | null) => void
  setPreviewImage: (url: string | null) => void

  // Actions - Source style
  setSourceStyle: (styleId: string) => void

  // Actions - Reset
  reset: () => void

  // Utility - Check if can generate
  canGenerate: () => boolean

  // Get summary for preview
  getSummary: () => {
    categoryName: string | null
    subCategoryName: string | null
    colorCount: number
    textureCount: number
    materialCount: number
    roomType: string | null
    hasCustomPrompt: boolean
  }
}

// Initial state
const initialInput: GenerationInput = {
  categoryId: null,
  subCategoryId: null,
  colorIds: [],
  textureIds: [],
  materialIds: [],
  roomSpec: {
    roomTypeId: null,
    dimensions: { width: 4, length: 5, height: 2.7 },
    windows: { count: 1, position: 'south', size: 'medium' },
    furnitureZones: [],
    specialFeatures: [],
  },
  highlightAreas: [],
  customPrompt: '',
}

const initialSelectedItems: SelectedItems = {
  category: null,
  subCategory: null,
  colors: [],
  textures: [],
  materials: [],
}

// Create the store
export const useAIStudioStore = create<AIStudioState>()(
  devtools(
    (set, get) => ({
      // Initial state
      currentStep: 'ingredients',
      input: initialInput,
      selectedItems: initialSelectedItems,
      isGenerating: false,
      generationProgress: 0,
      generationError: null,
      previewImageUrl: null,

      // Category actions
      setCategory: (category) =>
        set((state) => ({
          input: {
            ...state.input,
            categoryId: category?.id || null,
            subCategoryId: null, // Reset sub-category when category changes
          },
          selectedItems: {
            ...state.selectedItems,
            category,
            subCategory: null,
          },
        })),

      setSubCategory: (subCategory) =>
        set((state) => ({
          input: {
            ...state.input,
            subCategoryId: subCategory?.id || null,
          },
          selectedItems: {
            ...state.selectedItems,
            subCategory,
          },
        })),

      // Color actions
      addColor: (color) =>
        set((state) => ({
          input: {
            ...state.input,
            colorIds: [...state.input.colorIds, color.id],
          },
          selectedItems: {
            ...state.selectedItems,
            colors: [...state.selectedItems.colors, color],
          },
        })),

      removeColor: (colorId) =>
        set((state) => ({
          input: {
            ...state.input,
            colorIds: state.input.colorIds.filter((id) => id !== colorId),
          },
          selectedItems: {
            ...state.selectedItems,
            colors: state.selectedItems.colors.filter((c) => c.id !== colorId),
          },
        })),

      // Texture actions
      addTexture: (texture) =>
        set((state) => ({
          input: {
            ...state.input,
            textureIds: [...state.input.textureIds, texture.id],
          },
          selectedItems: {
            ...state.selectedItems,
            textures: [...state.selectedItems.textures, texture],
          },
        })),

      removeTexture: (textureId) =>
        set((state) => ({
          input: {
            ...state.input,
            textureIds: state.input.textureIds.filter((id) => id !== textureId),
          },
          selectedItems: {
            ...state.selectedItems,
            textures: state.selectedItems.textures.filter((t) => t.id !== textureId),
          },
        })),

      // Material actions
      addMaterial: (material) =>
        set((state) => ({
          input: {
            ...state.input,
            materialIds: [...state.input.materialIds, material.id],
          },
          selectedItems: {
            ...state.selectedItems,
            materials: [...state.selectedItems.materials, material],
          },
        })),

      removeMaterial: (materialId) =>
        set((state) => ({
          input: {
            ...state.input,
            materialIds: state.input.materialIds.filter((id) => id !== materialId),
          },
          selectedItems: {
            ...state.selectedItems,
            materials: state.selectedItems.materials.filter((m) => m.id !== materialId),
          },
        })),

      // Room specification actions
      setRoomType: (roomTypeId, roomTypeName) =>
        set((state) => ({
          input: {
            ...state.input,
            roomSpec: {
              ...state.input.roomSpec,
              roomTypeId,
              roomTypeName,
            },
          },
        })),

      setDimensions: (dimensions) =>
        set((state) => ({
          input: {
            ...state.input,
            roomSpec: {
              ...state.input.roomSpec,
              dimensions: { ...state.input.roomSpec.dimensions, ...dimensions },
            },
          },
        })),

      setWindows: (windows) =>
        set((state) => ({
          input: {
            ...state.input,
            roomSpec: {
              ...state.input.roomSpec,
              windows: { ...state.input.roomSpec.windows, ...windows },
            },
          },
        })),

      addFurnitureZone: (zone) =>
        set((state) => ({
          input: {
            ...state.input,
            roomSpec: {
              ...state.input.roomSpec,
              furnitureZones: [
                ...state.input.roomSpec.furnitureZones,
                { ...zone, id: crypto.randomUUID() },
              ],
            },
          },
        })),

      removeFurnitureZone: (zoneId) =>
        set((state) => ({
          input: {
            ...state.input,
            roomSpec: {
              ...state.input.roomSpec,
              furnitureZones: state.input.roomSpec.furnitureZones.filter(
                (z) => z.id !== zoneId
              ),
            },
          },
        })),

      toggleSpecialFeature: (feature) =>
        set((state) => {
          const features = state.input.roomSpec.specialFeatures
          const hasFeature = features.includes(feature)
          return {
            input: {
              ...state.input,
              roomSpec: {
                ...state.input.roomSpec,
                specialFeatures: hasFeature
                  ? features.filter((f) => f !== feature)
                  : [...features, feature],
              },
            },
          }
        }),

      // Highlight area actions
      setHighlightAreas: (areas) =>
        set((state) => ({
          input: { ...state.input, highlightAreas: areas },
        })),

      addHighlightArea: (area) =>
        set((state) => ({
          input: {
            ...state.input,
            highlightAreas: [...state.input.highlightAreas, area],
          },
        })),

      removeHighlightArea: (areaId) =>
        set((state) => ({
          input: {
            ...state.input,
            highlightAreas: state.input.highlightAreas.filter((a) => a.id !== areaId),
          },
        })),

      // Custom prompt
      setCustomPrompt: (prompt) =>
        set((state) => ({
          input: { ...state.input, customPrompt: prompt },
        })),

      // Navigation
      setStep: (step) => set({ currentStep: step }),

      // Generation state
      setGenerating: (isGenerating) => set({ isGenerating }),
      setProgress: (progress) => set({ generationProgress: progress }),
      setError: (error) => set({ generationError: error }),
      setPreviewImage: (url) => set({ previewImageUrl: url }),

      // Source style
      setSourceStyle: (styleId) =>
        set((state) => ({
          input: { ...state.input, sourceStyleId: styleId },
        })),

      // Reset
      reset: () =>
        set({
          currentStep: 'ingredients',
          input: initialInput,
          selectedItems: initialSelectedItems,
          isGenerating: false,
          generationProgress: 0,
          generationError: null,
          previewImageUrl: null,
        }),

      // Can generate check
      canGenerate: () => {
        const state = get()
        return (
          state.input.categoryId !== null &&
          state.input.subCategoryId !== null &&
          state.input.colorIds.length > 0 &&
          state.input.roomSpec.roomTypeId !== null &&
          !state.isGenerating
        )
      },

      // Get summary
      getSummary: () => {
        const state = get()
        const locale = typeof window !== 'undefined'
          ? window.location.pathname.split('/')[1] || 'he'
          : 'he'

        return {
          categoryName: state.selectedItems.category?.name[locale as 'he' | 'en'] || null,
          subCategoryName: state.selectedItems.subCategory?.name[locale as 'he' | 'en'] || null,
          colorCount: state.selectedItems.colors.length,
          textureCount: state.selectedItems.textures.length,
          materialCount: state.selectedItems.materials.length,
          roomType: state.input.roomSpec.roomTypeName?.[locale as 'he' | 'en'] || null,
          hasCustomPrompt: state.input.customPrompt.length > 0,
        }
      },
    }),
    { name: 'ai-studio-store' }
  )
)

// Convenience hook for using the store
export function useAIStudio() {
  return useAIStudioStore()
}
