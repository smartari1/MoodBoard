/**
 * React Query hooks for Organization Management
 * Provides operations for fetching organizations (admin only)
 */

import { useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export interface Organization {
  id: string
  name: string
  slug: string
}

interface OrganizationsResponse {
  data: Organization[]
}

const ADMIN_ORGANIZATIONS_QUERY_KEY = 'admin-organizations'

/**
 * Fetch all organizations (admin only)
 */
async function fetchOrganizations(): Promise<OrganizationsResponse> {
  const response = await fetch('/api/admin/organizations')

  if (!response.ok) {
    throw new Error('Failed to fetch organizations')
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

