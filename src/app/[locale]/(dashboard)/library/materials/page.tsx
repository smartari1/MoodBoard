'use client'

import { Container, Stack, TextInput, Group, Select, Box, Badge } from '@mantine/core'
import { IconBox, IconSearch, IconFilter } from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
import { usePathname } from 'next/navigation'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'

// Direct imports following design system
import { LoadingState } from '@/components/ui/LoadingState'
import { EmptyState } from '@/components/ui/EmptyState'
import { MoodBCard } from '@/components/ui/Card'
import { LibraryHero } from '@/components/features/library/LibraryHero'
import { LibraryGrid } from '@/components/features/library/LibraryGrid'

interface Material {
  id: string
  name: { he: string; en: string }
  sku?: string
  category: {
    id: string
    name: { he: string; en: string }
  }
  properties: {
    typeId: string
    subType: string
    finish: string[]
    texture: string
  }
  assets: {
    thumbnail: string
    images: string[]
  }
  isAbstract: boolean
}

interface MaterialCategory {
  id: string
  name: { he: string; en: string }
}

async function fetchMaterials(): Promise<{ data: Material[] }> {
  const res = await fetch('/api/admin/materials')
  if (!res.ok) throw new Error('Failed to fetch materials')
  return res.json()
}

async function fetchMaterialCategories(): Promise<{ data: MaterialCategory[] }> {
  const res = await fetch('/api/admin/material-categories')
  if (!res.ok) throw new Error('Failed to fetch material categories')
  return res.json()
}

export default function MaterialsPage() {
  const pathname = usePathname()
  const locale = (pathname?.split('/')[1] || 'he') as 'he' | 'en'
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)

  const { data: materialsData, isLoading: materialsLoading } = useQuery({
    queryKey: ['materials'],
    queryFn: fetchMaterials,
    staleTime: 5 * 60 * 1000,
  })

  const { data: categoriesData } = useQuery({
    queryKey: ['material-categories'],
    queryFn: fetchMaterialCategories,
    staleTime: 5 * 60 * 1000,
  })

  const materials = materialsData?.data || []
  const categories = categoriesData?.data || []

  const categoryOptions = useMemo(() => {
    return categories.map((cat) => ({
      value: cat.id,
      label: cat.name[locale],
    }))
  }, [categories, locale])

  const filteredMaterials = useMemo(() => {
    let filtered = materials

    if (categoryFilter) {
      filtered = filtered.filter((mat) => mat.category?.id === categoryFilter)
    }

    if (search.trim()) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(
        (mat) =>
          mat.name.he.toLowerCase().includes(searchLower) ||
          mat.name.en.toLowerCase().includes(searchLower) ||
          mat.properties?.subType?.toLowerCase().includes(searchLower)
      )
    }

    return filtered
  }, [materials, search, categoryFilter])

  return (
    <Stack gap={0}>
      <LibraryHero
        title="חומרים"
        subtitle="חומרי גלם וגימורים"
        description="גלו את כל החומרים הזמינים לעיצוב פנים - עץ, אבן, מתכת, טקסטיל ועוד. בחרו את החומרים המושלמים לפרויקט שלכם."
        icon={<IconBox size={28} />}
        count={materials.length}
        countLabel="חומרים"
        breadcrumbs={[
          { label: 'ספרייה', href: `/${locale}/library` },
          { label: 'חומרים', href: `/${locale}/library/materials` },
        ]}
      />

      <Container size="xl" py="xl">
        {/* Filters */}
        <Group justify="flex-end" mb="xl" gap="md">
          <Select
            placeholder="סנן לפי קטגוריה"
            leftSection={<IconFilter size={16} />}
            data={categoryOptions}
            value={categoryFilter}
            onChange={setCategoryFilter}
            clearable
            style={{ width: 200 }}
          />
          <TextInput
            placeholder="חיפוש חומר..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 280 }}
          />
        </Group>

        {materialsLoading ? (
          <LoadingState message="טוען חומרים..." />
        ) : filteredMaterials.length === 0 ? (
          <EmptyState
            title="לא נמצאו חומרים"
            description={search || categoryFilter ? 'נסו לשנות את הסינון' : 'אין חומרים זמינים'}
            icon={<IconBox size={48} />}
          />
        ) : (
          <LibraryGrid cols={{ base: 2, sm: 3, lg: 4, xl: 5 }}>
            {filteredMaterials.map((material) => (
              <MoodBCard
                key={material.id}
                component={Link}
                href={`/${locale}/library/materials/${material.id}`}
                padding={0}
                style={{
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => {
                  const target = e.currentTarget as HTMLElement
                  target.style.transform = 'scale(1.02)'
                  target.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)'
                }}
                onMouseLeave={(e) => {
                  const target = e.currentTarget as HTMLElement
                  target.style.transform = 'scale(1)'
                  target.style.boxShadow = 'none'
                }}
              >
                <Box pos="relative" style={{ aspectRatio: '1/1' }} bg="gray.1">
                  {material.assets?.thumbnail && (
                    <Image
                      src={material.assets.thumbnail}
                      alt={material.name[locale]}
                      fill
                      style={{ objectFit: 'cover' }}
                      sizes="(max-width: 768px) 50vw, 20vw"
                    />
                  )}
                  {material.isAbstract && (
                    <Badge
                      pos="absolute"
                      top={8}
                      right={8}
                      size="sm"
                      variant="filled"
                      color="violet"
                    >
                      AI
                    </Badge>
                  )}
                  <Badge
                    pos="absolute"
                    bottom={8}
                    left={8}
                    size="sm"
                    variant="filled"
                    color="dark"
                    style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.6)' }}
                  >
                    {material.category?.name?.[locale]}
                  </Badge>
                </Box>

                <Stack p="sm" gap={4}>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                    {material.name[locale]}
                  </span>
                  {material.properties?.subType && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--mantine-color-dimmed)' }}>
                      {material.properties.subType}
                    </span>
                  )}
                </Stack>
              </MoodBCard>
            ))}
          </LibraryGrid>
        )}
      </Container>
    </Stack>
  )
}
