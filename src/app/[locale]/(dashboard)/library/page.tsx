'use client'

import { Container, Title, Text, Stack, SimpleGrid, Box, Group, ThemeIcon } from '@mantine/core'
import {
  IconCategory,
  IconCategory2,
  IconTexture,
  IconPalette,
  IconBox,
  IconSparkles,
  IconLibrary,
} from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
import { usePathname } from 'next/navigation'

// Direct imports following design system
import { LoadingState } from '@/components/ui/LoadingState'
import { CollectionCard } from '@/components/features/library/CollectionCard'

// Fetch counts for all collections
async function fetchLibraryCounts() {
  const [categories, subCategories, textures, colors, materials] = await Promise.all([
    fetch('/api/admin/categories').then((res) => res.json()),
    fetch('/api/admin/sub-categories').then((res) => res.json()),
    fetch('/api/admin/textures').then((res) => res.json()),
    fetch('/api/admin/colors').then((res) => res.json()),
    fetch('/api/admin/materials').then((res) => res.json()),
  ])

  return {
    categories: categories.data?.length || 0,
    subCategories: subCategories.data?.length || subCategories.pagination?.total || 0,
    textures: textures.data?.length || textures.pagination?.total || 0,
    colors: colors.data?.length || colors.pagination?.total || 0,
    materials: materials.data?.length || materials.pagination?.total || 0,
  }
}

export default function LibraryPage() {
  const pathname = usePathname()
  const locale = pathname?.split('/')[1] || 'he'

  const { data: counts, isLoading } = useQuery({
    queryKey: ['library-counts'],
    queryFn: fetchLibraryCounts,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const collections = [
    {
      title: 'קטגוריות',
      count: counts?.categories || 0,
      countLabel: 'סגנונות עיצוב ראשיים',
      icon: <IconCategory size={28} color="white" />,
      href: `/${locale}/library/categories`,
      gradient: { from: '#667eea', to: '#764ba2' },
    },
    {
      title: 'תתי-קטגוריות',
      count: counts?.subCategories || 0,
      countLabel: 'סגנונות עיצוב מפורטים',
      icon: <IconCategory2 size={28} color="white" />,
      href: `/${locale}/library/sub-categories`,
      gradient: { from: '#f093fb', to: '#f5576c' },
    },
    {
      title: 'טקסטורות',
      count: counts?.textures || 0,
      countLabel: 'טקסטורות וגימורים',
      icon: <IconTexture size={28} color="white" />,
      href: `/${locale}/library/textures`,
      gradient: { from: '#4facfe', to: '#00f2fe' },
    },
    {
      title: 'צבעים',
      count: counts?.colors || 0,
      countLabel: 'פלטת צבעים',
      icon: <IconPalette size={28} color="white" />,
      href: `/${locale}/library/colors`,
      gradient: { from: '#43e97b', to: '#38f9d7' },
    },
    {
      title: 'חומרים',
      count: counts?.materials || 0,
      countLabel: 'חומרי גלם וגימורים',
      icon: <IconBox size={28} color="white" />,
      href: `/${locale}/library/materials`,
      gradient: { from: '#fa709a', to: '#fee140' },
    },
  ]

  return (
    <Stack gap={0}>
      {/* Hero Section */}
      <Box
        py={60}
        style={{
          backgroundColor: 'var(--mantine-color-brand-5)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative Elements */}
        <Box
          pos="absolute"
          top={-100}
          right={-100}
          style={{
            width: 300,
            height: 300,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
          }}
        />
        <Box
          pos="absolute"
          bottom={-100}
          left={-100}
          style={{
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)',
          }}
        />

        <Container size="xl" pos="relative">
          <Stack align="center" gap="lg">
            <ThemeIcon
              size={72}
              radius="xl"
              color="white"
              variant="filled"
              style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}
            >
              <IconLibrary size={36} color="var(--mantine-color-brand-5)" />
            </ThemeIcon>

            <Title order={1} c="white" ta="center" size="h1">
              ספריית העיצוב
            </Title>

            <Text c="rgba(255,255,255,0.9)" ta="center" size="lg" maw={600}>
              גלו את כל מרכיבי העיצוב שלנו - קטגוריות, טקסטורות, צבעים וחומרים.
              בחרו את המרכיבים המושלמים ליצירת הסגנון שלכם.
            </Text>

            <Group gap="xs" mt="sm">
              <ThemeIcon size="sm" radius="xl" color="white" variant="filled">
                <IconSparkles size={12} color="var(--mantine-color-brand-5)" />
              </ThemeIcon>
              <Text size="sm" c="rgba(255,255,255,0.8)">
                התחילו מכל קולקציה והמשיכו ל-AI Studio
              </Text>
            </Group>
          </Stack>
        </Container>
      </Box>

      {/* Collections Grid */}
      <Container size="xl" py="xl">
        {isLoading ? (
          <LoadingState message="טוען קולקציות..." />
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
            {collections.map((collection, index) => (
              <CollectionCard key={index} {...collection} />
            ))}
          </SimpleGrid>
        )}
      </Container>

      {/* Bottom CTA */}
      <Box py={48} bg="gray.0">
        <Container size="xl">
          <Stack align="center" gap="md">
            <Title order={2} ta="center">
              מוכנים ליצור?
            </Title>
            <Text c="dimmed" ta="center" maw={500}>
              בחרו מרכיבים מהספרייה והמשיכו ל-AI Studio ליצירת תמונות עיצוב מותאמות אישית
            </Text>
          </Stack>
        </Container>
      </Box>
    </Stack>
  )
}
