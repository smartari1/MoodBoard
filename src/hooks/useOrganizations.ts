/**
 * React Query hooks for Organization Management
 * Provides operations for fetching and creating organizations (admin only)
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { CreateOrganization, UpdateOrganization } from '@/lib/validations/organization'

export interface Organization {
  id: string
  name: string
  slug: string
  createdAt?: string
  updatedAt?: string
}

interface OrganizationsResponse {
  data: Organization[]
}

interface CreateOrganizationResponse {
  data: Organization
}

interface OrganizationResponse {
  data: Organization
}

const ADMIN_ORGANIZATIONS_QUERY_KEY = 'admin-organizations'

/**
 * Fetch all organizations (admin only)
 */
async function fetchOrganizations(): Promise<OrganizationsResponse> {
  const response = await fetch('/api/admin/organizations')

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch organizations' }))
    throw new Error(error.error || 'Failed to fetch organizations')
  }

  return response.json()
}

/**
 * Create new organization (admin only)
 */
async function createOrganization(data: CreateOrganization): Promise<CreateOrganizationResponse> {
  const response = await fetch('/api/admin/organizations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create organization' }))
    throw new Error(error.error || 'Failed to create organization')
  }

  return response.json()
}

/**
 * Hook to fetch all organizations (admin only)
 */
export function useOrganizations() {
  const { data: session } = useSession()
  const router = useRouter()
  const isAdmin = session?.user?.role === 'admin'

  return useQuery({
    queryKey: [ADMIN_ORGANIZATIONS_QUERY_KEY],
    queryFn: fetchOrganizations,
    enabled: !!session && isAdmin,
    staleTime: 5 * 60 * 1000, // 5 minutes
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
 * Get single organization (admin only)
 */
async function getOrganization(id: string): Promise<OrganizationResponse> {
  const response = await fetch(`/api/admin/organizations/${id}`)

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch organization' }))
    throw new Error(error.error || 'Failed to fetch organization')
  }

  return response.json()
}

/**
 * Update organization (admin only)
 */
async function updateOrganization({ id, data }: { id: string; data: UpdateOrganization }): Promise<OrganizationResponse> {
  const response = await fetch(`/api/admin/organizations/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update organization' }))
    throw new Error(error.error || 'Failed to update organization')
  }

  return response.json()
}

/**
 * Delete organization (admin only)
 */
async function deleteOrganization(id: string): Promise<void> {
  const response = await fetch(`/api/admin/organizations/${id}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to delete organization' }))
    throw new Error(error.error || 'Failed to delete organization')
  }
}

/**
 * Hook to fetch single organization (admin only)
 */
export function useOrganization(id: string | null) {
  const { data: session } = useSession()
  const router = useRouter()
  const isAdmin = session?.user?.role === 'admin'

  return useQuery({
    queryKey: [ADMIN_ORGANIZATIONS_QUERY_KEY, id],
    queryFn: () => getOrganization(id!),
    enabled: !!session && isAdmin && !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
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
 * Hook to create a new organization (admin only)
 */
export function useCreateOrganization() {
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const router = useRouter()
  const isAdmin = session?.user?.role === 'admin'

  return useMutation({
    mutationFn: createOrganization,
    onSuccess: () => {
      // Invalidate and refetch organizations list
      queryClient.invalidateQueries({ queryKey: [ADMIN_ORGANIZATIONS_QUERY_KEY] })
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
 * Hook to update an organization (admin only)
 */
export function useUpdateOrganization() {
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const router = useRouter()

  return useMutation({
    mutationFn: updateOrganization,
    onSuccess: (_, variables) => {
      // Invalidate and refetch organizations list
      queryClient.invalidateQueries({ queryKey: [ADMIN_ORGANIZATIONS_QUERY_KEY] })
      // Invalidate specific organization
      queryClient.invalidateQueries({ queryKey: [ADMIN_ORGANIZATIONS_QUERY_KEY, variables.id] })
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
 * Hook to delete an organization (admin only)
 */
export function useDeleteOrganization() {
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const router = useRouter()

  return useMutation({
    mutationFn: deleteOrganization,
    onSuccess: () => {
      // Invalidate and refetch organizations list
      queryClient.invalidateQueries({ queryKey: [ADMIN_ORGANIZATIONS_QUERY_KEY] })
    },
    onError: (error: any) => {
      if (error?.message?.includes('Admin access') || error?.status === 403) {
        const locale = window.location.pathname.split('/')[1] || 'he'
        router.push(`/${locale}/dashboard`)
      }
    },
  })
}

