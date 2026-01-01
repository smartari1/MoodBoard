'use client'

import { Container, Stack, Text, Button, Group, Badge, Paper } from '@mantine/core'
import { IconCategory, IconSparkles } from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
import { usePathname, useParams } from 'next/navigation'
import Link from 'next/link'

// Direct imports following design system
import { LoadingState } from '@/components/ui/LoadingState'
import { EmptyState } from '@/components/ui/EmptyState'
import { MoodBCard } from '@/components/ui/Card'
import { LibraryHero } from '@/components/features/library/LibraryHero'
import { LibraryGrid } from '@/components/features/library/LibraryGrid'
import { LibraryCard } from '@/components/features/library/LibraryCard'

interface SubCategory {
  id: string
  name: { he: string; en: string }
  description?: { he: string; en: string }
  slug: string
  images: string[]
  _count?: { styles: number }
}

interface Category {
  id: string
  name: { he: string; en: string }
  description?: { he: string; en: string }
  slug: string
  images: string[]
  subCategories: SubCategory[]
  detailedContent?: {
    he?: { introduction?: string; characteristics?: string[] }
    en?: { introduction?: string; characteristics?: string[] }
  }
}

async function fetchCategory(id: string): Promise<Category> {
  const res = await fetch(`/api/admin/categories/${id}`)
  if (!res.ok) throw new Error('Failed to fetch category')
  return res.json()
}

export default function CategoryDetailPage() {
  const pathname = usePathname()
  const params = useParams()
  const locale = (pathname?.split('/')[1] || 'he') as 'he' | 'en'
  const categoryId = params?.id as string

  const { data: category, isLoading } = useQuery({
    queryKey: ['category', categoryId],
    queryFn: () => fetchCategory(categoryId),
    enabled: !!categoryId,
    staleTime: 5 * 60 * 1000,
  })

  if (isLoading) {
    return (
      <Container size="xl" py="xl">
        <LoadingState message="טוען קטגוריה..." />
      </Container>
    )
  }

  if (!category) {
    return (
      <Container size="xl" py="xl">
        <EmptyState
          title="קטגוריה לא נמצאה"
          description="הקטגוריה המבוקשת לא קיימת או נמחקה"
          icon={<IconCategory size={48} />}
        />
      </Container>
    )
  }

  const characteristics = category.detailedContent?.[locale]?.characteristics || []

  return (
    <Stack gap={0}>
      <LibraryHero
        title={category.name[locale]}
        subtitle={category.description?.[locale]}
        description={category.detailedContent?.[locale]?.introduction}
        imageUrl={category.images?.[0]}
        icon={<IconCategory size={28} />}
        count={category.subCategories?.length || 0}
        countLabel="תתי-קטגוריות"
        breadcrumbs={[
          { label: 'ספרייה', href: `/${locale}/library` },
          { label: 'קטגוריות', href: `/${locale}/library/categories` },
          { label: category.name[locale], href: `/${locale}/library/categories/${category.id}` },
        ]}
      >
        <Button
          component={Link}
          href={`/${locale}/ai-studio?categoryId=${category.id}`}
          variant="white"
          size="md"
          leftSection={<IconSparkles size={18} />}
          style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}
        >
          צור סגנון עם AI
        </Button>
      </LibraryHero>

      <Container size="xl" py="xl">
        {/* Characteristics */}
        {characteristics.length > 0 && (
          <MoodBCard mb="xl" bg="gray.0">
            <Text fw={600} mb="md">מאפיינים עיקריים</Text>
            <Group gap="sm">
              {characteristics.map((char, index) => (
                <Badge key={index} size="lg" variant="light" color="brand" radius="md">
                  {char}
                </Badge>
              ))}
            </Group>
          </MoodBCard>
        )}

        {/* Sub-Categories */}
        <Group justify="space-between" align="center" mb="lg">
          <Text size="xl" fw={700}>תתי-קטגוריות</Text>
          <Badge size="lg" variant="light" color="gray">
            {category.subCategories?.length || 0}
          </Badge>
        </Group>

        {category.subCategories?.length === 0 ? (
          <EmptyState
            title="אין תתי-קטגוריות"
            description="לא נמצאו תתי-קטגוריות בקטגוריה זו"
            icon={<IconCategory size={48} />}
          />
        ) : (
          <LibraryGrid cols={{ base: 1, sm: 2, lg: 3 }}>
            {category.subCategories.map((subCategory) => (
              <LibraryCard
                key={subCategory.id}
                title={subCategory.name[locale]}
                subtitle={subCategory.description?.[locale]}
                imageUrl={subCategory.images?.[0]}
                href={`/${locale}/library/sub-categories/${subCategory.id}`}
                count={subCategory._count?.styles || 0}
                countLabel="סגנונות"
              />
            ))}
          </LibraryGrid>
        )}
      </Container>
    </Stack>
  )
}
