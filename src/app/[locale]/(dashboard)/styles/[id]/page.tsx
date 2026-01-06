/**
 * User-Facing Style Detail Page
 * View style details - Pinterest/Instagram style gallery layout
 */

'use client'

import { useParams } from 'next/navigation'
import { StyleGalleryPage } from '@/components/features/style-gallery'

export default function StyleDetailPage() {
  const params = useParams()
  const locale = (params?.locale as string) || 'he'
  const styleId = (params?.id as string) || ''

  return <StyleGalleryPage styleId={styleId} locale={locale as 'he' | 'en'} />
}
