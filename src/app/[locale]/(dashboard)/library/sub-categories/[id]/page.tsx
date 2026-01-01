'use client'

import { Container, Stack, Text, Button, Group, Badge, SimpleGrid, Box } from '@mantine/core'
import { IconCategory2, IconSparkles } from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
import { usePathname, useParams } from 'next/navigation'
import Link from 'next/link'
import NextImage from 'next/image'

// Direct imports following design system
import { LoadingState } from '@/components/ui/LoadingState'
import { EmptyState } from '@/components/ui/EmptyState'
import { MoodBCard } from '@/components/ui/Card'
import { LibraryHero } from '@/components/features/library/LibraryHero'

interface Style {
  id: string
  name: { he: string; en: string }
  slug: string
  images?: { url: string }[]
  gallery?: { url: string }[]
  color?: {
    id: string
    name: { he: string; en: string }
    hex: string
  }
}

interface SubCategory {
  id: string
  name: { he: string; en: string }
  description?: { he: string; en: string }
  slug: string
  images: string[]
  category: {
    id: string
    name: { he: string; en: string }
  }
  styles: Style[]
  detailedContent?: {
    he?: { introduction?: string; characteristics?: string[] }
    en?: { introduction?: string; characteristics?: string[] }
  }
}

async function fetchSubCategory(id: string): Promise<SubCategory> {
  const res = await fetch(`/api/admin/sub-categories/${id}`)
  if (!res.ok) throw new Error('Failed to fetch sub-category')
  return res.json()
}

export default function SubCategoryDetailPage() {
  const pathname = usePathname()
  const params = useParams()
  const locale = (pathname?.split('/')[1] || 'he') as 'he' | 'en'
  const subCategoryId = params?.id as string

  const { data: subCategory, isLoading } = useQuery({
    queryKey: ['sub-category', subCategoryId],
    queryFn: () => fetchSubCategory(subCategoryId),
    enabled: !!subCategoryId,
    staleTime: 5 * 60 * 1000,
  })

  if (isLoading) {
    return (
      <Container size="xl" py="xl">
        <LoadingState message="טוען תת-קטגוריה..." />
      </Container>
    )
  }

  if (!subCategory) {
    return (
      <Container size="xl" py="xl">
        <EmptyState
          title="תת-קטגוריה לא נמצאה"
          description="תת-הקטגוריה המבוקשת לא קיימת או נמחקה"
          icon={<IconCategory2 size={48} />}
        />
      </Container>
    )
  }

  const characteristics = subCategory.detailedContent?.[locale]?.characteristics || []

  return (
    <Stack gap={0}>
      <LibraryHero
        title={subCategory.name[locale]}
        subtitle={subCategory.category?.name?.[locale]}
        description={
          subCategory.detailedContent?.[locale]?.introduction || subCategory.description?.[locale]
        }
        imageUrl={subCategory.images?.[0]}
        icon={<IconCategory2 size={28} />}
        count={subCategory.styles?.length || 0}
        countLabel="סגנונות"
        breadcrumbs={[
          { label: 'ספרייה', href: `/${locale}/library` },
          { label: 'תתי-קטגוריות', href: `/${locale}/library/sub-categories` },
          {
            label: subCategory.category?.name?.[locale] || '',
            href: `/${locale}/library/categories/${subCategory.category?.id}`,
          },
          { label: subCategory.name[locale], href: `/${locale}/library/sub-categories/${subCategory.id}` },
        ]}
      >
        <Button
          component={Link}
          href={`/${locale}/ai-studio?subCategoryId=${subCategory.id}`}
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
            <Text fw={600} mb="md">
              מאפיינים עיקריים
            </Text>
            <Group gap="sm">
              {characteristics.map((char, index) => (
                <Badge key={index} size="lg" variant="light" color="brand" radius="md">
                  {char}
                </Badge>
              ))}
            </Group>
          </MoodBCard>
        )}

        {/* Styles */}
        <Group justify="space-between" align="center" mb="lg">
          <Text size="xl" fw={700}>
            סגנונות
          </Text>
          <Badge size="lg" variant="light" color="gray">
            {subCategory.styles?.length || 0}
          </Badge>
        </Group>

        {subCategory.styles?.length === 0 ? (
          <EmptyState
            title="אין סגנונות"
            description="לא נמצאו סגנונות בתת-קטגוריה זו"
            icon={<IconCategory2 size={48} />}
            action={{
              label: 'צור סגנון חדש',
              onClick: () => window.location.href = `/${locale}/ai-studio?subCategoryId=${subCategory.id}`,
            }}
          />
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing="lg">
            {subCategory.styles.map((style) => {
              const imageUrl = style.images?.[0]?.url || style.gallery?.[0]?.url

              return (
                <MoodBCard
                  key={style.id}
                  component={Link}
                  href={`/${locale}/styles/${style.slug}`}
                  padding={0}
                  style={{
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={(e) => {
                    const target = e.currentTarget as HTMLElement
                    target.style.transform = 'translateY(-4px)'
                    target.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)'
                  }}
                  onMouseLeave={(e) => {
                    const target = e.currentTarget as HTMLElement
                    target.style.transform = 'translateY(0)'
                    target.style.boxShadow = 'none'
                  }}
                >
                  <Box pos="relative" h={180} bg="gray.1">
                    {imageUrl && (
                      <NextImage
                        src={imageUrl}
                        alt={style.name[locale]}
                        fill
                        style={{ objectFit: 'cover' }}
                        sizes="(max-width: 768px) 100vw, 25vw"
                      />
                    )}
                  </Box>

                  <Stack p="md" gap="xs">
                    <Text fw={600} lineClamp={1}>
                      {style.name[locale]}
                    </Text>
                    {style.color && (
                      <Group gap="xs">
                        <Box
                          style={{
                            width: 16,
                            height: 16,
                            borderRadius: 4,
                            backgroundColor: style.color.hex,
                            border: '1px solid var(--mantine-color-gray-3)',
                          }}
                        />
                        <Text size="sm" c="dimmed">
                          {style.color.name[locale]}
                        </Text>
                      </Group>
                    )}
                  </Stack>
                </MoodBCard>
              )
            })}
          </SimpleGrid>
        )}
      </Container>
    </Stack>
  )
}
