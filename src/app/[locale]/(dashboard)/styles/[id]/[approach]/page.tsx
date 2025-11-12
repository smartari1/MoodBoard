/**
 * User-Facing Style Approach Page
 * Displays style details filtered by specific approach
 */

'use client'

import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Container,
  Divider,
  Group,
  Image,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import { IconArrowLeft, IconCheck, IconPhoto } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'
import { useParams, useRouter } from 'next/navigation'
import { useMemo } from 'react'
import { MoodBCard, MoodBBadge, LoadingState, ErrorState } from '@/components/ui'
import { useStyle } from '@/hooks/useStyles'

export default function StyleApproachPage() {
  const tUser = useTranslations('admin.styles.user')
  const tDetail = useTranslations('admin.styles.detail')
  const tCommon = useTranslations('common')

  const params = useParams()
  const router = useRouter()

  const locale = params.locale as string
  const styleId = params.id as string
  const approachSlug = params.approach as string

  const { data: style, isLoading, error } = useStyle(styleId)

  const selectedApproach = useMemo(() => {
    if (!style?.approaches) return undefined
    return style.approaches.find((approach: any) => approach.slug === approachSlug)
  }, [style?.approaches, approachSlug])

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

  if (!selectedApproach) {
    return (
      <Container size="xl" py="xl">
        <ErrorState message="Approach not found." />
      </Container>
    )
  }

  const metadata = style.metadata as any
  const approachMetadata = selectedApproach.metadata as any
  const isGlobal = style.organizationId === null
  const isPublic = metadata.isPublic && metadata.approvalStatus === 'approved'
  const isPersonal = !isGlobal && !isPublic

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Group justify="space-between">
          <Group>
            <ActionIcon variant="subtle" onClick={() => router.push(`/${locale}/styles`)}>
              <IconArrowLeft size={20} />
            </ActionIcon>
            <div>
              <Title order={1} c="brand">
                {style.name.he}
              </Title>
              <Text size="sm" c="dimmed">
                {style.name.en}
              </Text>
              <Group gap="xs" mt={8}>
                <MoodBBadge color="brand" variant="light">
                  {selectedApproach.name?.he}
                </MoodBBadge>
                {approachMetadata?.isDefault && (
                  <MoodBBadge color="green" variant="light">
                    {tDetail('approaches.default')}
                  </MoodBBadge>
                )}
              </Group>
            </div>
          </Group>
          <Button
            leftSection={<IconCheck size={16} />}
            color="green"
            variant="light"
            onClick={() => {
              console.log('Apply style approach to project:', styleId, approachSlug)
            }}
          >
            {tUser('applyToProject')}
          </Button>
        </Group>

        <MoodBCard>
          <Stack gap="md">
            <Group>
              <Text fw={500}>{tUser('detail.category')}:</Text>
              {style.category && (
                <MoodBBadge color="brand" variant="light">
                  {style.category.name.he}
                </MoodBBadge>
              )}
              {style.subCategory && (
                <MoodBBadge color="blue" variant="light">
                  {style.subCategory.name.he}
                </MoodBBadge>
              )}
            </Group>
            <Group>
              <Text fw={500}>{tUser('detail.scope')}:</Text>
              {isGlobal ? (
                <MoodBBadge color="violet" variant="light">
                  {tUser('scope.global')}
                </MoodBBadge>
              ) : isPublic ? (
                <MoodBBadge color="green" variant="light">
                  {tUser('scope.public')}
                </MoodBBadge>
              ) : (
                <MoodBBadge color="orange" variant="light">
                  {tUser('scope.personal')}
                </MoodBBadge>
              )}
            </Group>
            <Group>
              <Text fw={500}>{tUser('detail.version')}:</Text>
              <Text>{metadata.version}</Text>
            </Group>
            <Group>
              <Text fw={500}>{tUser('detail.usage')}:</Text>
              <Text>{metadata.usage || 0}</Text>
            </Group>
            <Group>
              <Text fw={500}>{tUser('detail.createdAt')}:</Text>
              <Text>{new Date(style.createdAt).toLocaleDateString(locale)}</Text>
            </Group>
            {metadata.tags && metadata.tags.length > 0 && (
              <Group>
                <Text fw={500}>{tUser('detail.tags')}:</Text>
                <Group gap="xs">
                  {metadata.tags.map((tag: string) => (
                    <Badge key={tag} variant="light" size="sm">
                      {tag}
                    </Badge>
                  ))}
                </Group>
              </Group>
            )}
            {style.color && (
              <Group>
                <Text fw={500}>{tCommon('color')}:</Text>
                <Group gap="xs">
                  <Box
                    style={{
                      width: 24,
                      height: 24,
                      backgroundColor: style.color.hex,
                      borderRadius: 4,
                      border: '1px solid #e0e0e0',
                    }}
                  />
                  <Text size="sm">{style.color.name.he}</Text>
                  <Badge size="xs" variant="light">
                    {style.color.hex}
                  </Badge>
                </Group>
              </Group>
            )}
          </Stack>
        </MoodBCard>

        {style.images && style.images.length > 0 && (
          <MoodBCard>
            <Stack gap="md">
              <Group gap="xs">
                <IconPhoto size={16} />
                <Text fw={500} size="sm" c="dimmed">
                  {tDetail('images')} ({style.images.length})
                </Text>
              </Group>
              <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="md">
                {style.images.map((imageUrl: string, index: number) => (
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
                        alt={`${style.name.he} - Image ${index + 1}`}
                        fit="cover"
                        style={{ width: '100%', height: '100%' }}
                      />
                    </Box>
                  </Paper>
                ))}
              </SimpleGrid>
            </Stack>
          </MoodBCard>
        )}

        <MoodBCard>
          <Stack gap="lg">
            <div>
              <Text fw={600}>{tDetail('materials.defaults')}</Text>
              {selectedApproach.materialSet?.defaults && selectedApproach.materialSet.defaults.length > 0 ? (
                <Group gap="xs" mt="xs">
                  {selectedApproach.materialSet.defaults.map((item: any, index: number) => (
                    <Badge key={index} variant="outline">
                      {item.materialId}
                    </Badge>
                  ))}
                </Group>
              ) : (
                <Text size="sm" c="dimmed">
                  {tDetail('materials.noDefaults')}
                </Text>
              )}
            </div>

            {selectedApproach.materialSet?.alternatives &&
              selectedApproach.materialSet.alternatives.length > 0 && (
                <Stack gap="sm">
                  <Text fw={600}>{tDetail('materials.alternatives')}</Text>
                  <Stack gap="xs">
                    {selectedApproach.materialSet.alternatives.map((group: any, index: number) => (
                      <Paper key={index} p="md" withBorder radius="md">
                        <Stack gap="xs">
                          <Group justify="space-between">
                            <Text fw={500}>{group.usageArea}</Text>
                            <Badge variant="light" color="brand">
                              {group.alternatives.length} {tDetail('materials.options')}
                            </Badge>
                          </Group>
                          <Group gap="xs">
                            {group.alternatives.map((materialId: string, altIndex: number) => (
                              <Badge key={altIndex} variant="outline">
                                {materialId}
                              </Badge>
                            ))}
                          </Group>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                </Stack>
              )}
          </Stack>
        </MoodBCard>

        <MoodBCard>
          <Stack gap="md">
            <Text fw={600}>{tDetail('rooms.title')}</Text>
            {selectedApproach.roomProfiles && selectedApproach.roomProfiles.length > 0 ? (
              <Stack gap="md">
                {selectedApproach.roomProfiles.map((profile: any, index: number) => (
                  <Paper key={index} p="md" withBorder radius="md">
                    <Stack gap="sm">
                      <Group justify="space-between">
                        <Title order={4}>{profile.roomType}</Title>
                        {profile.materials && profile.materials.length > 0 && (
                          <Badge variant="light" color="brand">
                            {profile.materials.length} {tDetail('materials.defaults')}
                          </Badge>
                        )}
                      </Group>

                      {profile.materials && profile.materials.length > 0 && (
                        <Group gap="xs">
                          {profile.materials.map((materialId: string, matIndex: number) => (
                            <Badge key={matIndex} variant="outline">
                              {materialId}
                            </Badge>
                          ))}
                        </Group>
                      )}

                      {profile.images && profile.images.length > 0 && (
                        <>
                          <Divider />
                          <Group gap="xs" mb="sm">
                            <IconPhoto size={16} />
                            <Text fw={500} size="sm" c="dimmed">
                              {tDetail('images')} ({profile.images.length})
                            </Text>
                          </Group>
                          <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="md">
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
                                    alt={`${profile.roomType} - Image ${imgIndex + 1}`}
                                    fit="cover"
                                    style={{ width: '100%', height: '100%' }}
                                  />
                                </Box>
                              </Paper>
                            ))}
                          </SimpleGrid>
                        </>
                      )}
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            ) : (
              <Text size="sm" c="dimmed">
                {tDetail('rooms.noProfiles')}
              </Text>
            )}
          </Stack>
        </MoodBCard>
      </Stack>
    </Container>
  )
}

