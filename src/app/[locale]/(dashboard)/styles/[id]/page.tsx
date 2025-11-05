/**
 * User-Facing Style Detail Page
 * View style details (global + approved public + personal)
 */

'use client'

import { Container, Title, Stack, Group, Text, Badge, Tabs, ActionIcon, Paper, Button, SimpleGrid, Image, Box, Divider } from '@mantine/core'
import { useTranslations } from 'next-intl'
import { useParams, useRouter } from 'next/navigation'
import { IconEdit, IconArrowLeft, IconPalette, IconBox, IconDoor, IconPhoto, IconCheck } from '@tabler/icons-react'
import { MoodBCard, MoodBBadge, LoadingState, ErrorState } from '@/components/ui'
import { useStyle } from '@/hooks/useStyles'
import Link from 'next/link'

export default function StyleDetailPage() {
  const t = useTranslations('styles.user')
  const tCommon = useTranslations('common')
  const params = useParams()
  const router = useRouter()
  const locale = params.locale as string
  const styleId = params.id as string

  const { data: style, isLoading, error } = useStyle(styleId)

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

  const metadata = style.metadata as any
  const isGlobal = style.organizationId === null
  const isPublic = metadata.isPublic && metadata.approvalStatus === 'approved'
  const isPersonal = !isGlobal && !isPublic
  const canEdit = isPersonal // Only personal styles can be edited

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between">
          <Group>
            <ActionIcon
              variant="subtle"
              onClick={() => router.push(`/${locale}/styles`)}
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
          <Group>
            {canEdit && (
              <Button
                leftSection={<IconEdit size={16} />}
                component={Link}
                href={`/${locale}/styles/${styleId}/edit`}
                color="brand"
                variant="filled"
              >
                {tCommon('edit')}
              </Button>
            )}
            <Button
              leftSection={<IconCheck size={16} />}
              color="green"
              variant="light"
              onClick={() => {
                // TODO: Implement apply to project functionality
                console.log('Apply style to project:', styleId)
              }}
            >
              {t('applyToProject')}
            </Button>
          </Group>
        </Group>

        {/* Basic Info */}
        <MoodBCard>
          <Stack gap="md">
            <Group>
              <Text fw={500}>{t('detail.category')}:</Text>
              {style.category && (
                <MoodBBadge color="brand" variant="light">
                  {style.category.name.he}
                </MoodBBadge>
              )}
              {style.subCategory && (
                <MoodBBadge color="blue" variant="light" size="sm">
                  {style.subCategory.name.he}
                </MoodBBadge>
              )}
            </Group>
            <Group>
              <Text fw={500}>{t('detail.scope')}:</Text>
              {isGlobal ? (
                <MoodBBadge color="violet" variant="light">
                  {t('scope.global')}
                </MoodBBadge>
              ) : isPublic ? (
                <MoodBBadge color="green" variant="light">
                  {t('scope.public')}
                </MoodBBadge>
              ) : (
                <MoodBBadge color="orange" variant="light">
                  {t('scope.personal')}
                </MoodBBadge>
              )}
            </Group>
            <Group>
              <Text fw={500}>{t('detail.version')}:</Text>
              <Text>{metadata.version}</Text>
            </Group>
            <Group>
              <Text fw={500}>{t('detail.usage')}:</Text>
              <Text>{metadata.usage || 0}</Text>
            </Group>
            <Group>
              <Text fw={500}>{t('detail.createdAt')}:</Text>
              <Text>{new Date(style.createdAt).toLocaleDateString(locale)}</Text>
            </Group>
            {metadata.tags && metadata.tags.length > 0 && (
              <Group>
                <Text fw={500}>{t('detail.tags')}:</Text>
                <Group gap="xs">
                  {metadata.tags.map((tag: string) => (
                    <Badge key={tag} variant="light" size="sm">
                      {tag}
                    </Badge>
                  ))}
                </Group>
              </Group>
            )}
            {isPublic && style.organization && (
              <Group>
                <Text fw={500}>{t('detail.createdBy')}:</Text>
                <Text>{style.organization.name}</Text>
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
                      {t('detail.images')} ({style.images.length})
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

        {/* Tabs */}
        <Tabs defaultValue="palette">
          <Tabs.List>
            <Tabs.Tab value="palette" leftSection={<IconPalette size={16} />}>
              {t('detail.tabs.palette')}
            </Tabs.Tab>
            <Tabs.Tab value="materials" leftSection={<IconBox size={16} />}>
              {t('detail.tabs.materials')}
            </Tabs.Tab>
            <Tabs.Tab value="rooms" leftSection={<IconDoor size={16} />}>
              {t('detail.tabs.rooms')}
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="palette" pt="md">
            <MoodBCard>
              <Stack gap="md">
                <Title order={3}>{t('detail.palette.neutrals')}</Title>
                {style.palette?.neutrals && style.palette.neutrals.length > 0 ? (
                  <Group gap="md">
                    {style.palette.neutrals.map((color: { hex: string; name: string; pantone?: string }, index: number) => (
                      <Paper key={index} p="md" withBorder radius="md">
                        <Stack gap="xs" align="center">
                          <div
                            style={{
                              width: 60,
                              height: 60,
                              backgroundColor: color.hex,
                              borderRadius: 8,
                              border: '1px solid #e0e0e0',
                            }}
                          />
                          <Text size="sm" fw={500}>
                            {color.name}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {color.hex}
                          </Text>
                          {color.pantone && (
                            <Text size="xs" c="dimmed">
                              {color.pantone}
                            </Text>
                          )}
                        </Stack>
                      </Paper>
                    ))}
                  </Group>
                ) : (
                  <Text c="dimmed">{t('detail.palette.noNeutrals')}</Text>
                )}

                <Title order={3} mt="lg">{t('detail.palette.accents')}</Title>
                {style.palette?.accents && style.palette.accents.length > 0 ? (
                  <Group gap="md">
                    {style.palette.accents.map((color: { hex: string; name: string; pantone?: string }, index: number) => (
                      <Paper key={index} p="md" withBorder radius="md">
                        <Stack gap="xs" align="center">
                          <div
                            style={{
                              width: 60,
                              height: 60,
                              backgroundColor: color.hex,
                              borderRadius: 8,
                              border: '1px solid #e0e0e0',
                            }}
                          />
                          <Text size="sm" fw={500}>
                            {color.name}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {color.hex}
                          </Text>
                          {color.pantone && (
                            <Text size="xs" c="dimmed">
                              {color.pantone}
                            </Text>
                          )}
                        </Stack>
                      </Paper>
                    ))}
                  </Group>
                ) : (
                  <Text c="dimmed">{t('detail.palette.noAccents')}</Text>
                )}
              </Stack>
            </MoodBCard>
          </Tabs.Panel>

          <Tabs.Panel value="materials" pt="md">
            <MoodBCard>
              <Stack gap="md">
                <Title order={3}>{t('detail.materials.defaults')}</Title>
                {!style.materialSet?.defaults || style.materialSet.defaults.length === 0 ? (
                  <Text c="dimmed">{t('detail.materials.noDefaults')}</Text>
                ) : (
                  <Stack gap="sm">
                    {style.materialSet.defaults.map((material: any, index: number) => (
                      <Paper key={index} p="md" withBorder radius="md">
                        <Group justify="space-between">
                          <div>
                            <Text fw={500}>Material ID: {material.materialId}</Text>
                          </div>
                        </Group>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </Stack>
            </MoodBCard>
          </Tabs.Panel>

          <Tabs.Panel value="rooms" pt="md">
            <MoodBCard>
              <Stack gap="md">
                {!style.roomProfiles || style.roomProfiles.length === 0 ? (
                  <Text c="dimmed">{t('detail.rooms.noProfiles')}</Text>
                ) : (
                  <Stack gap="md">
                    {style.roomProfiles.map((profile: any, index: number) => (
                      <Paper key={index} p="md" withBorder radius="md">
                        <Title order={4} mb="sm">
                          {profile.roomType}
                        </Title>
                        {profile.colorProportions && profile.colorProportions.length > 0 && (
                          <Stack gap="xs" mt="md">
                            {profile.colorProportions.map((prop: any, propIndex: number) => (
                              <Group key={propIndex} justify="space-between">
                                <Text size="sm">{prop.colorRole}</Text>
                                <Text size="sm" fw={500}>
                                  {prop.percentage}%
                                </Text>
                              </Group>
                            ))}
                          </Stack>
                        )}
                        {/* Room Profile Images */}
                        {profile.images && profile.images.length > 0 && (
                          <>
                            <Divider my="md" />
                            <div>
                              <Group gap="xs" mb="md">
                                <IconPhoto size={16} />
                                <Text fw={500} size="sm" c="dimmed">
                                  {t('detail.images')} ({profile.images.length})
                                </Text>
                              </Group>
                              <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="md">
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
                                      }}
                                      onClick={() => window.open(imageUrl, '_blank')}
                                    >
                                      <Image
                                        src={imageUrl}
                                        alt={`${profile.roomType} - Image ${imgIndex + 1}`}
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
                      </Paper>
                    ))}
                  </Stack>
                )}
              </Stack>
            </MoodBCard>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  )
}

