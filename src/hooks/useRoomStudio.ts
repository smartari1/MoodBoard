/**
 * Room Studio State Management Hook
 * Manages local state for the Room Generation Studio session
 *
 * This hook handles:
 * - Studio open/close state
 * - Category/SubCategory selection
 * - Ingredient selections (colors, textures, materials)
 * - Custom prompt management
 * - Generation state
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

// ============================================
// Types
// ============================================

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

export interface RoomStudioInitialState {
  roomId: string
  roomName?: string
  categoryId?: string | null
  subCategoryId?: string | null
  colorIds?: string[]
  textureIds?: string[]
  materialIds?: string[]
  customPrompt?: string
}

// ============================================
// Store Interface
// ============================================

interface RoomStudioState {
  // Studio state
  isOpen: boolean
  roomId: string | null
  roomName: string | null

  // Category/SubCategory selection
  selectedCategoryId: string | null
  selectedSubCategoryId: string | null

  // Ingredient selections (during session)
  selectedColorIds: string[]
  selectedTextureIds: string[]
  selectedMaterialIds: string[]

  // Custom prompt
  customPrompt: string

  // Generation state
  isGenerating: boolean
  generationProgress: number
  generationError: string | null

  // Actions - Studio control
  openStudio: (initialState: RoomStudioInitialState) => void
  closeStudio: () => void

  // Actions - Category
  setCategory: (categoryId: string | null) => void
  setSubCategory: (subCategoryId: string | null) => void

  // Actions - Ingredients
  toggleColor: (colorId: string) => void
  toggleTexture: (textureId: string) => void
  toggleMaterial: (materialId: string) => void
  setColors: (colorIds: string[]) => void
  setTextures: (textureIds: string[]) => void
  setMaterials: (materialIds: string[]) => void

  // Actions - Prompt
  setCustomPrompt: (prompt: string) => void

  // Actions - Generation
  setGenerating: (isGenerating: boolean) => void
  setProgress: (progress: number) => void
  setError: (error: string | null) => void

  // Actions - Utility
  resetSelections: () => void
  getSelections: () => {
    categoryId: string | null
    subCategoryId: string | null
    colorIds: string[]
    textureIds: string[]
    materialIds: string[]
    customPrompt: string
  }
}

// ============================================
// Store Implementation
// ============================================

const initialState = {
  isOpen: false,
  roomId: null,
  roomName: null,
  selectedCategoryId: null,
  selectedSubCategoryId: null,
  selectedColorIds: [],
  selectedTextureIds: [],
  selectedMaterialIds: [],
  customPrompt: '',
  isGenerating: false,
  generationProgress: 0,
  generationError: null,
}

export const useRoomStudioStore = create<RoomStudioState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // ===== Studio Control =====
      openStudio: (initialState) =>
        set({
          isOpen: true,
          roomId: initialState.roomId,
          roomName: initialState.roomName || null,
          selectedCategoryId: initialState.categoryId || null,
          selectedSubCategoryId: initialState.subCategoryId || null,
          selectedColorIds: initialState.colorIds || [],
          selectedTextureIds: initialState.textureIds || [],
          selectedMaterialIds: initialState.materialIds || [],
          customPrompt: initialState.customPrompt || '',
          isGenerating: false,
          generationProgress: 0,
          generationError: null,
        }),

      closeStudio: () =>
        set({
          ...initialState,
        }),

      // ===== Category Selection =====
      setCategory: (categoryId) =>
        set({
          selectedCategoryId: categoryId,
          // Reset subcategory when category changes
          selectedSubCategoryId: null,
        }),

      setSubCategory: (subCategoryId) =>
        set({
          selectedSubCategoryId: subCategoryId,
        }),

      // ===== Ingredient Toggles =====
      toggleColor: (colorId) =>
        set((state) => ({
          selectedColorIds: state.selectedColorIds.includes(colorId)
            ? state.selectedColorIds.filter((id) => id !== colorId)
            : [...state.selectedColorIds, colorId],
        })),

      toggleTexture: (textureId) =>
        set((state) => ({
          selectedTextureIds: state.selectedTextureIds.includes(textureId)
            ? state.selectedTextureIds.filter((id) => id !== textureId)
            : [...state.selectedTextureIds, textureId],
        })),

      toggleMaterial: (materialId) =>
        set((state) => ({
          selectedMaterialIds: state.selectedMaterialIds.includes(materialId)
            ? state.selectedMaterialIds.filter((id) => id !== materialId)
            : [...state.selectedMaterialIds, materialId],
        })),

      // ===== Batch Setters =====
      setColors: (colorIds) =>
        set({ selectedColorIds: colorIds }),

      setTextures: (textureIds) =>
        set({ selectedTextureIds: textureIds }),

      setMaterials: (materialIds) =>
        set({ selectedMaterialIds: materialIds }),

      // ===== Prompt =====
      setCustomPrompt: (prompt) =>
        set({ customPrompt: prompt }),

      // ===== Generation State =====
      setGenerating: (isGenerating) =>
        set({ isGenerating }),

      setProgress: (progress) =>
        set({ generationProgress: progress }),

      setError: (error) =>
        set({ generationError: error }),

      // ===== Utility =====
      resetSelections: () =>
        set({
          selectedColorIds: [],
          selectedTextureIds: [],
          selectedMaterialIds: [],
          customPrompt: '',
        }),

      getSelections: () => {
        const state = get()
        return {
          categoryId: state.selectedCategoryId,
          subCategoryId: state.selectedSubCategoryId,
          colorIds: state.selectedColorIds,
          textureIds: state.selectedTextureIds,
          materialIds: state.selectedMaterialIds,
          customPrompt: state.customPrompt,
        }
      },
    }),
    { name: 'room-studio-store' }
  )
)

// ============================================
// Convenience Hook
// ============================================

/**
 * Hook that combines store state with helper functions
 */
export function useRoomStudio() {
  const store = useRoomStudioStore()

  // Validation helpers
  const canGenerate = store.selectedColorIds.length > 0 && !store.isGenerating

  // Selected counts
  const selectedCounts = {
    colors: store.selectedColorIds.length,
    textures: store.selectedTextureIds.length,
    materials: store.selectedMaterialIds.length,
    total:
      store.selectedColorIds.length +
      store.selectedTextureIds.length +
      store.selectedMaterialIds.length,
  }

  return {
    ...store,
    canGenerate,
    selectedCounts,
  }
}

export default useRoomStudio
