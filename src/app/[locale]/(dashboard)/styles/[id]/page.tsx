/**
 * User-Facing Style Detail Page
 * View style details (global + approved public + personal)
 */

'use client'

import { Container } from '@mantine/core'
import { useTranslations } from 'next-intl'
import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { LoadingState, ErrorState } from '@/components/ui'
import { useStyle } from '@/hooks/useStyles'

export default function StyleEntryPage() {
  const tCommon = useTranslations('common')
  const params = useParams()
  const router = useRouter()
  const locale = params.locale as string
  const styleId = params.id as string

  const { data: style, isLoading, error } = useStyle(styleId)

  useEffect(() => {
    if (!isLoading && style) {
      const approaches = style.approaches || []
      const defaultApproach =
        approaches.find((approach: any) => approach.metadata?.isDefault) ||
        approaches.sort((a: any, b: any) => a.order - b.order)[0]

      if (defaultApproach) {
        router.replace(`/${locale}/styles/${styleId}/${defaultApproach.slug}`)
      }
    }
  }, [isLoading, style, router, locale, styleId])

  if (isLoading) {
    return (
      <Container size="xl" py="xl">
        <LoadingState />
      </Container>
    )
  }

  if (error || !style) {
    return (
      <Container size="xl" py="xl">
        <ErrorState message={tCommon('error')} />
      </Container>
    )
  }

  if (!style.approaches || style.approaches.length === 0) {
    return (
      <Container size="xl" py="xl">
        <ErrorState message="No approaches available for this style yet." />
      </Container>
    )
  }

  return (
    <Container size="xl" py="xl">
      <LoadingState />
    </Container>
  )
}

