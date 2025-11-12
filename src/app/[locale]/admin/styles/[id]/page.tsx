/**
 * Admin Style Detail Page
 * View global style details
 */

'use client'

import { Container, Title, Stack, Group, Text, Badge, ActionIcon, Paper, Button, SimpleGrid, Image, Box, Divider, Card, Grid, Skeleton } from '@mantine/core'
import { useTranslations } from 'next-intl'
import { useParams, useRouter } from 'next/navigation'
import { IconEdit, IconArrowLeft, IconDoor, IconPhoto } from '@tabler/icons-react'
import { MoodBCard, MoodBBadge, LoadingState, ErrorState } from '@/components/ui'
import { useAdminStyle } from '@/hooks/useStyles'
import { useMaterial } from '@/hooks/useMaterials'
import Link from 'next/link'

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
function RoomProfileCard({ profile, locale, t }: { profile: any; locale: string; t: any }) {
  const tProjects = useTranslations('projects')
  const roomTypeName = tProjects(`form.roomTypes.${profile.roomType}`) || profile.roomType

  return (
    <Card p="lg" withBorder radius="md" style={{ height: '100%' }}>
      <Stack gap="md">
        <Group justify="space-between" align="flex-start">
          <Title order={4}>{roomTypeName}</Title>
          <Badge variant="light" color="brand">{profile.roomType}</Badge>
        </Group>

        {/* Room Materials */}
        {profile.materials && profile.materials.length > 0 && (
          <>
            <Divider />
            <div>
              <Text fw={500} size="sm" mb="xs" c="dimmed">
                {t('detail.rooms.materials') || 'חומרים'} ({profile.materials.length})
              </Text>
              <Grid gutter="xs">
                {profile.materials.map((materialId: string, matIndex: number) => (
                  <Grid.Col key={matIndex} span={{ base: 12, sm: 6, md: 4 }}>
                    <MaterialCard materialId={materialId} locale={locale} compact />
                  </Grid.Col>
                ))}
              </Grid>
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
                    style={{ overflow: 'hidden', cursor: 'pointer' }}
                    onClick={() => window.open(imageUrl, '_blank')}
                  >
                    <Box
                      style={{
                        aspectRatio: '1',
                        overflow: 'hidden',
                        borderRadius: 'var(--mantine-radius-sm)',
                      }}
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
            {style.images && style.images.length > 0 && (
              <>
                <Divider />
                <div>
                  <Group gap="xs" mb="md">
                    <IconPhoto size={16} />
                    <Text fw={500} size="sm" c="dimmed">
                      {t('detail.images') || 'תמונות'} ({style.images.length})
                    </Text>
                  </Group>
                  <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="md">
                    {style.images.map((imageUrl: string, index: number) => (
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
                          }}
                          onClick={() => window.open(imageUrl, '_blank')}
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

        <MoodBCard>
          <Stack gap="lg">
            <Group justify="space-between">
              <div>
                <Title order={3}>{t('detail.approaches.title')}</Title>
                <Text size="sm" c="dimmed">
                  {t('detail.approaches.subtitle')}
                </Text>
              </div>
              <Button
                component={Link}
                href={`/${locale}/admin/styles/${styleId}/edit?tab=approaches`}
                variant="light"
                color="brand"
              >
                {t('detail.approaches.manage')}
              </Button>
            </Group>

            {style.approaches && style.approaches.length > 0 ? (
              <Stack gap="lg">
                {style.approaches.map((approach: any) => (
                  <MoodBCard key={approach.id}>
                    <Stack gap="md">
                      <Group justify="space-between">
                        <div>
                          <Title order={4}>{approach.name?.he}</Title>
                          <Text size="sm" c="dimmed">
                            {approach.name?.en}
                          </Text>
                        </div>
                        <Group gap="xs">
                          {approach.metadata?.isDefault && (
                            <Badge color="green" variant="light">
                              {t('detail.approaches.default')}
                            </Badge>
                          )}
                          <Badge variant="light">{t('detail.approaches.order', { order: approach.order })}</Badge>
                          <Button
                            variant="subtle"
                            size="xs"
                            leftSection={<IconEdit size={14} />}
                            component={Link}
                            href={`/${locale}/admin/styles/${styleId}/edit?tab=approaches&approachId=${approach.id}`}
                          >
                            {tCommon('edit')}
                          </Button>
                        </Group>
                      </Group>

                      {approach.images && approach.images.length > 0 && (
                        <div>
                          <Group gap="xs" mb="md">
                            <IconPhoto size={16} />
                            <Text fw={500} size="sm" c="dimmed">
                              {t('detail.images')} ({approach.images.length})
                            </Text>
                          </Group>
                          <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="md">
                            {approach.images.map((imageUrl: string, index: number) => (
                              <Paper
                                key={index}
                                p="xs"
                                withBorder
                                radius="md"
                                style={{ overflow: 'hidden', cursor: 'pointer' }}
                                onClick={() => window.open(imageUrl, '_blank')}
                              >
                                <Box
                                  style={{
                                    aspectRatio: '1',
                                    overflow: 'hidden',
                                    borderRadius: 'var(--mantine-radius-sm)',
                                  }}
                                >
                                  <Image
                                    src={imageUrl}
                                    alt={`${approach.name?.he} - Image ${index + 1}`}
                                    fit="cover"
                                    style={{ width: '100%', height: '100%' }}
                                  />
                                </Box>
                              </Paper>
                            ))}
                          </SimpleGrid>
                        </div>
                      )}

                      <Stack gap="sm">
                        <Text fw={500}>{t('detail.materials.defaults')}</Text>
                        {approach.materialSet?.defaults && approach.materialSet.defaults.length > 0 ? (
                          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                            {approach.materialSet.defaults.map((materialItem: any, index: number) => (
                              <MaterialCard key={index} materialId={materialItem.materialId} locale={locale} compact />
                            ))}
                          </SimpleGrid>
                        ) : (
                          <Text size="sm" c="dimmed">
                            {t('detail.materials.noDefaults')}
                          </Text>
                        )}
                      </Stack>

                      {approach.materialSet?.alternatives && approach.materialSet.alternatives.length > 0 && (
                        <Stack gap="sm">
                          <Text fw={500}>{t('detail.materials.alternatives')}</Text>
                          <Stack gap="xs">
                            {approach.materialSet.alternatives.map((altGroup: any, index: number) => (
                              <Paper key={index} p="md" withBorder radius="md">
                                <Stack gap="xs">
                                  <Group justify="space-between">
                                    <Text fw={500}>{altGroup.usageArea}</Text>
                                    <Badge variant="light" color="brand">
                                      {altGroup.alternatives.length} {t('detail.materials.options')}
                                    </Badge>
                                  </Group>
                                  <Group gap="xs">
                                    {altGroup.alternatives.map((altMaterialId: string, altIndex: number) => (
                                      <MaterialCard key={altIndex} materialId={altMaterialId} locale={locale} compact />
                                    ))}
                                  </Group>
                                </Stack>
                              </Paper>
                            ))}
                          </Stack>
                        </Stack>
                      )}

                      {approach.roomProfiles && approach.roomProfiles.length > 0 ? (
                        <Stack gap="md">
                          <Divider />
                          <Text fw={500}>{t('detail.rooms.title')}</Text>
                          <Stack gap="md">
                            {approach.roomProfiles.map((profile: any, index: number) => (
                              <RoomProfileCard key={index} profile={profile} locale={locale} t={t} />
                            ))}
                          </Stack>
                        </Stack>
                      ) : (
                        <Text size="sm" c="dimmed">
                          {t('detail.rooms.noProfiles')}
                        </Text>
                      )}
                    </Stack>
                  </MoodBCard>
                ))}
              </Stack>
            ) : (
              <Paper p="xl" radius="md" withBorder>
                <Stack align="center" gap="xs">
                  <IconDoor size={32} />
                  <Text>{t('detail.approaches.empty')}</Text>
                  <Text size="sm" c="dimmed">
                    {t('detail.approaches.emptyHint')}
                  </Text>
                </Stack>
              </Paper>
            )}
          </Stack>
        </MoodBCard>
      </Stack>
    </Container>
  )
}

