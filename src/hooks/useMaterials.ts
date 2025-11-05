/**
 * React Query hooks for Material Management
 * Provides CRUD operations for materials
 */

import type {
    CreateMaterial,
    MaterialFilters,
    UpdateMaterial,
} from '@/lib/validations/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export interface Material {
  id: string
  organizationId: string
  sku: string
  name: {
    he: string
    en: string
  }
  categoryId: string
  properties: {
    typeId: string
    subType: string
    finish: string[]
    texture: string
    colorIds: string[]
    dimensions?: {
      width?: number
      height?: number
      thickness?: number
      unit: string
    } | null
    technical: {
      durability: number
      maintenance: number
      sustainability: number
      fireRating?: string | null
      waterResistance?: boolean | null
    }
  }
  pricing: {
    cost: number
    retail: number
    unit: 'sqm' | 'unit' | 'linear_m'
    currency: string
    bulkDiscounts: Array<{
      minQuantity: number
      discount: number
    }>
  }
  availability: {
    inStock: boolean
    leadTime: number
    minOrder: number
  }
  assets: {
    thumbnail: string
    images: string[]
    texture?: string | null
    technicalSheet?: string | null
  }
  createdAt: Date | string
  updatedAt: Date | string
}

interface MaterialsResponse {
  data: Material[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

const MATERIALS_QUERY_KEY = 'materials'
const ADMIN_MATERIALS_QUERY_KEY = 'admin-materials'

/**
 * Fetch materials with filters
 */
async function fetchMaterials(filters: MaterialFilters): Promise<MaterialsResponse> {
  const params = new URLSearchParams()

  if (filters.search) params.append('search', filters.search)
  if (filters.categoryId) params.append('categoryId', filters.categoryId)
  if (filters.typeId) params.append('typeId', filters.typeId)
  if (filters.page) params.append('page', filters.page.toString())
  if (filters.limit) params.append('limit', filters.limit.toString())

  const url = `/api/admin/materials?${params.toString()}`
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error('Failed to fetch materials')
  }

  return response.json()
}

/**
 * Fetch single material
 */
async function fetchMaterial(materialId: string): Promise<Material> {
  const response = await fetch(`/api/admin/materials/${materialId}`)

  if (!response.ok) {
    throw new Error('Failed to fetch material')
  }

  return response.json()
}

/**
 * Hook to fetch materials (admin only)
 */
export function useMaterials(filters: MaterialFilters = {}) {
  return useQuery({
    queryKey: [ADMIN_MATERIALS_QUERY_KEY, filters],
    queryFn: () => fetchMaterials(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Helper function to validate ObjectID format
 */
function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id)
}

/**
 * Hook to fetch single material
 */
export function useMaterial(materialId: string) {
  const isValidId = materialId && materialId !== 'new' && isValidObjectId(materialId)
  
  return useQuery({
    queryKey: [ADMIN_MATERIALS_QUERY_KEY, materialId],
    queryFn: () => fetchMaterial(materialId),
    enabled: isValidId,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Hook to create material (admin only)
 */
export function useCreateMaterial() {
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const router = useRouter()
  const isAdmin = session?.user?.role === 'admin'

  return useMutation({
    mutationFn: async (data: CreateMaterial) => {
      if (!isAdmin) {
        throw new Error('Admin access required')
      }

      const response = await fetch('/api/admin/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Admin access required')
        }
        const error = await response.json()
        throw new Error(error.error || 'Failed to create material')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ADMIN_MATERIALS_QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: [MATERIALS_QUERY_KEY] })
    },
    onError: (error: any) => {
      if (error?.message?.includes('Admin access') || error?.status === 403) {
        const locale = window.location.pathname.split('/')[1] || 'he'
        router.push(`/${locale}/dashboard`)
      }
    },
  })
}

/**
 * Hook to update material (admin only)
 */
export function useUpdateMaterial() {
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const router = useRouter()
  const isAdmin = session?.user?.role === 'admin'

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateMaterial }) => {
      if (!isAdmin) {
        throw new Error('Admin access required')
      }

      const response = await fetch(`/api/admin/materials/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Admin access required')
        }
        const error = await response.json()
        throw new Error(error.error || 'Failed to update material')
      }

      return response.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [ADMIN_MATERIALS_QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: [ADMIN_MATERIALS_QUERY_KEY, variables.id] })
      queryClient.invalidateQueries({ queryKey: [MATERIALS_QUERY_KEY] })
    },
    onError: (error: any) => {
      if (error?.message?.includes('Admin access') || error?.status === 403) {
        const locale = window.location.pathname.split('/')[1] || 'he'
        router.push(`/${locale}/dashboard`)
      }
    },
  })
}

/**
 * Hook to delete material (admin only)
 */
export function useDeleteMaterial() {
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const router = useRouter()
  const isAdmin = session?.user?.role === 'admin'

  return useMutation({
    mutationFn: async (materialId: string) => {
      if (!isAdmin) {
        throw new Error('Admin access required')
      }

      const response = await fetch(`/api/admin/materials/${materialId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Admin access required')
        }
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete material')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ADMIN_MATERIALS_QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: [MATERIALS_QUERY_KEY] })
    },
    onError: (error: any) => {
      if (error?.message?.includes('Admin access') || error?.status === 403) {
        const locale = window.location.pathname.split('/')[1] || 'he'
        router.push(`/${locale}/dashboard`)
      }
    },
  })
}

