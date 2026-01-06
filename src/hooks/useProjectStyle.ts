/**
 * Project Style State Management Hook
 * Manages the state for Project Custom Style Pages
 *
 * Architecture:
 * - Zustand: Local UI state (modals, selected elements)
 * - React Query: Server state (style data, mutations)
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'

// ============================================
// Types
// ============================================

export interface LocalizedString {
  he: string
  en: string
}

export interface RoomDimensions {
  width?: number
  length?: number
  height?: number
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
  roomTypeId?: string
  name?: string
  dimensions?: RoomDimensions
  overrideColorIds: string[]
  overrideTextureIds: string[]
  overrideMaterialIds: string[]
  customPrompt?: string
  generatedImages: GeneratedImage[]
  status: 'pending' | 'generating' | 'completed' | 'failed'
  isForked: boolean
  forkedFromView?: string
  creditsUsed: number
  createdAt: Date | string
  updatedAt: Date | string
}

export interface BaseStyle {
  id: string
  name: LocalizedString
  slug: string
  images?: Array<{ id: string; url: string; imageCategory?: string }>
  category?: { id: string; name: LocalizedString; slug: string }
  subCategory?: { id: string; name: LocalizedString; slug: string }
}

export interface ProjectStyle {
  id: string
  projectId: string
  organizationId: string
  baseStyleIds: string[]  // Multiple base styles
  categoryId?: string
  subCategoryId?: string
  colorIds: string[]
  textureIds: string[]
  materialIds: string[]
  customPrompt?: string
  createdAt: Date | string
  updatedAt: Date | string
  createdBy: string
  // Populated fields
  baseStyles?: BaseStyle[]  // Multiple base styles (populated)
  rooms: ProjectRoom[]
  project?: {
    id: string
    name: string
    client?: {
      id: string
      name: string
    }
  }
  // Fetched entities (current selections)
  colors?: Array<{
    id: string
    name: LocalizedString
    hex: string
    category?: string
  }>
  textures?: Array<{
    id: string
    name: LocalizedString
    imageUrl?: string
    thumbnailUrl?: string
  }>
  materials?: Array<{
    id: string
    name: LocalizedString
    assets?: {
      thumbnail?: string
      images?: string[]
    }
  }>
  // Available from base styles (for studio)
  availableTextures?: Array<{
    id: string
    name: LocalizedString
    imageUrl?: string
    thumbnailUrl?: string
  }>
  availableMaterials?: Array<{
    id: string
    name: LocalizedString
    assets?: {
      thumbnail?: string
      images?: string[]
    }
  }>
}

export interface ProjectStyleResponse {
  exists: boolean
  projectId: string
  project?: {
    id: string
    name: string
  }
  // Full ProjectStyle fields if exists
  id?: string
  baseStyleIds?: string[]
  colorIds?: string[]
  textureIds?: string[]
  materialIds?: string[]
  rooms?: ProjectRoom[]
  colors?: ProjectStyle['colors']
  textures?: ProjectStyle['textures']
  materials?: ProjectStyle['materials']
  baseStyles?: ProjectStyle['baseStyles']
  availableTextures?: ProjectStyle['availableTextures']
  availableMaterials?: ProjectStyle['availableMaterials']
}

export type ModalType = 'none' | 'selectStyle' | 'addBaseStyle' | 'addColor' | 'addTexture' | 'addMaterial' | 'generateRoom' | 'addRoom' | 'roomStudio'

// ============================================
// Zustand Store - Local UI State
// ============================================

interface ProjectStyleUIState {
  // Modal states
  activeModal: ModalType
  modalData: Record<string, unknown>

  // Selection states
  selectedRoomId: string | null
  selectedElementId: string | null

  // Actions
  openModal: (modal: ModalType, data?: Record<string, unknown>) => void
  closeModal: () => void
  selectRoom: (roomId: string | null) => void
  selectElement: (elementId: string | null) => void
  reset: () => void
}

export const useProjectStyleUIStore = create<ProjectStyleUIState>()(
  devtools(
    (set) => ({
      activeModal: 'none',
      modalData: {},
      selectedRoomId: null,
      selectedElementId: null,

      openModal: (modal, data = {}) => set({ activeModal: modal, modalData: data }),
      closeModal: () => set({ activeModal: 'none', modalData: {} }),
      selectRoom: (roomId) => set({ selectedRoomId: roomId }),
      selectElement: (elementId) => set({ selectedElementId: elementId }),
      reset: () => set({
        activeModal: 'none',
        modalData: {},
        selectedRoomId: null,
        selectedElementId: null,
      }),
    }),
    { name: 'project-style-ui-store' }
  )
)

// ============================================
// API Functions
// ============================================

const PROJECT_STYLE_KEY = 'project-style'

async function fetchProjectStyle(projectId: string): Promise<ProjectStyleResponse> {
  const response = await fetch(`/api/project-style/${projectId}`)
  if (!response.ok) {
    throw new Error('Failed to fetch project style')
  }
  return response.json()
}

async function createProjectStyle(
  projectId: string,
  data: {
    baseStyleIds?: string[]
    categoryId?: string
    subCategoryId?: string
    colorIds?: string[]
    textureIds?: string[]
    materialIds?: string[]
  }
): Promise<ProjectStyle> {
  const response = await fetch(`/api/project-style/${projectId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create project style')
  }
  return response.json()
}

async function updateProjectStyle(
  projectId: string,
  data: Partial<{
    baseStyleIds: string[]
    categoryId: string | null
    subCategoryId: string | null
    colorIds: string[]
    textureIds: string[]
    materialIds: string[]
    customPrompt: string | null
  }>
): Promise<ProjectStyle> {
  const response = await fetch(`/api/project-style/${projectId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update project style')
  }
  return response.json()
}

async function addBaseStyle(projectId: string, styleId: string): Promise<ProjectStyle> {
  const response = await fetch(`/api/project-style/${projectId}/base-styles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ styleId }),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to add base style')
  }
  return response.json()
}

async function removeBaseStyle(projectId: string, styleId: string): Promise<ProjectStyle> {
  const response = await fetch(`/api/project-style/${projectId}/base-styles`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ styleId }),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to remove base style')
  }
  return response.json()
}

async function forkFromStyle(
  projectId: string,
  sourceStyleId: string
): Promise<ProjectStyle & { forkedRoomsCount: number; message: string }> {
  const response = await fetch(`/api/project-style/${projectId}/fork`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourceStyleId }),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fork style')
  }
  return response.json()
}

async function deleteProjectStyle(projectId: string): Promise<void> {
  const response = await fetch(`/api/project-style/${projectId}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to delete project style')
  }
}

async function addRoom(
  projectId: string,
  data: {
    roomType: string
    roomTypeId?: string
    name?: string
    dimensions?: RoomDimensions
    customPrompt?: string
  }
): Promise<ProjectRoom> {
  const response = await fetch(`/api/project-style/${projectId}/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to add room')
  }
  return response.json()
}

async function updateRoom(
  projectId: string,
  roomId: string,
  data: Partial<ProjectRoom>
): Promise<ProjectRoom> {
  const response = await fetch(`/api/project-style/${projectId}/rooms/${roomId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update room')
  }
  return response.json()
}

async function deleteRoom(projectId: string, roomId: string): Promise<void> {
  const response = await fetch(`/api/project-style/${projectId}/rooms/${roomId}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to delete room')
  }
}

async function generateRoomImage(
  projectId: string,
  roomId: string,
  data?: {
    customPrompt?: string
    overrideColorIds?: string[]
    overrideTextureIds?: string[]
    overrideMaterialIds?: string[]
    preview?: boolean  // Preview mode - returns image without saving to DB
  }
): Promise<{
  success: boolean
  preview?: boolean
  room?: ProjectRoom
  generatedImage?: GeneratedImage
  previewImage?: GeneratedImage  // Returned when preview: true
  creditsUsed: number
  creditsRemaining: number
}> {
  const response = await fetch(`/api/project-style/${projectId}/rooms/${roomId}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data || {}),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to generate room image')
  }
  return response.json()
}

async function deleteRoomImage(
  projectId: string,
  roomId: string,
  imageId: string
): Promise<{ message: string; deletedImageId: string }> {
  const response = await fetch(
    `/api/project-style/${projectId}/rooms/${roomId}/images/${imageId}`,
    { method: 'DELETE' }
  )
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to delete image')
  }
  return response.json()
}

async function approvePreviewImage(
  projectId: string,
  roomId: string,
  image: GeneratedImage
): Promise<{ success: boolean; savedImage: GeneratedImage }> {
  const response = await fetch(
    `/api/project-style/${projectId}/rooms/${roomId}/images/approve`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image }),
    }
  )
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to approve image')
  }
  return response.json()
}

// ============================================
// React Query Hooks
// ============================================

/**
 * Hook to fetch project style
 */
export function useProjectStyle(projectId: string) {
  const { data: session } = useSession()

  return useQuery({
    queryKey: [PROJECT_STYLE_KEY, projectId],
    queryFn: () => fetchProjectStyle(projectId),
    enabled: !!session && !!projectId,
  })
}

/**
 * Hook to create project style
 */
export function useCreateProjectStyle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, data }: {
      projectId: string
      data: Parameters<typeof createProjectStyle>[1]
    }) => createProjectStyle(projectId, data),
    onSuccess: (_, { projectId }) => {
      // Invalidate to refetch full data including populated colors/textures/materials
      queryClient.invalidateQueries({ queryKey: [PROJECT_STYLE_KEY, projectId] })
    },
  })
}

/**
 * Hook to update project style
 */
export function useUpdateProjectStyle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, data }: {
      projectId: string
      data: Parameters<typeof updateProjectStyle>[1]
    }) => updateProjectStyle(projectId, data),
    onSuccess: (_, { projectId }) => {
      // Invalidate to refetch full data including populated colors/textures/materials
      queryClient.invalidateQueries({ queryKey: [PROJECT_STYLE_KEY, projectId] })
    },
  })
}

/**
 * Hook to fork from existing style
 */
export function useForkFromStyle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, sourceStyleId }: {
      projectId: string
      sourceStyleId: string
    }) => forkFromStyle(projectId, sourceStyleId),
    onSuccess: (_, { projectId }) => {
      // Invalidate to refetch full data including populated colors/textures/materials
      queryClient.invalidateQueries({ queryKey: [PROJECT_STYLE_KEY, projectId] })
    },
  })
}

/**
 * Hook to add base style
 */
export function useAddBaseStyle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, styleId }: {
      projectId: string
      styleId: string
    }) => addBaseStyle(projectId, styleId),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: [PROJECT_STYLE_KEY, projectId] })
    },
  })
}

/**
 * Hook to remove base style
 */
export function useRemoveBaseStyle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, styleId }: {
      projectId: string
      styleId: string
    }) => removeBaseStyle(projectId, styleId),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: [PROJECT_STYLE_KEY, projectId] })
    },
  })
}

/**
 * Hook to delete project style
 */
export function useDeleteProjectStyle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteProjectStyle,
    onSuccess: (_, projectId) => {
      queryClient.setQueryData([PROJECT_STYLE_KEY, projectId], {
        exists: false,
        projectId,
      })
    },
  })
}

/**
 * Hook to add room
 */
export function useAddRoom() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, data }: {
      projectId: string
      data: Parameters<typeof addRoom>[1]
    }) => addRoom(projectId, data),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: [PROJECT_STYLE_KEY, projectId] })
    },
  })
}

/**
 * Hook to update room
 */
export function useUpdateRoom() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, roomId, data }: {
      projectId: string
      roomId: string
      data: Partial<ProjectRoom>
    }) => updateRoom(projectId, roomId, data),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: [PROJECT_STYLE_KEY, projectId] })
    },
  })
}

/**
 * Hook to delete room
 */
export function useDeleteRoom() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, roomId }: {
      projectId: string
      roomId: string
    }) => deleteRoom(projectId, roomId),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: [PROJECT_STYLE_KEY, projectId] })
    },
  })
}

/**
 * Hook to generate room image
 */
export function useGenerateRoomImage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, roomId, data }: {
      projectId: string
      roomId: string
      data?: Parameters<typeof generateRoomImage>[2]
    }) => generateRoomImage(projectId, roomId, data),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: [PROJECT_STYLE_KEY, projectId] })
      // Also invalidate credits query
      queryClient.invalidateQueries({ queryKey: ['credits'] })
    },
  })
}

/**
 * Hook to delete room image
 */
export function useDeleteRoomImage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, roomId, imageId }: {
      projectId: string
      roomId: string
      imageId: string
    }) => deleteRoomImage(projectId, roomId, imageId),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: [PROJECT_STYLE_KEY, projectId] })
    },
  })
}

/**
 * Hook to approve a preview image (save it to room.generatedImages)
 */
export function useApprovePreviewImage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, roomId, image }: {
      projectId: string
      roomId: string
      image: GeneratedImage
    }) => approvePreviewImage(projectId, roomId, image),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: [PROJECT_STYLE_KEY, projectId] })
    },
  })
}

// ============================================
// Combined Hook
// ============================================

/**
 * Combined hook for project style with UI state and all mutations
 */
export function useProjectStyleWithUI(projectId: string) {
  const { data, isLoading, error, refetch } = useProjectStyle(projectId)
  const uiState = useProjectStyleUIStore()

  const createMutation = useCreateProjectStyle()
  const updateMutation = useUpdateProjectStyle()
  const forkMutation = useForkFromStyle()
  const addBaseStyleMutation = useAddBaseStyle()
  const removeBaseStyleMutation = useRemoveBaseStyle()
  const deleteMutation = useDeleteProjectStyle()
  const addRoomMutation = useAddRoom()
  const updateRoomMutation = useUpdateRoom()
  const deleteRoomMutation = useDeleteRoom()
  const generateMutation = useGenerateRoomImage()
  const deleteRoomImageMutation = useDeleteRoomImage()
  const approvePreviewImageMutation = useApprovePreviewImage()

  // Get selected room
  const selectedRoom = data?.rooms?.find(r => r.id === uiState.selectedRoomId) || null

  // Check if style exists
  const styleExists = data?.exists ?? false

  return {
    // Data
    data,
    styleExists,
    style: styleExists ? data : null,
    rooms: data?.rooms || [],
    selectedRoom,
    colors: data?.colors || [],
    textures: data?.textures || [],
    materials: data?.materials || [],
    // Multi-style support
    baseStyles: data?.baseStyles || [],
    baseStyleIds: data?.baseStyleIds || [],
    // Available from base styles (for studio)
    availableTextures: data?.availableTextures || [],
    availableMaterials: data?.availableMaterials || [],
    project: data?.project,

    // Loading states
    isLoading,
    error,

    // UI state
    ...uiState,

    // Mutations - Create/Fork
    createStyle: (styleData: Parameters<typeof createProjectStyle>[1]) =>
      createMutation.mutateAsync({ projectId, data: styleData }),
    forkStyle: (sourceStyleId: string) =>
      forkMutation.mutateAsync({ projectId, sourceStyleId }),
    deleteStyle: () => deleteMutation.mutateAsync(projectId),

    // Mutations - Base styles
    addBaseStyle: (styleId: string) =>
      addBaseStyleMutation.mutateAsync({ projectId, styleId }),
    removeBaseStyle: (styleId: string) =>
      removeBaseStyleMutation.mutateAsync({ projectId, styleId }),

    // Mutations - Update style
    updateStyle: (styleData: Parameters<typeof updateProjectStyle>[1]) =>
      updateMutation.mutateAsync({ projectId, data: styleData }),
    addColor: (colorId: string) => {
      const currentColors = data?.colorIds || []
      if (!currentColors.includes(colorId)) {
        return updateMutation.mutateAsync({
          projectId,
          data: { colorIds: [...currentColors, colorId] },
        })
      }
      return Promise.resolve()
    },
    removeColor: (colorId: string) => {
      const currentColors = data?.colorIds || []
      return updateMutation.mutateAsync({
        projectId,
        data: { colorIds: currentColors.filter(id => id !== colorId) },
      })
    },
    addTexture: (textureId: string) => {
      const currentTextures = data?.textureIds || []
      if (!currentTextures.includes(textureId)) {
        return updateMutation.mutateAsync({
          projectId,
          data: { textureIds: [...currentTextures, textureId] },
        })
      }
      return Promise.resolve()
    },
    removeTexture: (textureId: string) => {
      const currentTextures = data?.textureIds || []
      return updateMutation.mutateAsync({
        projectId,
        data: { textureIds: currentTextures.filter(id => id !== textureId) },
      })
    },
    addMaterial: (materialId: string) => {
      const currentMaterials = data?.materialIds || []
      if (!currentMaterials.includes(materialId)) {
        return updateMutation.mutateAsync({
          projectId,
          data: { materialIds: [...currentMaterials, materialId] },
        })
      }
      return Promise.resolve()
    },
    removeMaterial: (materialId: string) => {
      const currentMaterials = data?.materialIds || []
      return updateMutation.mutateAsync({
        projectId,
        data: { materialIds: currentMaterials.filter(id => id !== materialId) },
      })
    },

    // Mutations - Rooms
    addRoom: (roomData: Parameters<typeof addRoom>[1]) =>
      addRoomMutation.mutateAsync({ projectId, data: roomData }),
    updateRoom: (roomId: string, roomData: Partial<ProjectRoom>) =>
      updateRoomMutation.mutateAsync({ projectId, roomId, data: roomData }),
    deleteRoom: (roomId: string) =>
      deleteRoomMutation.mutateAsync({ projectId, roomId }),
    generateRoomImage: (roomId: string, options?: Parameters<typeof generateRoomImage>[2]) =>
      generateMutation.mutateAsync({ projectId, roomId, data: options }),
    deleteRoomImage: (roomId: string, imageId: string) =>
      deleteRoomImageMutation.mutateAsync({ projectId, roomId, imageId }),
    approvePreviewImage: (roomId: string, image: GeneratedImage) =>
      approvePreviewImageMutation.mutateAsync({ projectId, roomId, image }),

    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isForking: forkMutation.isPending,
    isAddingBaseStyle: addBaseStyleMutation.isPending,
    isRemovingBaseStyle: removeBaseStyleMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isAddingRoom: addRoomMutation.isPending,
    isUpdatingRoom: updateRoomMutation.isPending,
    isDeletingRoom: deleteRoomMutation.isPending,
    isGenerating: generateMutation.isPending,
    isDeletingRoomImage: deleteRoomImageMutation.isPending,
    isApprovingPreview: approvePreviewImageMutation.isPending,

    // Refetch
    refetch,
  }
}
