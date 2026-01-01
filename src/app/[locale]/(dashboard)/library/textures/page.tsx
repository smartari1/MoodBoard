'use client'

import { Container, Stack, TextInput, Group, Select, Box, Badge } from '@mantine/core'
import { IconTexture, IconSearch, IconFilter, IconSparkles } from '@tabler/icons-react'
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

interface Texture {
  id: string
  name: { he: string; en: string }
  description?: { he: string; en: string }
  imageUrl?: string
  thumbnailUrl?: string
  finish?: string
  baseColor?: string
  usage: number
  materialCategories?: { materialCategory: { id: string; name: { he: string; en: string } } }[]
}

async function fetchTextures(): Promise<{ data: Texture[] }> {
  const res = await fetch('/api/admin/textures')
  if (!res.ok) throw new Error('Failed to fetch textures')
  return res.json()
}

const finishOptions = [
  { value: 'matte', label: 'מט' },
  { value: 'glossy', label: 'מבריק' },
  { value: 'satin', label: 'סאטן' },
  { value: 'rough', label: 'מחוספס' },
  { value: 'smooth', label: 'חלק' },
  { value: 'natural', label: 'טבעי' },
]

export default function TexturesPage() {
  const pathname = usePathname()
  const locale = (pathname?.split('/')[1] || 'he') as 'he' | 'en'
  const [search, setSearch] = useState('')
  const [finishFilter, setFinishFilter] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['textures'],
    queryFn: fetchTextures,
    staleTime: 5 * 60 * 1000,
  })

  const textures = data?.data || []

  const filteredTextures = useMemo(() => {
    let filtered = textures

    if (finishFilter) {
      filtered = filtered.filter((tex) => tex.finish === finishFilter)
    }

    if (search.trim()) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(
        (tex) =>
          tex.name.he.toLowerCase().includes(searchLower) ||
          tex.name.en.toLowerCase().includes(searchLower)
      )
    }

    return filtered
  }, [textures, search, finishFilter])

  return (
    <Stack gap={0}>
      <LibraryHero
        title="טקסטורות"
        subtitle="טקסטורות וגימורים"
        description="גלו את כל הטקסטורות הזמינות - עץ, אבן, בטון, מתכת ועוד. בחרו את הטקסטורה המושלמת לפרויקט שלכם."
        icon={<IconTexture size={28} />}
        count={textures.length}
        countLabel="טקסטורות"
        breadcrumbs={[
          { label: 'ספרייה', href: `/${locale}/library` },
          { label: 'טקסטורות', href: `/${locale}/library/textures` },
        ]}
      />

      <Container size="xl" py="xl">
        {/* Filters */}
        <Group justify="flex-end" mb="xl" gap="md">
          <Select
            placeholder="סנן לפי גימור"
            leftSection={<IconFilter size={16} />}
            data={finishOptions}
            value={finishFilter}
            onChange={setFinishFilter}
            clearable
            style={{ width: 160 }}
          />
          <TextInput
            placeholder="חיפוש טקסטורה..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 280 }}
          />
        </Group>

        {isLoading ? (
          <LoadingState message="טוען טקסטורות..." />
        ) : filteredTextures.length === 0 ? (
          <EmptyState
            title="לא נמצאו טקסטורות"
            description={search || finishFilter ? 'נסו לשנות את הסינון' : 'אין טקסטורות זמינות'}
            icon={<IconTexture size={48} />}
          />
        ) : (
          <LibraryGrid cols={{ base: 2, sm: 3, lg: 4, xl: 5 }}>
            {filteredTextures.map((texture) => (
              <MoodBCard
                key={texture.id}
                component={Link}
                href={`/${locale}/library/textures/${texture.id}`}
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
                  {(texture.imageUrl || texture.thumbnailUrl) && (
                    <Image
                      src={texture.thumbnailUrl || texture.imageUrl || ''}
                      alt={texture.name[locale]}
                      fill
                      style={{ objectFit: 'cover' }}
                      sizes="(max-width: 768px) 50vw, 20vw"
                    />
                  )}
                  {texture.finish && (
                    <Badge
                      pos="absolute"
                      top={8}
                      right={8}
                      size="sm"
                      variant="filled"
                      color="dark"
                      style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.6)' }}
                    >
                      {finishOptions.find((f) => f.value === texture.finish)?.label || texture.finish}
                    </Badge>
                  )}
                </Box>

                <Stack p="sm" gap={4}>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                    {texture.name[locale]}
                  </span>
                  <Group gap={4}>
                    <IconSparkles size={12} color="var(--mantine-color-brand-5)" />
                    <span style={{ fontSize: '0.75rem', color: 'var(--mantine-color-dimmed)' }}>
                      {texture.usage} סגנונות
                    </span>
                  </Group>
                </Stack>
              </MoodBCard>
            ))}
          </LibraryGrid>
        )}
      </Container>
    </Stack>
  )
}
