'use client'

import { Container, Stack, Text, TextInput, Group, Box, Badge, Tabs } from '@mantine/core'
import { IconPalette, IconSearch, IconSparkles } from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
import { usePathname } from 'next/navigation'
import { useState, useMemo } from 'react'
import Link from 'next/link'

// Direct imports following design system
import { LoadingState } from '@/components/ui/LoadingState'
import { EmptyState } from '@/components/ui/EmptyState'
import { MoodBCard } from '@/components/ui/Card'
import { LibraryHero } from '@/components/features/library/LibraryHero'
import { LibraryGrid } from '@/components/features/library/LibraryGrid'

interface Color {
  id: string
  name: { he: string; en: string }
  description?: { he: string; en: string }
  hex: string
  category: string // neutral, accent, semantic
  role?: string
  usage: number
}

async function fetchColors(): Promise<{ data: Color[] }> {
  const res = await fetch('/api/admin/colors')
  if (!res.ok) throw new Error('Failed to fetch colors')
  return res.json()
}

const categoryLabels: Record<string, string> = {
  neutral: 'ניטרלי',
  accent: 'אקסנט',
  semantic: 'סמנטי',
}

export default function ColorsPage() {
  const pathname = usePathname()
  const locale = (pathname?.split('/')[1] || 'he') as 'he' | 'en'
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['colors'],
    queryFn: fetchColors,
    staleTime: 5 * 60 * 1000,
  })

  const colors = data?.data || []

  // Group colors by category
  const groupedColors = useMemo(() => {
    const groups: Record<string, Color[]> = {
      neutral: [],
      accent: [],
      semantic: [],
    }
    colors.forEach((color) => {
      if (groups[color.category]) {
        groups[color.category].push(color)
      }
    })
    return groups
  }, [colors])

  const filteredColors = useMemo(() => {
    let filtered = activeCategory ? groupedColors[activeCategory] || [] : colors

    if (search.trim()) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(
        (color) =>
          color.name.he.toLowerCase().includes(searchLower) ||
          color.name.en.toLowerCase().includes(searchLower) ||
          color.hex.toLowerCase().includes(searchLower)
      )
    }

    return filtered
  }, [colors, groupedColors, search, activeCategory])

  // Calculate if color is light or dark for text contrast
  const isLightColor = (hex: string) => {
    const c = hex.substring(1)
    const rgb = parseInt(c, 16)
    const r = (rgb >> 16) & 0xff
    const g = (rgb >> 8) & 0xff
    const b = (rgb >> 0) & 0xff
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b
    return luma > 128
  }

  return (
    <Stack gap={0}>
      <LibraryHero
        title="פלטת צבעים"
        subtitle="צבעים לעיצוב פנים"
        description="גלו את כל הצבעים בפלטה שלנו - ניטרליים, אקסנטים וסמנטיים. בחרו את הצבעים המושלמים לפרויקט שלכם."
        icon={<IconPalette size={28} />}
        count={colors.length}
        countLabel="צבעים"
        breadcrumbs={[
          { label: 'ספרייה', href: `/${locale}/library` },
          { label: 'צבעים', href: `/${locale}/library/colors` },
        ]}
      />

      <Container size="xl" py="xl">
        {/* Category Tabs */}
        <Tabs
          value={activeCategory}
          onChange={setActiveCategory}
          mb="xl"
          variant="pills"
          color="brand"
        >
          <Group justify="space-between" align="flex-end">
            <Tabs.List>
              <Tabs.Tab value={null as unknown as string}>הכל ({colors.length})</Tabs.Tab>
              <Tabs.Tab value="neutral">ניטרלי ({groupedColors.neutral.length})</Tabs.Tab>
              <Tabs.Tab value="accent">אקסנט ({groupedColors.accent.length})</Tabs.Tab>
              <Tabs.Tab value="semantic">סמנטי ({groupedColors.semantic.length})</Tabs.Tab>
            </Tabs.List>

            <TextInput
              placeholder="חיפוש צבע..."
              leftSection={<IconSearch size={16} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 280 }}
            />
          </Group>
        </Tabs>

        {isLoading ? (
          <LoadingState message="טוען צבעים..." />
        ) : filteredColors.length === 0 ? (
          <EmptyState
            title="לא נמצאו צבעים"
            description={search || activeCategory ? 'נסו לשנות את הסינון' : 'אין צבעים זמינים'}
            icon={<IconPalette size={48} />}
          />
        ) : (
          <LibraryGrid cols={{ base: 2, sm: 3, md: 4, lg: 5, xl: 6 }}>
            {filteredColors.map((color) => {
              const isLight = isLightColor(color.hex)
              return (
                <MoodBCard
                  key={color.id}
                  component={Link}
                  href={`/${locale}/library/colors/${color.id}`}
                  padding={0}
                  style={{
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={(e) => {
                    const target = e.currentTarget as HTMLElement
                    target.style.transform = 'scale(1.03)'
                    target.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)'
                  }}
                  onMouseLeave={(e) => {
                    const target = e.currentTarget as HTMLElement
                    target.style.transform = 'scale(1)'
                    target.style.boxShadow = 'none'
                  }}
                >
                  <Box
                    style={{
                      aspectRatio: '1/1',
                      backgroundColor: color.hex,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                    }}
                  >
                    <Text
                      size="xs"
                      fw={600}
                      c={isLight ? 'dark' : 'white'}
                      style={{
                        opacity: 0.7,
                        textTransform: 'uppercase',
                        letterSpacing: 1,
                      }}
                    >
                      {color.hex}
                    </Text>

                    <Badge
                      pos="absolute"
                      top={8}
                      right={8}
                      size="xs"
                      variant="filled"
                      color={isLight ? 'dark' : 'white'}
                      c={isLight ? 'white' : 'dark'}
                    >
                      {categoryLabels[color.category] || color.category}
                    </Badge>
                  </Box>

                  <Stack p="sm" gap={4} bg="white">
                    <Text fw={600} size="sm" lineClamp={1}>
                      {color.name[locale]}
                    </Text>
                    <Group gap={4}>
                      <IconSparkles size={12} color="var(--mantine-color-brand-5)" />
                      <Text size="xs" c="dimmed">
                        {color.usage} סגנונות
                      </Text>
                    </Group>
                  </Stack>
                </MoodBCard>
              )
            })}
          </LibraryGrid>
        )}
      </Container>
    </Stack>
  )
}
