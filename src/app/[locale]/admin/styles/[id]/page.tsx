/**
 * Admin Style Detail Page
 * View global style details
 */

'use client'

import { Container, Title, Stack, Group, Text, Badge, ActionIcon, Paper, Button, SimpleGrid, Image, Box, Divider, Card, Grid, Skeleton } from '@mantine/core'
import { useTranslations } from 'next-intl'
import { useParams, useRouter } from 'next/navigation'
import { IconEdit, IconArrowLeft, IconDoor, IconPhoto } from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
// FIX: Replaced barrel import with direct imports to improve compilation speed
// Barrel imports force compilation of ALL components (including heavy RichTextEditor, ImageUpload)
// Direct imports only compile what's needed
import { MoodBCard } from '@/components/ui/Card'
import { MoodBBadge } from '@/components/ui/Badge'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { useAdminStyle } from '@/hooks/useStyles'
import { useMaterial } from '@/hooks/useMaterials'
import { useColor } from '@/hooks/useColors'
import { AIMetadataDisplay } from '@/components/features/style-system/AIMetadataDisplay'
import { DetailedContentViewer } from '@/components/features/style-system/DetailedContentViewer'
import { useImageViewer } from '@/contexts/ImageViewerContext'
import Link from 'next/link'

// Color Display Component
function ColorDisplay({ colorId, locale }: { colorId: string; locale: string }) {
  const { data: color, isLoading } = useColor(colorId)

  if (isLoading) {
    return (
      <Group gap="md">
        <Skeleton height={80} width={80} />
        <Stack gap="xs" style={{ flex: 1 }}>
          <Skeleton height={24} width="40%" />
          <Skeleton height={20} width="30%" />
        </Stack>
      </Group>
    )
  }

  if (!color) {
    return (
      <Paper p="md" withBorder radius="md" style={{ backgroundColor: '#fafafa' }}>
        <Text size="sm" c="dimmed">
          Color not found (ID: {colorId})
        </Text>
      </Paper>
    )
  }

  const colorName = locale === 'he' ? color.name.he : color.name.en
  const colorDescription = locale === 'he' ? color.description?.he : color.description?.en

  return (
    <Group gap="md" align="flex-start">
      {/* Color Swatch */}
      <Box
        style={{
          width: 80,
          height: 80,
          backgroundColor: color.hex,
          borderRadius: 8,
          border: '2px solid #e0e0e0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      />

      {/* Color Info */}
      <Stack gap="xs" style={{ flex: 1 }}>
        <div>
          <Text fw={600} size="lg">{colorName}</Text>
          {colorDescription && (
            <Text size="sm" c="dimmed" mt={4}>{colorDescription}</Text>
          )}
        </div>

        <Group gap="xs">
          <Badge variant="light" color="gray" size="lg" style={{ fontFamily: 'monospace' }}>
            {color.hex}
          </Badge>
          {color.pantone && (
            <Badge variant="light" color="violet" size="sm">
              Pantone: {color.pantone}
            </Badge>
          )}
          {color.category && (
            <Badge variant="light" color="brand" size="sm">
              {color.category}
            </Badge>
          )}
        </Group>
      </Stack>
    </Group>
  )
}

// Room Color Palette Display Component
function RoomColorPaletteDisplay({ palette, locale }: { palette: any; locale: string }) {
  // Fetch all colors used in the palette
  const { data: primaryColor } = useColor(palette.primaryId)
  const { data: secondaryColors } = useQuery({
    queryKey: ['colors', 'multiple', palette.secondaryIds],
    queryFn: async () => {
      const colors = await Promise.all(
        (palette.secondaryIds || []).map((id: string) =>
          fetch(`/api/colors/${id}`).then(r => r.json())
        )
      )
      return colors
    },
    enabled: !!(palette.secondaryIds && palette.secondaryIds.length > 0),
  })

  const { data: accentColors } = useQuery({
    queryKey: ['colors', 'multiple', palette.accentIds],
    queryFn: async () => {
      const colors = await Promise.all(
        (palette.accentIds || []).map((id: string) =>
          fetch(`/api/colors/${id}`).then(r => r.json())
        )
      )
      return colors
    },
    enabled: !!(palette.accentIds && palette.accentIds.length > 0),
  })

  return (
    <Stack gap="xs">
      {/* Primary Color */}
      {primaryColor && (
        <Group gap="xs">
          <Text size="xs" c="dimmed" w={60}>עיקרי:</Text>
          <Group gap="xs">
            <Box
              style={{
                width: 24,
                height: 24,
                backgroundColor: primaryColor.hex,
                borderRadius: 4,
                border: '1px solid #e0e0e0',
              }}
            />
            <Text size="sm" fw={500}>{locale === 'he' ? primaryColor.name.he : primaryColor.name.en}</Text>
            <Badge size="xs" variant="light" color="gray">{primaryColor.hex}</Badge>
          </Group>
        </Group>
      )}

      {/* Secondary Colors */}
      {secondaryColors && secondaryColors.length > 0 && (
        <Group gap="xs" align="flex-start">
          <Text size="xs" c="dimmed" w={60}>משני:</Text>
          <Group gap="xs">
            {secondaryColors.map((color: any) => (
              <Group key={color.id} gap={4}>
                <Box
                  style={{
                    width: 24,
                    height: 24,
                    backgroundColor: color.hex,
                    borderRadius: 4,
                    border: '1px solid #e0e0e0',
                  }}
                />
                <Text size="sm">{locale === 'he' ? color.name.he : color.name.en}</Text>
              </Group>
            ))}
          </Group>
        </Group>
      )}

      {/* Accent Colors */}
      {accentColors && accentColors.length > 0 && (
        <Group gap="xs" align="flex-start">
          <Text size="xs" c="dimmed" w={60}>הדגשה:</Text>
          <Group gap="xs">
            {accentColors.map((color: any) => (
              <Group key={color.id} gap={4}>
                <Box
                  style={{
                    width: 24,
                    height: 24,
                    backgroundColor: color.hex,
                    borderRadius: 4,
                    border: '1px solid #e0e0e0',
                  }}
                />
                <Text size="sm">{locale === 'he' ? color.name.he : color.name.en}</Text>
              </Group>
            ))}
          </Group>
        </Group>
      )}
    </Stack>
  )
}

// Material Card Component
function MaterialCard({ materialId, usageArea, defaultFinish, locale, compact = false }: { materialId: string; usageArea?: string; defaultFinish?: string; locale: string; compact?: boolean }) {
  const { data: material, isLoading } = useMaterial(materialId)
  const router = useRouter()

  if (isLoading) {
    return (
      <Card p="md" withBorder radius="md">
        <Stack gap="sm">
          <Skeleton height={20} />
          <Skeleton height={16} width="60%" />
          {!compact && <Skeleton height={150} />}
        </Stack>
      </Card>
    )
  }

  if (!material) {
    return (
      <Card p="md" withBorder radius="md" style={{ backgroundColor: '#fafafa' }}>
        <Text size="sm" c="dimmed">
          {usageArea || 'Material'} - ID: {materialId}
        </Text>
      </Card>
    )
  }

  const materialName = locale === 'he' ? material.name.he : material.name.en
  const thumbnail = material.assets?.thumbnail || material.assets?.images?.[0]

  return (
    <Card
      p="md"
      withBorder
      radius="md"
      style={{ cursor: 'pointer', height: '100%' }}
      onClick={() => router.push(`/${locale}/admin/materials/${materialId}`)}
    >
      <Stack gap="sm">
        {thumbnail && !compact && (
          <Box
            style={{
              width: '100%',
              height: 150,
              borderRadius: 8,
              overflow: 'hidden',
              backgroundColor: '#f0f0f0',
            }}
          >
            <Image
              src={thumbnail}
              alt={materialName}
              fit="cover"
              style={{ width: '100%', height: '100%' }}
            />
          </Box>
        )}
        <div>
          <Group justify="space-between" mb={4}>
            <Text fw={600} size={compact ? 'sm' : 'md'} lineClamp={1}>
              {materialName}
            </Text>
            {compact && thumbnail && (
              <Box
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 4,
                  overflow: 'hidden',
                  backgroundColor: '#f0f0f0',
                }}
              >
                <Image
                  src={thumbnail}
                  alt={materialName}
                  fit="cover"
                  style={{ width: '100%', height: '100%' }}
                />
              </Box>
            )}
          </Group>
          {usageArea && (
            <Badge size="sm" variant="light" color="brand" mb={4}>
              {usageArea}
            </Badge>
          )}
          {defaultFinish && (
            <Text size="xs" c="dimmed">
              {defaultFinish}
            </Text>
          )}
          {material.pricing && (
            <Group gap={4} mt={4}>
              <Text size="sm" fw={500}>
                {material.pricing.retail} {material.pricing.currency}
              </Text>
              <Text size="xs" c="dimmed">
                / {material.pricing.unit}
              </Text>
            </Group>
          )}
        </div>
      </Stack>
    </Card>
  )
}

// Room Profile Card Component
function RoomProfileCard({ profile, locale, t, openImages }: { profile: any; locale: string; t: any; openImages: any }) {
  const tProjects = useTranslations('projects')
  const roomTypeName = tProjects(`form.roomTypes.${profile.roomType}`) || profile.roomType

  return (
    <Card p="lg" withBorder radius="md" style={{ height: '100%' }}>
      <Stack gap="md">
        <Group justify="space-between" align="flex-start">
          <Title order={4}>{roomTypeName}</Title>
          <Badge variant="light" color="brand">{profile.roomType}</Badge>
        </Group>

        {/* Room Color Palette */}
        {profile.colorPalette && (
          <>
            <Divider />
            <div>
              <Text fw={500} size="sm" mb="xs" c="dimmed">
                פלטת צבעים
              </Text>
              <RoomColorPaletteDisplay palette={profile.colorPalette} locale={locale} />
            </div>
          </>
        )}

        {/* Room Textures */}
        {profile.textures && profile.textures.length > 0 && (
          <>
            <Divider />
            <div>
              <Text fw={500} size="sm" mb="xs" c="dimmed">
                טקסטורות ({profile.textures.length})
              </Text>
              <Stack gap="xs">
                {profile.textures.map((texture: any, textureIndex: number) => (
                  <Group key={textureIndex} justify="space-between">
                    <Badge variant="light" color="teal" size="sm">
                      {texture.type}
                    </Badge>
                    {texture.name && (
                      <Text size="xs" c="dimmed">
                        {texture.name}
                      </Text>
                    )}
                  </Group>
                ))}
              </Stack>
            </div>
          </>
        )}

        {/* Room Materials */}
        {profile.materials && profile.materials.length > 0 && (
          <>
            <Divider />
            <div>
              <Text fw={500} size="sm" mb="xs" c="dimmed">
                {t('detail.rooms.materials') || 'חומרים'} ({profile.materials.length})
              </Text>
              <Grid gutter="xs">
                {profile.materials.map((material: any, matIndex: number) => (
                  <Grid.Col key={matIndex} span={{ base: 12, sm: 6, md: 4 }}>
                    <MaterialCard
                      materialId={material.materialId}
                      usageArea={locale === 'he' ? material.application?.he : material.application?.en}
                      defaultFinish={material.finish}
                      locale={locale}
                      compact
                    />
                  </Grid.Col>
                ))}
              </Grid>
            </div>
          </>
        )}

        {/* Room Products */}
        {profile.products && profile.products.length > 0 && (
          <>
            <Divider />
            <div>
              <Text fw={500} size="sm" mb="xs" c="dimmed">
                מוצרים ({profile.products.length})
              </Text>
              <Stack gap="xs">
                {profile.products.map((product: any, productIndex: number) => (
                  <Group key={productIndex} justify="space-between">
                    <Badge variant="light" color="orange" size="sm">
                      {product.category}
                    </Badge>
                    {product.name && (
                      <Text size="xs" c="dimmed">
                        {product.name}
                      </Text>
                    )}
                  </Group>
                ))}
              </Stack>
            </div>
          </>
        )}

        {/* Room Constraints */}
        {profile.constraints && Object.keys(profile.constraints).length > 0 && (
          <>
            <Divider />
            <div>
              <Text fw={500} size="sm" mb="xs" c="dimmed">
                {t('detail.rooms.constraints') || 'אילוצים'}
              </Text>
              <Stack gap="xs">
                {profile.constraints.waterResistance !== undefined && (
                  <Group justify="space-between">
                    <Text size="sm">{t('detail.rooms.waterResistance') || 'עמידות למים'}:</Text>
                    <Badge color={profile.constraints.waterResistance ? 'green' : 'gray'} variant="light">
                      {profile.constraints.waterResistance ? 'כן' : 'לא'}
                    </Badge>
                  </Group>
                )}
                {profile.constraints.durability !== undefined && (
                  <Group justify="space-between">
                    <Text size="sm">{t('detail.rooms.durability') || 'עמידות'}:</Text>
                    <Badge color="blue" variant="light">{profile.constraints.durability}/10</Badge>
                  </Group>
                )}
                {profile.constraints.maintenance !== undefined && (
                  <Group justify="space-between">
                    <Text size="sm">{t('detail.rooms.maintenance') || 'תחזוקה'}:</Text>
                    <Badge color="orange" variant="light">{profile.constraints.maintenance}/10</Badge>
                  </Group>
                )}
              </Stack>
            </div>
          </>
        )}

        {/* Room Profile Images */}
        {profile.images && profile.images.length > 0 && (
          <>
            <Divider />
            <div>
              <Group gap="xs" mb="md">
                <IconPhoto size={16} />
                <Text fw={500} size="sm" c="dimmed">
                  {t('detail.images') || 'תמונות'} ({profile.images.length})
                </Text>
              </Group>
              <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="sm">
                {profile.images.map((imageUrl: string, imgIndex: number) => (
                  <Paper
                    key={imgIndex}
                    p="xs"
                    withBorder
                    radius="md"
                    style={{ overflow: 'hidden' }}
                  >
                    <Box
                      style={{
                        aspectRatio: '1',
                        overflow: 'hidden',
                        borderRadius: 'var(--mantine-radius-sm)',
                        cursor: 'pointer',
                        transition: 'transform 0.2s ease',
                      }}
                      onClick={() => openImages(
                        profile.images.map((url: string, idx: number) => ({
                          url,
                          title: `${roomTypeName} - תמונה ${idx + 1}`,
                          description: profile.roomType
                        })),
                        imgIndex
                      )}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <Image
                        src={imageUrl}
                        alt={`${roomTypeName} - Image ${imgIndex + 1}`}
                        fit="cover"
                        style={{ width: '100%', height: '100%' }}
                      />
                    </Box>
                  </Paper>
                ))}
              </SimpleGrid>
            </div>
          </>
        )}
      </Stack>
    </Card>
  )
}

export default function AdminStyleDetailPage() {
  const t = useTranslations('admin.styles')
  const tCommon = useTranslations('common')
  const params = useParams()
  const router = useRouter()
  const locale = params.locale as string
  const styleId = params.id as string

  const { data: style, isLoading, error } = useAdminStyle(styleId)
  const { openImages } = useImageViewer()

  if (isLoading) {
    return (
      <Container size="xl" py="xl">
        <LoadingState />
      </Container>
    )
  }

  if (error || !style) {
    return (
      <Container size="xl" py="xl">
        <ErrorState message={tCommon('error')} />
      </Container>
    )
  }

  const styleImages = style.gallery 
    ? style.gallery.filter((i: any) => i.type === 'scene').map((i: any) => i.url)
    : (style.images || [])

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      scandinavian: 'blue',
      japandi: 'teal',
      industrial: 'gray',
      minimal: 'grape',
      mediterranean: 'orange',
      rustic: 'brown',
      classic: 'violet',
    }
    return colors[category] || 'gray'
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between">
          <Group>
            <ActionIcon
              variant="subtle"
              onClick={() => router.push(`/${locale}/admin/styles`)}
            >
              <IconArrowLeft size={20} />
            </ActionIcon>
            <div>
              <Title order={1} c="brand">
                {style.name.he}
              </Title>
              <Text size="sm" c="dimmed">
                {style.name.en}
              </Text>
            </div>
          </Group>
          <Button
            leftSection={<IconEdit size={16} />}
            component={Link}
            href={`/${locale}/admin/styles/${styleId}/edit`}
            color="brand"
            variant="filled"
          >
            {tCommon('edit')}
          </Button>
        </Group>

        {/* Basic Info */}
        <MoodBCard>
          <Stack gap="md">
            <Group>
              <Text fw={500}>{t('detail.category')}:</Text>
              <MoodBBadge color={getCategoryColor(style.category?.slug || '')} variant="light">
                {style.category?.name?.he || style.category?.name?.en || style.categoryId}
              </MoodBBadge>
            </Group>
            <Group>
              <Text fw={500}>{t('detail.version')}:</Text>
              <Text>{style.metadata.version}</Text>
            </Group>
            <Group>
              <Text fw={500}>{t('detail.usage')}:</Text>
              <Text>{style.metadata.usage}</Text>
            </Group>
            <Group>
              <Text fw={500}>{t('detail.createdAt')}:</Text>
              <Text>{new Date(style.createdAt).toLocaleDateString(locale)}</Text>
            </Group>
            {style.metadata.tags && style.metadata.tags.length > 0 && (
              <Group>
                <Text fw={500}>{t('detail.tags')}:</Text>
                <Group gap="xs">
                  {style.metadata.tags.map((tag: string) => (
                    <Badge key={tag} variant="light" size="sm">
                      {tag}
                    </Badge>
                  ))}
                </Group>
              </Group>
            )}

            {/* Style Images */}
            {styleImages && styleImages.length > 0 && (
              <>
                <Divider />
                <div>
                  <Group gap="xs" mb="md">
                    <IconPhoto size={16} />
                    <Text fw={500} size="sm" c="dimmed">
                      {t('detail.images') || 'תמונות'} ({styleImages.length})
                    </Text>
                  </Group>
                  <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="md">
                    {styleImages.map((imageUrl: string, index: number) => (
                      <Paper
                        key={index}
                        p="xs"
                        withBorder
                        radius="md"
                        style={{ overflow: 'hidden' }}
                      >
                        <Box
                          style={{
                            aspectRatio: '1',
                            overflow: 'hidden',
                            borderRadius: 'var(--mantine-radius-sm)',
                            cursor: 'pointer',
                            transition: 'transform 0.2s ease',
                          }}
                          onClick={() => openImages(
                            styleImages.map((url: string, idx: number) => ({
                              url,
                              title: `${style.name.he} - תמונה ${idx + 1}`,
                              description: style.name.en
                            })),
                            index
                          )}
                          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                          <Image
                            src={imageUrl}
                            alt={`${style.name.he} - Image ${index + 1}`}
                            fit="cover"
                            style={{ width: '100%', height: '100%' }}
                          />
                        </Box>
                      </Paper>
                    ))}
                  </SimpleGrid>
                </div>
              </>
            )}
          </Stack>
        </MoodBCard>

        {/* Color Display Section */}
        {style.colorId && (
          <MoodBCard>
            <Stack gap="md">
              <Title order={3}>צבע</Title>
              <ColorDisplay colorId={style.colorId} locale={locale} />
            </Stack>
          </MoodBCard>
        )}

        {/* AI Metadata Section */}
        <AIMetadataDisplay
          aiGenerated={style.metadata.aiGenerated}
          aiSelection={style.metadata.aiSelection}
          variant="full"
          locale={locale}
        />

        {/* Detailed Content Section */}
        {style.detailedContent && (
          <MoodBCard>
            <DetailedContentViewer
              content={style.detailedContent}
              entityName={style.name}
              entityType="style"
              images={styleImages}
            />
          </MoodBCard>
        )}

        {/* Design Approach */}
        <MoodBCard>
          <Stack gap="md">
            <Group justify="space-between">
              <div>
                <Title order={3}>{t('detail.approach.title') || 'גישת עיצוב'}</Title>
                <Text size="sm" c="dimmed">
                  {t('detail.approach.subtitle') || 'הגישה העיצובית הגלובלית לסגנון זה'}
                </Text>
              </div>
              {style.approach && (
                <Button
                  component={Link}
                  href={`/${locale}/admin/style-system/approaches/${style.approach.id}`}
                  variant="light"
                  color="brand"
                  leftSection={<IconEdit size={14} />}
                >
                  {t('detail.approach.viewGlobal') || 'צפה בגישה הגלובלית'}
                </Button>
              )}
            </Group>

            {style.approach ? (
              <Group gap="md">
                <Text fw={500}>{t('detail.approach.name') || 'שם הגישה'}:</Text>
                <div>
                  <Text fw={600}>{style.approach.name.he}</Text>
                  <Text size="sm" c="dimmed">{style.approach.name.en}</Text>
                </div>
              </Group>
            ) : (
              <Paper p="xl" radius="md" withBorder>
                <Stack align="center" gap="xs">
                  <Text c="dimmed">{t('detail.approach.notSet') || 'לא הוגדרה גישת עיצוב'}</Text>
                </Stack>
              </Paper>
            )}
          </Stack>
        </MoodBCard>

        {/* Room Profiles */}
        {style.roomProfiles && style.roomProfiles.length > 0 && (
          <MoodBCard>
            <Stack gap="lg">
              <div>
                <Title order={3}>{t('detail.rooms.title') || 'פרופילי חדרים'}</Title>
                <Text size="sm" c="dimmed">
                  {t('detail.rooms.subtitle') || 'תוכן ספציפי לכל סוג חדר'}
                </Text>
              </div>

              <Stack gap="md">
                {style.roomProfiles.map((profile: any, index: number) => (
                  <RoomProfileCard key={index} profile={profile} locale={locale} t={t} openImages={openImages} />
                ))}
              </Stack>
            </Stack>
          </MoodBCard>
        )}
      </Stack>
    </Container>
  )
}

