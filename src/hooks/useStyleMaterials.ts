/**
 * Style Materials Hooks
 * React Query hooks for fetching Material entities linked to a style
 */

import { useQuery } from '@tanstack/react-query'

export interface StyleMaterial {
  id: string
  name: { he: string; en: string }
  sku: string | null
  isAbstract: boolean
  aiDescription: string | null
  generationStatus: string
  category: {
    id: string
    name: { he: string; en: string }
    slug: string
  } | null
  texture: {
    id: string
    name: { he: string; en: string }
    imageUrl: string | null
  } | null
  assets: {
    thumbnail: string
    images: string[]
  } | null
  usageCount: number
  linkedAt: string
  // Application info from embedded roomProfiles data
  application?: { he: string; en: string } | null
  finish?: string | null
}

export interface StyleMaterialsResponse {
  success: boolean
  data: {
    materials: StyleMaterial[]
    groupedByCategory: Record<string, StyleMaterial[]>
    counts: {
      total: number
      byCategory: Array<{
        category: string
        count: number
      }>
    }
  }
}

/**
 * Fetch Material entities linked to a style
 */
export function useStyleMaterials(styleId: string | undefined) {
  return useQuery({
    queryKey: ['style-materials', styleId],
    queryFn: async () => {
      const response = await fetch(`/api/styles/${styleId}/materials`)
      if (!response.ok) throw new Error('Failed to fetch style materials')
      return response.json() as Promise<StyleMaterialsResponse>
    },
    enabled: !!styleId,
  })
}
