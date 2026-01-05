'use client'

import {
  Container,
  Stack,
  Text,
  Button,
  Group,
  Badge,
  SimpleGrid,
  Box,
} from '@mantine/core'
import { IconBox } from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
import { usePathname, useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

// Direct imports following design system
import { LoadingState } from '@/components/ui/LoadingState'
import { EmptyState } from '@/components/ui/EmptyState'
import { MoodBCard } from '@/components/ui/Card'
import { LibraryHero } from '@/components/features/library/LibraryHero'

interface Material {
  id: string
  name: { he: string; en: string }
  sku?: string
  isAbstract: boolean
  category: {
    id: string
    name: { he: string; en: string }
  }
  properties: {
    typeId: string
    subType: string
    finish: string[]
    texture: string
    dimensions?: {
      width?: number
      height?: number
      thickness?: number
      unit?: string
    }
    technical?: {
      durability: number
      maintenance: number
      sustainability: number
    }
  }
  assets: {
    thumbnail: string
    images: string[]
  }
  texture?: {
    id: string
    name: { he: string; en: string }
    thumbnailUrl?: string
  }
  styleLinks?: {
    style: {
      id: string
      name: { he: string; en: string }
      slug: string
      gallery?: { url: string }[]
    }
  }[]
  suppliers?: {
    id: string
    organization: {
      id: string
      name: string
    }
    pricing?: {
      basePrice: number
      currency: string
    }
  }[]
}

async function fetchMaterial(id: string): Promise<Material> {
  const res = await fetch(`/api/admin/materials/${id}`)
  if (!res.ok) throw new Error('Failed to fetch material')
  return res.json()
}

const finishLabels: Record<string, string> = {
  matte: 'מט',
  glossy: 'מבריק',
  satin: 'סאטן',
  rough: 'מחוספס',
  smooth: 'חלק',
  natural: 'טבעי',
  polished: 'מלוטש',
  brushed: 'מוברש',
}

export default function MaterialDetailPage() {
  const pathname = usePathname()
  const params = useParams()
  const locale = (pathname?.split('/')[1] || 'he') as 'he' | 'en'
  const materialId = params?.id as string

  const { data: material, isLoading } = useQuery({
    queryKey: ['material', materialId],
    queryFn: () => fetchMaterial(materialId),
    enabled: !!materialId,
    staleTime: 5 * 60 * 1000,
  })

  if (isLoading) {
    return (
      <Container size="xl" py="xl">
        <LoadingState message="טוען חומר..." />
      </Container>
    )
  }

  if (!material) {
    return (
      <Container size="xl" py="xl">
        <EmptyState
          title="חומר לא נמצא"
          description="החומר המבוקש לא קיים או נמחק"
          icon={<IconBox size={48} />}
        />
      </Container>
    )
  }

  const styles = material.styleLinks?.map((sl) => sl.style) || []
  const suppliers = material.suppliers || []

  return (
    <Stack gap={0}>
      <LibraryHero
        title={material.name[locale]}
        subtitle={material.category?.name?.[locale]}
        description={material.properties?.subType}
        imageUrl={material.assets?.thumbnail}
        icon={<IconBox size={28} />}
        count={styles.length}
        countLabel="סגנונות משתמשים"
        breadcrumbs={[
          { label: 'ספרייה', href: `/${locale}/library` },
          { label: 'חומרים', href: `/${locale}/library/materials` },
          { label: material.name[locale], href: `/${locale}/library/materials/${material.id}` },
        ]}
      />

      <Container size="xl" py="xl">
        {/* Material Info */}
        <MoodBCard mb="xl">
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xl">
            {/* Material Image */}
            <Box
              pos="relative"
              style={{
                aspectRatio: '16/9',
                borderRadius: 'var(--mantine-radius-lg)',
                overflow: 'hidden',
                backgroundColor: 'var(--mantine-color-gray-1)',
              }}
            >
              {material.assets?.images?.[0] && (
                <Image
                  src={material.assets.images[0]}
                  alt={material.name[locale]}
                  fill
                  style={{ objectFit: 'cover' }}
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              )}
              {material.isAbstract && (
                <Badge
                  pos="absolute"
                  top={12}
                  right={12}
                  size="lg"
                  variant="filled"
                  color="violet"
                >
                  AI Generated
                </Badge>
              )}
            </Box>

            {/* Material Details */}
            <Stack gap="md">
              {material.sku && (
                <div>
                  <Text size="sm" c="dimmed" mb={4}>
                    מק״ט
                  </Text>
                  <Text size="lg" fw={600} style={{ fontFamily: 'monospace' }}>
                    {material.sku}
                  </Text>
                </div>
              )}

              <div>
                <Text size="sm" c="dimmed" mb={4}>
                  קטגוריה
                </Text>
                <Badge size="lg" variant="light" color="brand">
                  {material.category?.name?.[locale]}
                </Badge>
              </div>

              {material.properties?.subType && (
                <div>
                  <Text size="sm" c="dimmed" mb={4}>
                    סוג משנה
                  </Text>
                  <Text size="lg" fw={500}>
                    {material.properties.subType}
                  </Text>
                </div>
              )}

              {/* Finishes */}
              {material.properties?.finish && material.properties.finish.length > 0 && (
                <div>
                  <Text size="sm" c="dimmed" mb={4}>
                    גימורים
                  </Text>
                  <Group gap="xs">
                    {material.properties.finish.map((finish, index) => (
                      <Badge key={index} size="md" variant="light" color="blue">
                        {finishLabels[finish] || finish}
                      </Badge>
                    ))}
                  </Group>
                </div>
              )}

              {/* Texture */}
              {material.properties?.texture && (
                <div>
                  <Text size="sm" c="dimmed" mb={4}>
                    טקסטורה
                  </Text>
                  <Badge size="md" variant="light" color="violet">
                    {material.properties.texture}
                  </Badge>
                </div>
              )}

              {/* Dimensions */}
              {material.properties?.dimensions && (
                <div>
                  <Text size="sm" c="dimmed" mb={4}>
                    מידות
                  </Text>
                  <Group gap="md">
                    {material.properties.dimensions.width && (
                      <Text size="sm">
                        רוחב: {material.properties.dimensions.width}
                        {material.properties.dimensions.unit || 'mm'}
                      </Text>
                    )}
                    {material.properties.dimensions.height && (
                      <Text size="sm">
                        גובה: {material.properties.dimensions.height}
                        {material.properties.dimensions.unit || 'mm'}
                      </Text>
                    )}
                    {material.properties.dimensions.thickness && (
                      <Text size="sm">
                        עובי: {material.properties.dimensions.thickness}
                        {material.properties.dimensions.unit || 'mm'}
                      </Text>
                    )}
                  </Group>
                </div>
              )}
            </Stack>
          </SimpleGrid>
        </MoodBCard>

        {/* Technical Specs */}
        {material.properties?.technical && (
          <MoodBCard mb="xl" bg="gray.0">
            <Text fw={600} mb="md">
              מפרט טכני
            </Text>
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg">
              <div>
                <Text size="sm" c="dimmed" mb={4}>
                  עמידות
                </Text>
                <Group gap="xs">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <Box
                      key={i}
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 2,
                        backgroundColor:
                          i < material.properties.technical!.durability
                            ? 'var(--mantine-color-brand-5)'
                            : 'var(--mantine-color-gray-3)',
                      }}
                    />
                  ))}
                  <Text size="sm" c="dimmed" ms="xs">
                    {material.properties.technical.durability}/10
                  </Text>
                </Group>
              </div>

              <div>
                <Text size="sm" c="dimmed" mb={4}>
                  תחזוקה
                </Text>
                <Group gap="xs">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <Box
                      key={i}
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 2,
                        backgroundColor:
                          i < material.properties.technical!.maintenance
                            ? 'var(--mantine-color-blue-5)'
                            : 'var(--mantine-color-gray-3)',
                      }}
                    />
                  ))}
                  <Text size="sm" c="dimmed" ms="xs">
                    {material.properties.technical.maintenance}/10
                  </Text>
                </Group>
              </div>

              <div>
                <Text size="sm" c="dimmed" mb={4}>
                  קיימות
                </Text>
                <Group gap="xs">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <Box
                      key={i}
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 2,
                        backgroundColor:
                          i < material.properties.technical!.sustainability
                            ? 'var(--mantine-color-green-5)'
                            : 'var(--mantine-color-gray-3)',
                      }}
                    />
                  ))}
                  <Text size="sm" c="dimmed" ms="xs">
                    {material.properties.technical.sustainability}/10
                  </Text>
                </Group>
              </div>
            </SimpleGrid>
          </MoodBCard>
        )}

        {/* Suppliers */}
        {suppliers.length > 0 && (
          <>
            <Group justify="space-between" align="center" mb="lg">
              <Text size="xl" fw={700}>
                ספקים
              </Text>
              <Badge size="lg" variant="light" color="gray">
                {suppliers.length}
              </Badge>
            </Group>

            <SimpleGrid cols={{ base: 2, sm: 3, lg: 4 }} spacing="md" mb="xl">
              {suppliers.map((supplier) => (
                <MoodBCard key={supplier.id} padding="md">
                  <Text fw={600} size="sm" lineClamp={1}>
                    {supplier.organization.name}
                  </Text>
                  {supplier.pricing?.basePrice && (
                    <Text size="sm" c="dimmed" mt="xs">
                      ₪{supplier.pricing.basePrice.toLocaleString()}
                    </Text>
                  )}
                </MoodBCard>
              ))}
            </SimpleGrid>
          </>
        )}

        {/* Related Styles */}
        <Group justify="space-between" align="center" mb="lg">
          <Text size="xl" fw={700}>
            סגנונות שמשתמשים בחומר
          </Text>
          <Badge size="lg" variant="light" color="gray">
            {styles.length}
          </Badge>
        </Group>

        {styles.length === 0 ? (
          <EmptyState
            title="אין סגנונות"
            description="לא נמצאו סגנונות שמשתמשים בחומר זה"
            icon={<IconBox size={48} />}
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

        {/* Image Gallery */}
        {material.assets?.images && material.assets.images.length > 1 && (
          <>
            <Text size="xl" fw={700} mt="xl" mb="lg">
              גלריית תמונות
            </Text>
            <SimpleGrid cols={{ base: 2, sm: 3, lg: 4 }} spacing="md">
              {material.assets.images.map((imageUrl, index) => (
                <Box
                  key={index}
                  pos="relative"
                  style={{
                    aspectRatio: '1/1',
                    borderRadius: 'var(--mantine-radius-md)',
                    overflow: 'hidden',
                  }}
                >
                  <Image
                    src={imageUrl}
                    alt={`${material.name[locale]} - ${index + 1}`}
                    fill
                    style={{ objectFit: 'cover' }}
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                </Box>
              ))}
            </SimpleGrid>
          </>
        )}
      </Container>
    </Stack>
  )
}
