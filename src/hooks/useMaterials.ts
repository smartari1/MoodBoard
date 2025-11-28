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

// Supplier pricing interface (per-supplier)
export interface SupplierPricing {
  cost: number
  retail: number
  unit: 'sqm' | 'unit' | 'linear_m'
  currency: string
  bulkDiscounts: Array<{
    minQuantity: number
    discount: number
  }>
}

// Supplier availability interface (per-supplier)
export interface SupplierAvailability {
  inStock: boolean
  leadTime: number
  minOrder: number
}

// Supplier interface for Material ↔ Organization relationship
// Each supplier has their own pricing, availability, and color selection
export interface MaterialSupplier {
  id: string
  materialId: string
  organizationId: string
  organization?: {
    id: string
    name: string
    slug: string
  }
  supplierSku?: string | null
  // Colors available from this supplier (from system color palette)
  colorIds: string[]
  // Supplier-specific pricing
  pricing?: SupplierPricing | null
  // Supplier-specific availability
  availability?: SupplierAvailability | null
  // Metadata
  isPreferred: boolean
  notes?: string | null
  createdAt: Date | string
  updatedAt: Date | string
}

// Material interface - base entity with shared properties
// NOTE: pricing, availability, and colors are now per-supplier in MaterialSupplier
export interface Material {
  id: string
  sku: string | null
  name: {
    he: string
    en: string
  }
  categoryId: string
  textureId?: string | null
  // Suppliers with their specific pricing, availability, and colors
  suppliers?: MaterialSupplier[]
  // Shared properties (same across all suppliers)
  properties: {
    typeId: string
    subType: string
    finish: string[]
    texture: string
    // NOTE: colorIds moved to MaterialSupplier (per-supplier colors)
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
  // Shared assets (same images for all suppliers)
  assets: {
    thumbnail: string
    images: string[]
    texture?: string | null
    technicalSheet?: string | null
  }
  // NOTE: pricing and availability are now per-supplier in MaterialSupplier
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
 * Optimized caching: Data stays fresh for 5 minutes, cached for 15 minutes
 */
export function useMaterials(filters: MaterialFilters = {}) {
  return useQuery({
    queryKey: [ADMIN_MATERIALS_QUERY_KEY, filters],
    queryFn: () => fetchMaterials(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes - matches global config
    gcTime: 15 * 60 * 1000, // 15 minutes - keep in cache longer
  })
}

/**
 * Fetch all materials by paginating through all pages
 */
async function fetchAllMaterials(baseFilters: Omit<MaterialFilters, 'page' | 'limit'>): Promise<Material[]> {
  const allMaterials: Material[] = []
  let page = 1
  const limit = 100 // Max per page
  let hasMore = true

  while (hasMore) {
    const response = await fetchMaterials({ ...baseFilters, page, limit })
    allMaterials.push(...response.data)

    hasMore = page < response.pagination.totalPages
    page++
  }

  return allMaterials
}

/**
 * Hook to fetch ALL materials (paginated automatically)
 * Use this when you need all materials for dropdowns/selects
 */
export function useAllMaterials(filters: Omit<MaterialFilters, 'page' | 'limit'> = {}) {
  return useQuery({
    queryKey: [ADMIN_MATERIALS_QUERY_KEY, 'all', filters],
    queryFn: () => fetchAllMaterials(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
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
 * Optimized caching: Material details are cached longer as they rarely change
 */
export function useMaterial(materialId: string) {
  const isValidId = materialId && materialId !== 'new' && isValidObjectId(materialId)

  return useQuery({
    queryKey: [ADMIN_MATERIALS_QUERY_KEY, materialId],
    queryFn: () => fetchMaterial(materialId),
    enabled: isValidId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes - keep in cache
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

