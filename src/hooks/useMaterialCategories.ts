/**
 * React Query hooks for Material Category & Type Management
 * Provides CRUD operations for material categories and types
 */

import type {
  CreateMaterialCategory,
  CreateMaterialType,
  UpdateMaterialCategory,
  UpdateMaterialType,
} from '@/lib/validations/material-category'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'

export interface MaterialCategory {
  id: string
  name: {
    he: string
    en: string
  }
  description?: {
    he?: string
    en?: string
  }
  slug: string
  order: number
  icon?: string
  types?: MaterialType[]
  _count?: {
    materials: number
    types: number
  }
  createdAt: Date | string
  updatedAt: Date | string
}

export interface MaterialType {
  id: string
  categoryId: string
  category?: MaterialCategory
  name: {
    he: string
    en: string
  }
  description?: {
    he?: string
    en?: string
  }
  slug: string
  order: number
  icon?: string
  _count?: {
    materials: number
  }
  createdAt: Date | string
  updatedAt: Date | string
}

interface MaterialCategoriesResponse {
  data: MaterialCategory[]
  count: number
}

interface MaterialTypesResponse {
  data: MaterialType[]
  count: number
}

const MATERIAL_CATEGORIES_QUERY_KEY = 'material-categories'
const MATERIAL_TYPES_QUERY_KEY = 'material-types'

// ============================================
// Material Categories
// ============================================

async function fetchMaterialCategories(search?: string): Promise<MaterialCategoriesResponse> {
  const params = new URLSearchParams()
  if (search) params.append('search', search)

  const url = `/api/admin/material-categories?${params.toString()}`
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error('Failed to fetch material categories')
  }

  return response.json()
}

async function fetchMaterialCategory(categoryId: string): Promise<MaterialCategory> {
  const response = await fetch(`/api/admin/material-categories/${categoryId}`)

  if (!response.ok) {
    throw new Error('Failed to fetch material category')
  }

  return response.json()
}

async function createMaterialCategory(data: CreateMaterialCategory): Promise<MaterialCategory> {
  const response = await fetch('/api/admin/material-categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create material category')
  }

  return response.json()
}

async function updateMaterialCategory({
  id,
  data,
}: {
  id: string
  data: UpdateMaterialCategory
}): Promise<MaterialCategory> {
  const response = await fetch(`/api/admin/material-categories/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update material category')
  }

  return response.json()
}

async function deleteMaterialCategory(categoryId: string): Promise<void> {
  const response = await fetch(`/api/admin/material-categories/${categoryId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to delete material category')
  }
}

export function useMaterialCategories(search?: string) {
  return useQuery({
    queryKey: [MATERIAL_CATEGORIES_QUERY_KEY, search],
    queryFn: () => fetchMaterialCategories(search),
    staleTime: 5 * 60 * 1000,
  })
}

export function useMaterialCategory(
  categoryId: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: [MATERIAL_CATEGORIES_QUERY_KEY, categoryId],
    queryFn: () => fetchMaterialCategory(categoryId),
    enabled: options?.enabled !== undefined ? options.enabled : !!categoryId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateMaterialCategory() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: createMaterialCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MATERIAL_CATEGORIES_QUERY_KEY] })
    },
  })
}

export function useUpdateMaterialCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateMaterialCategory,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [MATERIAL_CATEGORIES_QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: [MATERIAL_CATEGORIES_QUERY_KEY, variables.id] })
    },
  })
}

export function useDeleteMaterialCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteMaterialCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MATERIAL_CATEGORIES_QUERY_KEY] })
    },
  })
}

// ============================================
// Material Types
// ============================================

async function fetchMaterialTypes(search?: string, categoryId?: string): Promise<MaterialTypesResponse> {
  const params = new URLSearchParams()
  if (search) params.append('search', search)
  if (categoryId) params.append('categoryId', categoryId)

  const url = `/api/admin/material-types?${params.toString()}`
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error('Failed to fetch material types')
  }

  return response.json()
}

async function fetchMaterialType(typeId: string): Promise<MaterialType> {
  const response = await fetch(`/api/admin/material-types/${typeId}`)

  if (!response.ok) {
    throw new Error('Failed to fetch material type')
  }

  return response.json()
}

async function createMaterialType(data: CreateMaterialType): Promise<MaterialType> {
  const response = await fetch('/api/admin/material-types', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create material type')
  }

  return response.json()
}

async function updateMaterialType({
  id,
  data,
}: {
  id: string
  data: UpdateMaterialType
}): Promise<MaterialType> {
  const response = await fetch(`/api/admin/material-types/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update material type')
  }

  return response.json()
}

async function deleteMaterialType(typeId: string): Promise<void> {
  const response = await fetch(`/api/admin/material-types/${typeId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to delete material type')
  }
}

export function useMaterialTypes(
  search?: string,
  categoryId?: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: [MATERIAL_TYPES_QUERY_KEY, search, categoryId],
    queryFn: () => fetchMaterialTypes(search, categoryId),
    staleTime: 5 * 60 * 1000,
    enabled: options?.enabled !== undefined ? options.enabled : true,
  })
}

export function useMaterialType(
  typeId: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: [MATERIAL_TYPES_QUERY_KEY, typeId],
    queryFn: () => fetchMaterialType(typeId),
    enabled: options?.enabled !== undefined ? options.enabled : !!typeId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateMaterialType() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createMaterialType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MATERIAL_TYPES_QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: [MATERIAL_CATEGORIES_QUERY_KEY] })
    },
  })
}

export function useUpdateMaterialType() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateMaterialType,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [MATERIAL_TYPES_QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: [MATERIAL_TYPES_QUERY_KEY, variables.id] })
    },
  })
}

export function useDeleteMaterialType() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteMaterialType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MATERIAL_TYPES_QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: [MATERIAL_CATEGORIES_QUERY_KEY] })
    },
  })
}

