/**
 * User-Facing Style Detail Page
 * View style details (global + approved public + personal)
 */

'use client'

import { Container, Title, Text, Stack, Grid, Image, Badge, Group, Paper, Divider, SimpleGrid, Box } from '@mantine/core'
import { IconPhoto } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { useStyle } from '@/hooks/useStyles'
import { useImageViewer } from '@/contexts/ImageViewerContext'

export default function StyleDetailPage() {
  const tCommon = useTranslations('common')
  const params = useParams()
  const locale = params.locale as string
  const styleId = params.id as string

  const { data: style, isLoading, error } = useStyle(styleId)
  const { openImages } = useImageViewer()

  const currentLocale = locale === 'he' ? 'he' : 'en'

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

  // Check if style has required data
  if (!style.approach) {
    return (
      <Container size="xl" py="xl">
        <ErrorState message="Style is incomplete. Missing approach information." />
      </Container>
    )
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <div>
          <Group gap="xs" mb="xs">
            {style.category && (
              <Badge size="lg" variant="light">
                {style.category.name[currentLocale]}
              </Badge>
            )}
            {style.subCategory && (
              <Badge size="lg" variant="outline">
                {style.subCategory.name[currentLocale]}
              </Badge>
            )}
          </Group>
          <Title order={1} mb="xs">
            {style.name[currentLocale]}
          </Title>
          <Group gap="md">
            <Text size="lg" c="dimmed">
              {style.approach.name[currentLocale]}
            </Text>
            {style.color && (
              <Group gap="xs">
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 4,
                    backgroundColor: style.color.hex,
                    border: '1px solid #ddd',
                  }}
                />
                <Text size="lg" c="dimmed">
                  {style.color.name[currentLocale]}
                </Text>
              </Group>
            )}
          </Group>
        </div>

        {/* Images */}
        {style.images && style.images.length > 0 && (
          <Paper shadow="sm" p="lg" withBorder>
            <Group gap="xs" mb="md">
              <IconPhoto size={20} />
              <Text fw={600}>Style Images</Text>
              <Badge size="sm" variant="light">
                {style.images.length}
              </Badge>
            </Group>
            <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="md">
              {style.images.map((image, index) => (
                <Paper
                  key={index}
                  p="xs"
                  withBorder
                  radius="md"
                  style={{ overflow: 'hidden', cursor: 'pointer' }}
                  onClick={() =>
                    openImages(
                      style.images.map((url, idx) => ({
                        url,
                        title: `${style.name[currentLocale]} - תמונה ${idx + 1}`,
                        description: style.approach?.name?.[currentLocale] || '',
                      })),
                      index
                    )
                  }
                >
                  <Box
                    style={{
                      aspectRatio: '1',
                      overflow: 'hidden',
                      borderRadius: 'var(--mantine-radius-sm)',
                      transition: 'transform 0.2s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                  >
                    <Image
                      src={image}
                      alt={`${style.name[currentLocale]} - Image ${index + 1}`}
                      fit="cover"
                      style={{ width: '100%', height: '100%' }}
                    />
                  </Box>
                </Paper>
              ))}
            </SimpleGrid>
          </Paper>
        )}

        {/* Description */}
        {style.detailedContent && (
          <Paper shadow="sm" p="lg" withBorder>
            <Stack gap="md">
              <Title order={2}>About This Style</Title>
              {style.detailedContent[currentLocale]?.description && (
                <Text>{style.detailedContent[currentLocale].description}</Text>
              )}

              {/* Characteristics */}
              {style.detailedContent[currentLocale]?.characteristics &&
                style.detailedContent[currentLocale].characteristics.length > 0 && (
                  <>
                    <Divider />
                    <div>
                      <Title order={3} size="h4" mb="xs">
                        Key Characteristics
                      </Title>
                      <Stack gap="xs">
                        {style.detailedContent[currentLocale].characteristics.map(
                          (char: string, index: number) => (
                            <Text key={index}>• {char}</Text>
                          )
                        )}
                      </Stack>
                    </div>
                  </>
                )}
            </Stack>
          </Paper>
        )}

        {/* Room Profiles */}
        {style.roomProfiles && (style.roomProfiles as any[]).length > 0 && (
          <Stack gap="md">
            <Paper shadow="sm" p="md" withBorder>
              <Title order={3} size="h4">
                Room Designs
              </Title>
              <Text c="dimmed" size="sm">
                {(style.roomProfiles as any[]).length} room configurations available
              </Text>
            </Paper>

            {(style.roomProfiles as any[]).map((roomProfile: any, index: number) => (
              <Paper key={index} shadow="sm" p="lg" withBorder>
                <Stack gap="md">
                  {/* Room Header */}
                  <Group justify="space-between" align="flex-start">
                    <div>
                      <Title order={4}>
                        {roomProfile.description?.[currentLocale] || `Room Configuration ${index + 1}`}
                      </Title>
                      {roomProfile.roomTypeId && (
                        <Text c="dimmed" size="xs" mt={4}>
                          Room Type ID: {roomProfile.roomTypeId.slice(0, 8)}...
                        </Text>
                      )}
                    </div>
                    {roomProfile.images && roomProfile.images.length > 0 && (
                      <Badge size="lg" variant="light" leftSection={<IconPhoto size={14} />}>
                        {roomProfile.images.length} Images
                      </Badge>
                    )}
                  </Group>

                  {/* Room Images */}
                  {roomProfile.images && roomProfile.images.length > 0 && (
                    <>
                      <Divider />
                      <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="md">
                        {roomProfile.images.map((imageUrl: string, imgIndex: number) => (
                          <Paper
                            key={imgIndex}
                            p="xs"
                            withBorder
                            radius="md"
                            style={{ overflow: 'hidden', cursor: 'pointer' }}
                            onClick={() =>
                              openImages(
                                roomProfile.images.map((url: string, idx: number) => ({
                                  url,
                                  title: `${roomProfile.description?.[currentLocale] || `Room ${index + 1}`} - Image ${idx + 1}`,
                                  description: style.name[currentLocale],
                                })),
                                imgIndex
                              )
                            }
                          >
                            <Box
                              style={{
                                aspectRatio: '1',
                                overflow: 'hidden',
                                borderRadius: 'var(--mantine-radius-sm)',
                                transition: 'transform 0.2s ease',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
                              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                            >
                              <Image
                                src={imageUrl}
                                alt={`${roomProfile.description?.[currentLocale] || `Room ${index + 1}`} - Image ${imgIndex + 1}`}
                                fit="cover"
                                style={{ width: '100%', height: '100%' }}
                              />
                            </Box>
                          </Paper>
                        ))}
                      </SimpleGrid>
                    </>
                  )}

                  {/* Color Palette */}
                  {roomProfile.colorPalette && (
                    <>
                      <Divider />
                      <div>
                        <Text fw={600} mb="xs">
                          Color Palette
                        </Text>
                        {roomProfile.colorPalette.description?.[currentLocale] && (
                          <Text size="sm" c="dimmed" mb="sm">
                            {roomProfile.colorPalette.description[currentLocale]}
                          </Text>
                        )}
                        <Group gap="xs">
                          {roomProfile.colorPalette.primaryId && (
                            <Badge variant="filled">Primary Color</Badge>
                          )}
                          {roomProfile.colorPalette.secondaryIds?.map((colorId: string, idx: number) => (
                            <Badge key={idx} variant="light">
                              Secondary {idx + 1}
                            </Badge>
                          ))}
                          {roomProfile.colorPalette.accentIds?.map((colorId: string, idx: number) => (
                            <Badge key={idx} variant="outline">
                              Accent {idx + 1}
                            </Badge>
                          ))}
                        </Group>
                      </div>
                    </>
                  )}

                  {/* Materials */}
                  {roomProfile.materials && roomProfile.materials.length > 0 && (
                    <>
                      <Divider />
                      <div>
                        <Text fw={600} mb="xs">
                          Materials
                        </Text>
                        <Stack gap="xs">
                          {roomProfile.materials.map((material: any, matIdx: number) => (
                            <Group key={matIdx} justify="space-between">
                              <Text size="sm">
                                {material.application?.[currentLocale] || `Material ${matIdx + 1}`}
                              </Text>
                              {material.finish && (
                                <Badge size="sm" variant="light">
                                  {material.finish}
                                </Badge>
                              )}
                            </Group>
                          ))}
                        </Stack>
                      </div>
                    </>
                  )}

                  {/* Design Tips */}
                  {roomProfile.designTips && roomProfile.designTips.length > 0 && (
                    <>
                      <Divider />
                      <div>
                        <Text fw={600} mb="xs">
                          Design Tips
                        </Text>
                        <Stack gap="xs">
                          {roomProfile.designTips.map((tip: any, tipIdx: number) => (
                            <Text key={tipIdx} size="sm">
                              • {tip.tip?.[currentLocale] || tip}
                            </Text>
                          ))}
                        </Stack>
                      </div>
                    </>
                  )}
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
      </Stack>
    </Container>
  )
}

