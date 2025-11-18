/**
 * React Query hooks for Style Management
 * Provides real-time-like updates with auto-refetch
 */

import type { CreateApproach, UpdateApproach } from '@/lib/validations/approach'
import type { ApproveStyle, CreateStyle, StyleFilters, UpdateStyle } from '@/lib/validations/style'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export interface Approach {
  id: string
  styleId: string
  slug: string
  name: {
    he: string
    en: string
  }
  order: number
  description?: {
    he: string
    en: string
  } | null
  images?: string[]
  materialSet?: {
    defaults: Array<{
      materialId: string
    }>
    alternatives?: Array<{
      usageArea: string
      alternatives: string[]
    }>
  }
  roomProfiles?: Array<{
    roomType: string
    materials?: string[]
    images?: string[]
    constraints?: {
      waterResistance?: boolean
      durability?: number
      maintenance?: number
    }
  }>
  metadata: {
    isDefault: boolean
    version: string
    tags: string[]
    usage: number
  }
  createdAt?: Date | string
  updatedAt?: Date | string
}

export interface Style {
  id: string
  organizationId: string | null
  slug: string
  name: {
    he: string
    en: string
  }
  categoryId: string
  category?: {
    id: string
    name: {
      he: string
      en: string
    }
    slug: string
  }
  subCategoryId: string
  subCategory?: {
    id: string
    name: {
      he: string
      en: string
    }
    slug: string
  }
  colorId: string
  color?: {
    id: string
    name: {
      he: string
      en: string
    }
    hex: string
    pantone?: string | null
    category: string
  }
  images?: string[]
  metadata: {
    version: string
    isPublic: boolean
    approvalStatus?: 'pending' | 'approved' | 'rejected' | null
    approvedBy?: string | null
    approvedAt?: Date | null
    rejectionReason?: string | null
    tags: string[]
    usage: number
    rating?: number
  }
  organization?: {
    id: string
    name: string
    slug: string
  }
  approachId: string
  approach?: {
    id: string
    slug: string
    name: {
      he: string
      en: string
    }
    order: number
    description?: {
      he: string
      en: string
    }
    images?: string[]
    metadata?: {
      isDefault?: boolean
      version?: string
      tags?: string[]
      usage?: number
    }
  }
  detailedContent?: any
  roomProfiles?: any[]
  createdAt: Date | string
  updatedAt: Date | string
}

interface StylesResponse {
  data: Style[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

const STYLES_QUERY_KEY = 'styles'
const ADMIN_STYLES_QUERY_KEY = 'admin-styles'
const ADMIN_APPROVALS_QUERY_KEY = 'admin-approvals'

/**
 * Fetch styles with filters (user-facing)
 */
async function fetchStyles(filters: StyleFilters): Promise<StylesResponse> {
  const params = new URLSearchParams()

  if (filters.search) params.append('search', filters.search)
  if (filters.categoryId) params.append('categoryId', filters.categoryId)
  if (filters.subCategoryId) params.append('subCategoryId', filters.subCategoryId)
  if (filters.scope) params.append('scope', filters.scope)
  if (filters.tags?.length) params.append('tags', filters.tags.join(','))
  if (filters.page) params.append('page', filters.page.toString())
  if (filters.limit) params.append('limit', filters.limit.toString())

  const url = `/api/styles?${params.toString()}`
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error('Failed to fetch styles')
  }

  return response.json()
}

/**
 * Fetch admin styles (global styles only)
 */
async function fetchAdminStyles(filters: StyleFilters): Promise<StylesResponse> {
  const params = new URLSearchParams()

  if (filters.search) params.append('search', filters.search)
  if (filters.categoryId) params.append('categoryId', filters.categoryId)
  if (filters.subCategoryId) params.append('subCategoryId', filters.subCategoryId)
  if (filters.page) params.append('page', filters.page.toString())
  if (filters.limit) params.append('limit', filters.limit.toString())

  const url = `/api/admin/styles?${params.toString()}`
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error('Failed to fetch admin styles')
  }

  return response.json()
}

/**
 * Fetch pending style approvals (admin only)
 */
async function fetchStyleApprovals(status: string = 'pending', page: number = 1, limit: number = 20): Promise<StylesResponse> {
  const params = new URLSearchParams()
  params.append('status', status)
  params.append('page', page.toString())
  params.append('limit', limit.toString())

  const url = `/api/admin/styles/approvals?${params.toString()}`
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error('Failed to fetch style approvals')
  }

  return response.json()
}

/**
 * Hook to fetch styles list (user-facing)
 * FIX: Removed aggressive refetch options to improve performance
 */
export function useStyles(filters: StyleFilters = {}) {
  const { data: session } = useSession()

  return useQuery({
    queryKey: [STYLES_QUERY_KEY, filters],
    queryFn: () => fetchStyles(filters),
    enabled: !!session,
    // FIX: Removed refetchOnWindowFocus, refetchInterval, and staleTime overrides
    // Use global defaults (60s staleTime, no auto-refetch) for better performance
  })
}

/**
 * Hook to fetch admin styles (global styles)
 * Protected: Only works for admin users
 * FIX: Removed aggressive refetch options to improve performance
 */
export function useAdminStyles(filters: StyleFilters = {}) {
  const { data: session } = useSession()
  const router = useRouter()
  const isAdmin = session?.user?.role === 'admin'

  // Debug logging
  console.log('[useAdminStyles] Hook state:', {
    hasSession: !!session,
    userRole: session?.user?.role,
    isAdmin,
    enabled: !!session && isAdmin,
    filters,
  })

  return useQuery({
    queryKey: [ADMIN_STYLES_QUERY_KEY, filters],
    queryFn: async () => {
      console.log('[useAdminStyles] Query function called')
      if (!isAdmin) {
        throw new Error('Admin access required')
      }
      const result = await fetchAdminStyles(filters)
      console.log('[useAdminStyles] Query result:', result)
      return result
    },
    enabled: !!session && isAdmin,
    // FIX: Removed refetchOnWindowFocus, refetchInterval, and staleTime overrides
    // Use global defaults (60s staleTime, no auto-refetch) for better performance
    retry: false,
    onError: (error: any) => {
      if (error?.message?.includes('Admin access') || error?.status === 403) {
        const locale = window.location.pathname.split('/')[1] || 'he'
        router.push(`/${locale}/dashboard`)
      }
    },
  })
}

/**
 * Hook to fetch style approvals (admin only)
 * Protected: Only works for admin users
 * FIX: Removed aggressive refetch options to improve performance
 */
export function useStyleApprovals(status: string = 'pending', page: number = 1, limit: number = 20) {
  const { data: session } = useSession()
  const router = useRouter()
  const isAdmin = session?.user?.role === 'admin'

  return useQuery({
    queryKey: [ADMIN_APPROVALS_QUERY_KEY, status, page, limit],
    queryFn: async () => {
      if (!isAdmin) {
        throw new Error('Admin access required')
      }
      return fetchStyleApprovals(status, page, limit)
    },
    enabled: !!session && isAdmin,
    // FIX: Removed refetchOnWindowFocus, refetchInterval, and staleTime overrides
    // Use global defaults (60s staleTime, no auto-refetch) for better performance
    retry: false,
    onError: (error: any) => {
      if (error?.message?.includes('Admin access') || error?.status === 403) {
        const locale = window.location.pathname.split('/')[1] || 'he'
        router.push(`/${locale}/dashboard`)
      }
    },
  })
}

/**
 * Hook to fetch a single style (user-facing)
 * FIX: Removed aggressive refetch options to improve performance
 */
export function useStyle(styleId: string) {
  const { data: session } = useSession()

  return useQuery({
    queryKey: [STYLES_QUERY_KEY, styleId],
    queryFn: async () => {
      const response = await fetch(`/api/styles/${styleId}`)

      if (!response.ok) {
        throw new Error('Failed to fetch style')
      }

      return response.json()
    },
    enabled: !!session && !!styleId,
    // FIX: Removed refetchOnWindowFocus and staleTime overrides
    // Use global defaults (60s staleTime, no auto-refetch) for better performance
  })
}

/**
 * Hook to fetch a single admin style (admin-only)
 * Protected: Only works for admin users
 * FIX: Removed aggressive refetch options to improve performance
 */
export function useAdminStyle(styleId: string) {
  const { data: session } = useSession()
  const router = useRouter()
  const isAdmin = session?.user?.role === 'admin'

  return useQuery({
    queryKey: [ADMIN_STYLES_QUERY_KEY, styleId],
    queryFn: async () => {
      if (!isAdmin) {
        throw new Error('Admin access required')
      }

      const response = await fetch(`/api/admin/styles/${styleId}`)

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Admin access required')
        }
        throw new Error('Failed to fetch admin style')
      }

      return response.json()
    },
    enabled: !!session && !!styleId && isAdmin,
    // FIX: Removed refetchOnWindowFocus and staleTime overrides
    // Use global defaults (60s staleTime, no auto-refetch) for better performance
    retry: false,
    onError: (error: any) => {
      if (error?.message?.includes('Admin access') || error?.status === 403) {
        const locale = window.location.pathname.split('/')[1] || 'he'
        router.push(`/${locale}/dashboard`)
      }
    },
  })
}

/**
 * Hook to create a style
 */
export function useCreateStyle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateStyle) => {
      const response = await fetch('/api/styles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create style')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [STYLES_QUERY_KEY] })
    },
  })
}

/**
 * Hook to update a style
 */
export function useUpdateStyle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateStyle }) => {
      const response = await fetch(`/api/styles/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update style')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [STYLES_QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: [ADMIN_STYLES_QUERY_KEY] })
    },
  })
}

/**
 * Hook to delete a style
 */
export function useDeleteStyle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/styles/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete style')
      }

      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [STYLES_QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: [ADMIN_STYLES_QUERY_KEY] })
    },
  })
}

/**
 * Hook to create admin global style
 * Protected: Only works for admin users
 */
export function useCreateAdminStyle() {
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const router = useRouter()
  const isAdmin = session?.user?.role === 'admin'

  return useMutation({
    mutationFn: async (data: CreateStyle) => {
      if (!isAdmin) {
        throw new Error('Admin access required')
      }

      console.log('[CREATE STYLE HOOK] Sending request with data:', JSON.stringify({
        name: data.name,
        categoryId: data.categoryId,
        subCategoryId: data.subCategoryId,
        colorId: data.colorId,
        images: data.images,
      }, null, 2))
      
      try {
        const response = await fetch('/api/admin/styles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })

        console.log('[CREATE STYLE HOOK] Response status:', response.status)
        console.log('[CREATE STYLE HOOK] Response ok:', response.ok)

        if (!response.ok) {
          if (response.status === 403) {
            throw new Error('Admin access required')
          }
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
          console.error('[CREATE STYLE HOOK] Error response:', errorData)
          throw new Error(errorData.error || `Failed to create style: ${response.status} ${response.statusText}`)
        }

        const result = await response.json()
        console.log('[CREATE STYLE HOOK] Success, created style:', result.id)
        return result
      } catch (error) {
        console.error('[CREATE STYLE HOOK] Request failed:', error)
        if (error instanceof Error) {
          console.error('[CREATE STYLE HOOK] Error message:', error.message)
          console.error('[CREATE STYLE HOOK] Error stack:', error.stack)
        }
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ADMIN_STYLES_QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: [STYLES_QUERY_KEY] })
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
 * Hook to update admin global style
 * Protected: Only works for admin users
 */
export function useUpdateAdminStyle() {
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const router = useRouter()
  const isAdmin = session?.user?.role === 'admin'

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateStyle }) => {
      console.log('[UPDATE STYLE HOOK] ========== START UPDATE ==========')
      console.log('[UPDATE STYLE HOOK] Style ID:', id)
      console.log('[UPDATE STYLE HOOK] Is Admin:', isAdmin)

      if (!isAdmin) {
        console.error('[UPDATE STYLE HOOK] ERROR: User is not admin')
        throw new Error('Admin access required')
      }

      console.log('[UPDATE STYLE HOOK] Update data summary:', {
        name: data.name,
        categoryId: data.categoryId,
        subCategoryId: data.subCategoryId,
        colorId: data.colorId,
        slug: data.slug,
        imagesCount: data.images?.length,
        images: data.images,
      })
      console.log('[UPDATE STYLE HOOK] Full update data:', JSON.stringify(data, null, 2))

      const url = `/api/admin/styles/${id}`
      console.log('[UPDATE STYLE HOOK] Request URL:', url)
      console.log('[UPDATE STYLE HOOK] Sending PATCH request...')

      let response
      try {
        response = await fetch(url, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        console.log('[UPDATE STYLE HOOK] Response status:', response.status, response.statusText)
      } catch (fetchError) {
        console.error('[UPDATE STYLE HOOK] ========== FETCH ERROR ==========')
        console.error('[UPDATE STYLE HOOK] Error:', fetchError)
        if (fetchError instanceof Error) {
          console.error('[UPDATE STYLE HOOK] Message:', fetchError.message)
          console.error('[UPDATE STYLE HOOK] Stack:', fetchError.stack)
        }
        console.error('[UPDATE STYLE HOOK] ===================================')
        throw fetchError
      }

      if (!response.ok) {
        console.error('[UPDATE STYLE HOOK] ========== RESPONSE ERROR ==========')
        console.error('[UPDATE STYLE HOOK] Status:', response.status, response.statusText)

        if (response.status === 403) {
          console.error('[UPDATE STYLE HOOK] ERROR: Admin access required')
          throw new Error('Admin access required')
        }

        let errorData
        try {
          errorData = await response.json()
          console.error('[UPDATE STYLE HOOK] Error response:', JSON.stringify(errorData, null, 2))
        } catch (jsonError) {
          console.error('[UPDATE STYLE HOOK] Could not parse error response as JSON')
          const textError = await response.text()
          console.error('[UPDATE STYLE HOOK] Error response (text):', textError)
        }

        console.error('[UPDATE STYLE HOOK] =====================================')
        throw new Error(errorData?.error || 'Failed to update global style')
      }

      console.log('[UPDATE STYLE HOOK] ✅ Update successful, parsing response...')
      let result
      try {
        result = await response.json()
        console.log('[UPDATE STYLE HOOK] Response data:', {
          id: result.id,
          name: result.name,
          imagesCount: result.images?.length,
          approachId: result.approachId,
          hasApproach: !!result.approach,
        })
        console.log('[UPDATE STYLE HOOK] Full response:', JSON.stringify(result, null, 2))
      } catch (jsonError) {
        console.error('[UPDATE STYLE HOOK] ERROR parsing response JSON:', jsonError)
        throw jsonError
      }

      console.log('[UPDATE STYLE HOOK] ========== END UPDATE ==========')
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ADMIN_STYLES_QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: [STYLES_QUERY_KEY] })
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
 * Hook to delete admin global style
 * Protected: Only works for admin users
 */
export function useDeleteAdminStyle() {
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const router = useRouter()
  const isAdmin = session?.user?.role === 'admin'

  return useMutation({
    mutationFn: async (id: string) => {
      if (!isAdmin) {
        throw new Error('Admin access required')
      }

      const response = await fetch(`/api/admin/styles/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Admin access required')
        }
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete style')
      }

      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ADMIN_STYLES_QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: [STYLES_QUERY_KEY] })
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
 * Hook to approve/reject a public style (admin only)
 * Protected: Only works for admin users
 */
export function useApproveStyle() {
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const router = useRouter()
  const isAdmin = session?.user?.role === 'admin'

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ApproveStyle }) => {
      if (!isAdmin) {
        throw new Error('Admin access required')
      }

      const response = await fetch(`/api/admin/styles/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Admin access required')
        }
        const error = await response.json()
        throw new Error(error.error || 'Failed to approve/reject style')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ADMIN_APPROVALS_QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: [STYLES_QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: [ADMIN_STYLES_QUERY_KEY] })
    },
    onError: (error: any) => {
      if (error?.message?.includes('Admin access') || error?.status === 403) {
        const locale = window.location.pathname.split('/')[1] || 'he'
        router.push(`/${locale}/dashboard`)
      }
    },
  })
}

