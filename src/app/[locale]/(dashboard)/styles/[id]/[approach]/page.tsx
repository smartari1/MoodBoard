/**
 * User-Facing Style Approach Page (Deprecated)
 * Redirects to main style page since styles now have a single approach
 *
 * NOTE: This route is kept for backward compatibility but redirects to /styles/[id]
 */

'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Container } from '@mantine/core'
import { LoadingState } from '@/components/ui/LoadingState'

export default function StyleApproachPageRedirect() {
  const params = useParams()
  const router = useRouter()

  const locale = params.locale as string
  const styleId = params.id as string

  useEffect(() => {
    // Redirect to main style page since styles now have a single approach
    router.replace(`/${locale}/styles/${styleId}`)
  }, [locale, styleId, router])

  return (
    <Container size="xl" py="xl">
      <LoadingState />
    </Container>
  )
}

