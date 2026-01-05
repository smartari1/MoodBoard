'use client'

import { Container, Stack, Text, Button, Group, Badge, SimpleGrid, Box } from '@mantine/core'
import { IconTexture } from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
import { usePathname, useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

// Direct imports following design system
import { LoadingState } from '@/components/ui/LoadingState'
import { EmptyState } from '@/components/ui/EmptyState'
import { MoodBCard } from '@/components/ui/Card'
import { LibraryHero } from '@/components/features/library/LibraryHero'

interface Texture {
  id: string
  name: { he: string; en: string }
  description?: { he: string; en: string }
  imageUrl?: string
  thumbnailUrl?: string
  finish?: string
  sheen?: string
  baseColor?: string
  usage: number
  tags: string[]
  materialCategories?: { materialCategory: { id: string; name: { he: string; en: string } } }[]
  styleLinks?: { style: { id: string; name: { he: string; en: string }; slug: string; gallery?: { url: string }[] } }[]
}

async function fetchTexture(id: string): Promise<Texture> {
  const res = await fetch(`/api/admin/textures/${id}`)
  if (!res.ok) throw new Error('Failed to fetch texture')
  return res.json()
}

const finishLabels: Record<string, string> = {
  matte: 'מט',
  glossy: 'מבריק',
  satin: 'סאטן',
  rough: 'מחוספס',
  smooth: 'חלק',
  natural: 'טבעי',
}

const sheenLabels: Record<string, string> = {
  flat: 'שטוח',
  eggshell: 'ביצה',
  'semi-gloss': 'חצי מבריק',
  'high-gloss': 'מבריק מאוד',
}

export default function TextureDetailPage() {
  const pathname = usePathname()
  const params = useParams()
  const locale = (pathname?.split('/')[1] || 'he') as 'he' | 'en'
  const textureId = params?.id as string

  const { data: texture, isLoading } = useQuery({
    queryKey: ['texture', textureId],
    queryFn: () => fetchTexture(textureId),
    enabled: !!textureId,
    staleTime: 5 * 60 * 1000,
  })

  if (isLoading) {
    return (
      <Container size="xl" py="xl">
        <LoadingState message="טוען טקסטורה..." />
      </Container>
    )
  }

  if (!texture) {
    return (
      <Container size="xl" py="xl">
        <EmptyState
          title="טקסטורה לא נמצאה"
          description="הטקסטורה המבוקשת לא קיימת או נמחקה"
          icon={<IconTexture size={48} />}
        />
      </Container>
    )
  }

  const categories = texture.materialCategories?.map((mc) => mc.materialCategory) || []
  const styles = texture.styleLinks?.map((sl) => sl.style) || []

  return (
    <Stack gap={0}>
      <LibraryHero
        title={texture.name[locale]}
        description={texture.description?.[locale]}
        imageUrl={texture.imageUrl || texture.thumbnailUrl}
        icon={<IconTexture size={28} />}
        count={texture.usage}
        countLabel="סגנונות משתמשים"
        breadcrumbs={[
          { label: 'ספרייה', href: `/${locale}/library` },
          { label: 'טקסטורות', href: `/${locale}/library/textures` },
          { label: texture.name[locale], href: `/${locale}/library/textures/${texture.id}` },
        ]}
      />

      <Container size="xl" py="xl">
        {/* Properties */}
        <MoodBCard mb="xl" bg="gray.0">
          <Text fw={600} mb="md">
            מאפיינים
          </Text>
          <Group gap="md">
            {texture.finish && (
              <Badge size="lg" variant="light" color="brand" radius="md">
                גימור: {finishLabels[texture.finish] || texture.finish}
              </Badge>
            )}
            {texture.sheen && (
              <Badge size="lg" variant="light" color="blue" radius="md">
                ברק: {sheenLabels[texture.sheen] || texture.sheen}
              </Badge>
            )}
            {texture.baseColor && (
              <Group gap="xs">
                <Box
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    backgroundColor: texture.baseColor,
                    border: '2px solid var(--mantine-color-gray-3)',
                  }}
                />
                <Text size="sm">{texture.baseColor}</Text>
              </Group>
            )}
          </Group>

          {/* Tags */}
          {texture.tags && texture.tags.length > 0 && (
            <Group gap="xs" mt="md">
              {texture.tags.map((tag, index) => (
                <Badge key={index} size="sm" variant="outline" color="gray">
                  {tag}
                </Badge>
              ))}
            </Group>
          )}

          {/* Categories */}
          {categories.length > 0 && (
            <>
              <Text fw={600} mt="lg" mb="sm">
                קטגוריות חומרים
              </Text>
              <Group gap="xs">
                {categories.map((cat) => (
                  <Badge key={cat.id} size="md" variant="light" color="violet">
                    {cat.name[locale]}
                  </Badge>
                ))}
              </Group>
            </>
          )}
        </MoodBCard>

        {/* Related Styles */}
        <Group justify="space-between" align="center" mb="lg">
          <Text size="xl" fw={700}>
            סגנונות שמשתמשים בטקסטורה
          </Text>
          <Badge size="lg" variant="light" color="gray">
            {styles.length}
          </Badge>
        </Group>

        {styles.length === 0 ? (
          <EmptyState
            title="אין סגנונות"
            description="לא נמצאו סגנונות שמשתמשים בטקסטורה זו"
            icon={<IconTexture size={48} />}
          />
        ) : (
          <SimpleGrid cols={{ base: 2, sm: 3, lg: 4, xl: 5 }} spacing="md">
            {styles.map((style) => (
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
                <Box pos="relative" h={120} bg="gray.1">
                  {style.gallery?.[0]?.url && (
                    <Image
                      src={style.gallery[0].url}
                      alt={style.name[locale]}
                      fill
                      style={{ objectFit: 'cover' }}
                      sizes="(max-width: 768px) 50vw, 20vw"
                    />
                  )}
                </Box>
                <Box p="sm">
                  <Text size="sm" fw={500} lineClamp={1}>
                    {style.name[locale]}
                  </Text>
                </Box>
              </MoodBCard>
            ))}
          </SimpleGrid>
        )}
      </Container>
    </Stack>
  )
}
