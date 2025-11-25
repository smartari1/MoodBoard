/**
 * Admin Material Settings Page
 * Manage material categories and types
 *
 * PERFORMANCE OPTIMIZED:
 * - Uses lazy loading for tab content (only active tab renders/fetches data)
 * - keepMounted={false} ensures unmounted tabs don't hold memory
 * - Controlled tab state tracks which tabs have been visited
 */

'use client'

import { useState, useCallback, lazy, Suspense } from 'react'
import { Container, Title, Stack, Tabs, Text, Skeleton } from '@mantine/core'
import { useTranslations } from 'next-intl'
import { IconBox, IconCategory, IconTexture } from '@tabler/icons-react'
import { useParams } from 'next/navigation'

// Lazy load tab components to reduce initial bundle size
const MaterialCategoriesTab = lazy(() =>
  import('@/components/features/materials/MaterialCategoriesTab').then(m => ({ default: m.MaterialCategoriesTab }))
)
const MaterialTypesTab = lazy(() =>
  import('@/components/features/materials/MaterialTypesTab').then(m => ({ default: m.MaterialTypesTab }))
)
const TextureList = lazy(() =>
  import('@/components/features/textures/TextureList').then(m => ({ default: m.TextureList }))
)

// Loading skeleton for tabs
function TabSkeleton() {
  return (
    <Stack gap="md">
      <Skeleton height={40} width="30%" />
      <Skeleton height={60} />
      <Skeleton height={200} />
    </Stack>
  )
}

export default function AdminMaterialSettingsPage() {
  const t = useTranslations('admin.materials.settings')
  const params = useParams()
  const locale = params.locale as string

  // Track active tab - controlled state for lazy loading
  const [activeTab, setActiveTab] = useState<string | null>('categories')

  const handleTabChange = useCallback((value: string | null) => {
    setActiveTab(value)
  }, [])

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        {/* Header */}
        <div>
          <Title order={1} c="brand" mb="sm">
            {t('title')}
          </Title>
          <Text c="dimmed" size="lg">
            {t('description')}
          </Text>
        </div>

        {/* Tabs - with lazy loading */}
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          keepMounted={false} // Don't render hidden tabs
        >
          <Tabs.List>
            <Tabs.Tab value="categories" leftSection={<IconCategory size={16} />}>
              {t('categoriesTab')}
            </Tabs.Tab>
            <Tabs.Tab value="types" leftSection={<IconBox size={16} />}>
              {t('typesTab')}
            </Tabs.Tab>
            <Tabs.Tab value="textures" leftSection={<IconTexture size={16} />}>
              {locale === 'he' ? 'טקסטורות' : 'Textures'}
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="categories" pt="lg">
            <Suspense fallback={<TabSkeleton />}>
              <MaterialCategoriesTab />
            </Suspense>
          </Tabs.Panel>

          <Tabs.Panel value="types" pt="lg">
            <Suspense fallback={<TabSkeleton />}>
              <MaterialTypesTab />
            </Suspense>
          </Tabs.Panel>

          <Tabs.Panel value="textures" pt="lg">
            <Suspense fallback={<TabSkeleton />}>
              <TextureList />
            </Suspense>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  )
}

