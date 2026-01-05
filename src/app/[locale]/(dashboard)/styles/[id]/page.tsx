/**
 * User-Facing Style Detail Page
 * View style details (global + approved public + personal)
 */

'use client'

import { Container, Title, Text, Stack, Grid, Image, Badge, Group, Paper, Divider, SimpleGrid, Box, Tabs, Select, Button, Modal, Loader, Alert } from '@mantine/core'
import { IconBuildingStore, IconDiamond, IconDoor, IconPalette, IconPhoto, IconSparkles, IconTexture, IconCopy, IconFolder, IconCheck, IconX } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'
import { useParams, useRouter } from 'next/navigation'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { ImageWithFallback } from '@/components/ui/ImageWithFallback'
import { useStyle } from '@/hooks/useStyles'
import { useStyleImages, useStyleRoomImages, useStyleMaterialImages } from '@/hooks/useStyleImages'
import { useStyleTextures } from '@/hooks/useStyleTextures'
import { useStyleMaterials } from '@/hooks/useStyleMaterials'
import { useImageViewer } from '@/contexts/ImageViewerContext'
import { useProjects } from '@/hooks/useProjects'
import { useForkFromStyle } from '@/hooks/useProjectStyle'
import { useAllColors, type Color } from '@/hooks/useColors'
import { useMemo, useState } from 'react'

export default function StyleDetailPage() {
  const tCommon = useTranslations('common')
  const t = useTranslations('projectStyle')
  const params = useParams()
  const router = useRouter()
  const locale = (params?.locale as string) || 'he'
  const styleId = (params?.id as string) || ''

  const { data: style, isLoading, error } = useStyle(styleId)
  const { openImages } = useImageViewer()

  // Projects for "Use for Project" modal
  const { data: projectsData, isLoading: projectsLoading } = useProjects()
  const forkMutation = useForkFromStyle()

  // Modal state for "Use for Project"
  const [useForProjectModalOpen, setUseForProjectModalOpen] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [forkStatus, setForkStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [forkError, setForkError] = useState<string | null>(null)
  const [forkResult, setForkResult] = useState<{ forkedRoomsCount: number } | null>(null)

  const projects = projectsData?.data || []

  const handleUseForProject = async () => {
    if (!selectedProjectId) return

    setForkStatus('loading')
    setForkError(null)

    try {
      const result = await forkMutation.mutateAsync({
        projectId: selectedProjectId,
        sourceStyleId: styleId,
      })
      setForkStatus('success')
      setForkResult({ forkedRoomsCount: result.forkedRoomsCount })
    } catch (err: any) {
      setForkStatus('error')
      setForkError(err.message || t('messages.forkError'))
    }
  }

  const handleCloseModal = () => {
    setUseForProjectModalOpen(false)
    setSelectedProjectId(null)
    setForkStatus('idle')
    setForkError(null)
    setForkResult(null)
  }

  const handleGoToProjectStyle = () => {
    if (selectedProjectId) {
      router.push(`/${locale}/projects/${selectedProjectId}/style`)
    }
    handleCloseModal()
  }

  // Fetch categorized images
  const { data: roomImagesData } = useStyleRoomImages(styleId)
  const { data: materialImagesData } = useStyleMaterialImages(styleId)
  const { data: texturesData } = useStyleTextures(styleId)
  const { data: materialsData } = useStyleMaterials(styleId)

  // Fetch all colors for color palette display
  const { data: allColors } = useAllColors()

  // State for room type filter
  const [selectedRoomType, setSelectedRoomType] = useState<string | null>(null)

  const currentLocale = locale === 'he' ? 'he' : 'en'

  // Create color lookup map by ID
  const colorMap = useMemo(() => {
    const map = new Map<string, Color>()
    if (allColors) {
      allColors.forEach((color) => map.set(color.id, color))
    }
    return map
  }, [allColors])

  // Extract room images grouped by room type
  const roomImages = roomImagesData?.data.images || []
  const roomTypeOptions = useMemo(() => {
    const types = new Set(roomImages.map(img => img.roomType).filter(Boolean))
    return Array.from(types).map(type => ({
      value: type!,
      label: type!,
    }))
  }, [roomImages])

  const filteredRoomImages = useMemo(() => {
    if (!selectedRoomType) return roomImages
    return roomImages.filter(img => img.roomType === selectedRoomType)
  }, [roomImages, selectedRoomType])

  // Material and texture data
  const materialImages = materialImagesData?.data.images || []
  const textures = texturesData?.data.textures || []
  const texturesGrouped = texturesData?.data.groupedByCategory || {}
  const materials = materialsData?.data?.materials || []
  const materialsGrouped = materialsData?.data?.groupedByCategory || {}

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
        {/* Composite Hero Image */}
        {style.compositeImageUrl && (
          <Paper radius="lg" style={{ overflow: 'hidden' }} shadow="md">
            <Box
              style={{
                width: '100%',
                height: 400,
                position: 'relative',
              }}
            >
              <ImageWithFallback
                src={style.compositeImageUrl}
                alt={`${style.name[currentLocale]} - Composite Mood Board`}
                fit="cover"
                height={400}
                width="100%"
                maxRetries={3}
                retryDelay={1000}
              />
            </Box>
          </Paper>
        )}

        {/* Header */}
        <Group justify="space-between" align="flex-start">
          <div style={{ flex: 1 }}>
            <Group gap="xs" mb="xs" wrap="wrap">
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
              {style.priceLevel && (
                <Badge
                  size="lg"
                  variant="filled"
                  color={style.priceLevel === 'LUXURY' ? 'grape' : 'blue'}
                  leftSection={style.priceLevel === 'LUXURY' ? <IconDiamond size={14} /> : undefined}
                >
                  {style.priceLevel === 'LUXURY'
                    ? (locale === 'he' ? 'יוקרתי' : 'Luxury')
                    : (locale === 'he' ? 'רגיל' : 'Regular')}
                </Badge>
              )}
              {style.roomCategory && (
                <Badge size="lg" variant="light" color="teal" leftSection={<IconBuildingStore size={14} />}>
                  {style.roomCategory}
                </Badge>
              )}
            </Group>
            <Title order={1} mb="xs">
            {style.name[currentLocale]}
          </Title>
          <Group gap="md" wrap="wrap">
            <Group gap="xs">
              <IconSparkles size={20} />
              <Text size="lg" c="dimmed">
                {style.approach.name[currentLocale]}
              </Text>
            </Group>
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

          {/* Use for Project Button */}
          <Button
            size="md"
            variant="filled"
            color="brand"
            leftSection={<IconCopy size={18} />}
            onClick={() => setUseForProjectModalOpen(true)}
          >
            {locale === 'he' ? 'השתמש בפרויקט' : 'Use for Project'}
          </Button>
        </Group>

        {/* Anchor Image */}
        {style.anchorImageUrl && (
          <Paper shadow="sm" p="md" withBorder>
            <Group gap="xs" mb="md">
              <IconPhoto size={20} color="#df2538" />
              <Text fw={600}>{locale === 'he' ? 'תמונת עוגן' : 'Anchor Image'}</Text>
            </Group>
            <Paper radius="md" style={{ overflow: 'hidden' }}>
              <Box
                style={{
                  width: '100%',
                  height: 300,
                  position: 'relative',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  if (style.anchorImageUrl) {
                    openImages([{
                      url: style.anchorImageUrl,
                      title: style.name[currentLocale],
                      description: locale === 'he' ? 'תמונת עוגן' : 'Anchor Image',
                    }], 0)
                  }
                }}
              >
                <ImageWithFallback
                  src={style.anchorImageUrl}
                  alt={`${style.name[currentLocale]} - Anchor`}
                  fit="cover"
                  height={300}
                  width="100%"
                  maxRetries={3}
                  retryDelay={1000}
                />
              </Box>
            </Paper>
          </Paper>
        )}

        {/* Tabs for Content Organization */}
        <Tabs defaultValue="overview" variant="pills" radius="md">
          <Tabs.List>
            <Tabs.Tab value="overview" leftSection={<IconPalette size={16} />}>
              {locale === 'he' ? 'סקירה' : 'Overview'}
            </Tabs.Tab>
            <Tabs.Tab value="rooms" leftSection={<IconDoor size={16} />}>
              {locale === 'he' ? 'חדרים' : 'Rooms'}
              {roomImages.length > 0 && (
                <Badge size="sm" variant="light" ml="xs">
                  {roomImages.length}
                </Badge>
              )}
            </Tabs.Tab>
            <Tabs.Tab value="materials" leftSection={<IconTexture size={16} />}>
              {locale === 'he' ? 'חומרים ומרקמים' : 'Materials & Textures'}
              {(materials.length > 0 || materialImages.length > 0 || textures.length > 0) && (
                <Badge size="sm" variant="light" ml="xs">
                  {materials.length + textures.length}
                </Badge>
              )}
            </Tabs.Tab>
            <Tabs.Tab value="images" leftSection={<IconPhoto size={16} />}>
              {locale === 'he' ? 'כל התמונות' : 'All Images'}
              {style.images && style.images.length > 0 && (
                <Badge size="sm" variant="light" ml="xs">
                  {style.images.length}
                </Badge>
              )}
            </Tabs.Tab>
          </Tabs.List>

          {/* Overview Tab */}
          <Tabs.Panel value="overview" pt="xl">
            <Stack gap="md">
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
                    {/* Check both views (new schema) and images (legacy) */}
                    {((roomProfile.views && roomProfile.views.length > 0) || (roomProfile.images && roomProfile.images.length > 0)) && (
                      <Badge size="lg" variant="light" leftSection={<IconPhoto size={14} />}>
                        {(roomProfile.views?.length || roomProfile.images?.length || 0)} Images
                      </Badge>
                    )}
                  </Group>

                  {/* Room Images - Support both views (new) and images (legacy) */}
                  {(() => {
                    // Get images from views (new schema) or images (legacy)
                    const roomViewImages = roomProfile.views
                      ?.filter((v: any) => v.url && v.status === 'COMPLETED')
                      .map((v: any) => v.url) || []
                    const legacyImages = roomProfile.images || []
                    const allImages = roomViewImages.length > 0 ? roomViewImages : legacyImages

                    if (allImages.length === 0) return null

                    return (
                      <>
                        <Divider />
                        <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="md">
                          {allImages.map((imageUrl: string, imgIndex: number) => (
                            <Paper
                              key={imgIndex}
                              p="xs"
                              withBorder
                              radius="md"
                              style={{ overflow: 'hidden', cursor: 'pointer' }}
                              onClick={() =>
                                openImages(
                                  allImages.map((url: string, idx: number) => ({
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
                                <ImageWithFallback
                                  src={imageUrl}
                                  alt={`${roomProfile.description?.[currentLocale] || `Room ${index + 1}`} - Image ${imgIndex + 1}`}
                                  fit="cover"
                                  height="100%"
                                  width="100%"
                                  maxRetries={3}
                                  retryDelay={1000}
                                />
                              </Box>
                            </Paper>
                          ))}
                        </SimpleGrid>
                      </>
                    )
                  })()}

                  {/* Color Palette */}
                  {roomProfile.colorPalette && (
                    <>
                      <Divider />
                      <div>
                        <Text fw={600} mb="xs">
                          {locale === 'he' ? 'פלטת צבעים' : 'Color Palette'}
                        </Text>
                        {roomProfile.colorPalette.description?.[currentLocale] && (
                          <Text size="sm" c="dimmed" mb="sm">
                            {roomProfile.colorPalette.description[currentLocale]}
                          </Text>
                        )}
                        <Group gap="sm" wrap="wrap">
                          {/* Primary Color */}
                          {roomProfile.colorPalette.primaryId && (() => {
                            const color = colorMap.get(roomProfile.colorPalette.primaryId)
                            return color ? (
                              <Badge
                                key={color.id}
                                variant="filled"
                                size="lg"
                                leftSection={
                                  <Box
                                    style={{
                                      width: 16,
                                      height: 16,
                                      borderRadius: '50%',
                                      backgroundColor: color.hex,
                                      border: '2px solid rgba(255,255,255,0.5)',
                                    }}
                                  />
                                }
                                style={{ backgroundColor: '#df2538' }}
                              >
                                {color.name[currentLocale]}
                              </Badge>
                            ) : (
                              <Badge variant="filled" size="lg">
                                {locale === 'he' ? 'צבע ראשי' : 'Primary'}
                              </Badge>
                            )
                          })()}

                          {/* Secondary Colors */}
                          {roomProfile.colorPalette.secondaryIds?.map((colorId: string, idx: number) => {
                            const color = colorMap.get(colorId)
                            return color ? (
                              <Badge
                                key={`secondary-${colorId}-${idx}`}
                                variant="light"
                                size="lg"
                                leftSection={
                                  <Box
                                    style={{
                                      width: 16,
                                      height: 16,
                                      borderRadius: '50%',
                                      backgroundColor: color.hex,
                                      border: '1px solid #ccc',
                                    }}
                                  />
                                }
                              >
                                {color.name[currentLocale]}
                              </Badge>
                            ) : (
                              <Badge key={`secondary-fallback-${idx}`} variant="light" size="lg">
                                {locale === 'he' ? `משני ${idx + 1}` : `Secondary ${idx + 1}`}
                              </Badge>
                            )
                          })}

                          {/* Accent Colors */}
                          {roomProfile.colorPalette.accentIds?.map((colorId: string, idx: number) => {
                            const color = colorMap.get(colorId)
                            return color ? (
                              <Badge
                                key={`accent-${colorId}-${idx}`}
                                variant="outline"
                                size="lg"
                                leftSection={
                                  <Box
                                    style={{
                                      width: 16,
                                      height: 16,
                                      borderRadius: '50%',
                                      backgroundColor: color.hex,
                                      border: '1px solid #ccc',
                                    }}
                                  />
                                }
                              >
                                {color.name[currentLocale]}
                              </Badge>
                            ) : (
                              <Badge key={`accent-fallback-${idx}`} variant="outline" size="lg">
                                {locale === 'he' ? `הדגשה ${idx + 1}` : `Accent ${idx + 1}`}
                              </Badge>
                            )
                          })}
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
          </Tabs.Panel>

          {/* Rooms Tab */}
          <Tabs.Panel value="rooms" pt="xl">
            <Stack gap="md">
              {/* Room Type Filter */}
              {roomTypeOptions.length > 0 && (
                <Group justify="space-between" align="center">
                  <Text fw={500}>{locale === 'he' ? 'סנן לפי סוג חדר' : 'Filter by room type'}</Text>
                  <Select
                    placeholder={locale === 'he' ? 'כל החדרים' : 'All rooms'}
                    data={roomTypeOptions}
                    value={selectedRoomType}
                    onChange={setSelectedRoomType}
                    clearable
                    style={{ width: 250 }}
                  />
                </Group>
              )}

              {/* Room Images Grid */}
              {filteredRoomImages.length > 0 ? (
                <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="md">
                  {filteredRoomImages.map((image, index) => (
                    <Paper
                      key={image.id}
                      p="xs"
                      withBorder
                      radius="md"
                      style={{ overflow: 'hidden', cursor: 'pointer' }}
                      onClick={() =>
                        openImages(
                          filteredRoomImages.map((img) => ({
                            url: img.url,
                            title: img.roomType || style.name[currentLocale],
                            description: img.description || '',
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
                        <ImageWithFallback
                          src={image.url}
                          alt={image.roomType || 'Room image'}
                          fit="cover"
                          height="100%"
                          width="100%"
                          maxRetries={3}
                          retryDelay={1000}
                        />
                      </Box>
                      {image.roomType && (
                        <Text size="xs" mt="xs" fw={500} ta="center">
                          {image.roomType}
                        </Text>
                      )}
                    </Paper>
                  ))}
                </SimpleGrid>
              ) : (
                <Paper p="xl" withBorder style={{ borderStyle: 'dashed' }}>
                  <Stack align="center" gap="sm">
                    <IconDoor size={48} color="#ccc" />
                    <Text size="sm" c="dimmed" ta="center">
                      {locale === 'he' ? 'אין תמונות חדרים זמינות' : 'No room images available'}
                    </Text>
                  </Stack>
                </Paper>
              )}
            </Stack>
          </Tabs.Panel>

          {/* Materials & Textures Tab */}
          <Tabs.Panel value="materials" pt="xl">
            <Grid gutter="lg">
              {/* Materials Column - Entity Data */}
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Paper p="md" withBorder>
                  <Group gap="xs" mb="md">
                    <IconPhoto size={20} color="#df2538" />
                    <Text fw={600}>{locale === 'he' ? 'חומרים' : 'Materials'}</Text>
                    <Badge size="sm" variant="light">
                      {materials.length}
                    </Badge>
                  </Group>

                  {materials.length > 0 ? (
                    <Stack gap="md">
                      {materials.map((material) => (
                        <Paper
                          key={material.id}
                          p="md"
                          withBorder
                          radius="md"
                          style={{ cursor: 'pointer' }}
                          onClick={() => {
                            const imageUrl = material.assets?.thumbnail || material.assets?.images?.[0]
                            if (imageUrl) {
                              openImages([{
                                url: imageUrl,
                                title: locale === 'he' ? material.name.he : material.name.en,
                                description: locale === 'he' ? material.category?.name?.he : material.category?.name?.en,
                              }], 0)
                            }
                          }}
                        >
                          {/* Material Image */}
                          {(material.assets?.thumbnail || material.assets?.images?.[0]) && (
                            <Box
                              style={{
                                width: '100%',
                                height: 200,
                                overflow: 'hidden',
                                borderRadius: 'var(--mantine-radius-md)',
                                marginBottom: '0.5rem',
                              }}
                            >
                              <ImageWithFallback
                                src={material.assets?.thumbnail || material.assets?.images?.[0]}
                                alt={locale === 'he' ? material.name.he : material.name.en}
                                fit="cover"
                                height={200}
                                width="100%"
                                maxRetries={3}
                                retryDelay={1000}
                              />
                            </Box>
                          )}

                          {/* Material Name */}
                          <Text size="sm" fw={500}>
                            {locale === 'he' ? material.name.he : material.name.en}
                          </Text>

                          {/* Application Info (where this material is used) */}
                          {(material as any).application && (
                            <Text size="xs" c="dimmed" mt={2}>
                              {locale === 'he'
                                ? (material as any).application.he
                                : (material as any).application.en}
                              {(material as any).finish && ` • ${(material as any).finish}`}
                            </Text>
                          )}

                          {/* Material Badges */}
                          <Group gap="xs" mt="xs" wrap="wrap">
                            {/* Category Badge */}
                            {material.category && (
                              <Badge size="xs" variant="light" color="blue">
                                {locale === 'he' ? material.category.name?.he : material.category.name?.en}
                              </Badge>
                            )}

                            {/* Finish Badge */}
                            {(material as any).finish && (
                              <Badge size="xs" variant="light" color="cyan">
                                {(material as any).finish}
                              </Badge>
                            )}

                            {/* SKU Badge (if not abstract) */}
                            {material.sku && !material.isAbstract && (
                              <Badge size="xs" variant="light" color="gray">
                                SKU: {material.sku}
                              </Badge>
                            )}

                            {/* AI Generated Badge */}
                            {material.isAbstract && (
                              <Badge size="xs" variant="filled" color="grape" leftSection={<IconSparkles size={10} />}>
                                {locale === 'he' ? 'נוצר ע"י AI' : 'AI Generated'}
                              </Badge>
                            )}

                            {/* Linked Texture Indicator */}
                            {material.texture && (
                              <Badge size="xs" variant="outline" color="teal" leftSection={<IconTexture size={10} />}>
                                {locale === 'he' ? 'מקושר למרקם' : 'Has Texture'}
                              </Badge>
                            )}

                            {/* Usage Count */}
                            {material.usageCount > 1 && (
                              <Badge size="xs" variant="light" color="orange">
                                {locale === 'he'
                                  ? `משמש ב-${material.usageCount} סגנונות`
                                  : `Used in ${material.usageCount} styles`}
                              </Badge>
                            )}
                          </Group>
                        </Paper>
                      ))}
                    </Stack>
                  ) : materialImages.length > 0 ? (
                    // Fallback to material images if no entities
                    <Stack gap="md">
                      {materialImages.map((image, index) => (
                        <Paper
                          key={image.id}
                          p="md"
                          withBorder
                          radius="md"
                          style={{ cursor: 'pointer' }}
                          onClick={() =>
                            openImages(
                              materialImages.map((img) => ({
                                url: img.url,
                                title: img.description || (locale === 'he' ? 'חומר' : 'Material'),
                                description: style.name[currentLocale],
                              })),
                              index
                            )
                          }
                        >
                          <Box
                            style={{
                              width: '100%',
                              height: 200,
                              overflow: 'hidden',
                              borderRadius: 'var(--mantine-radius-md)',
                              marginBottom: '0.5rem',
                            }}
                          >
                            <ImageWithFallback
                              src={image.url}
                              alt={image.description || 'Material'}
                              fit="cover"
                              height={200}
                              width="100%"
                              maxRetries={3}
                              retryDelay={1000}
                            />
                          </Box>
                          {image.description && (
                            <Text size="sm" fw={500}>
                              {image.description}
                            </Text>
                          )}
                          {image.tags && image.tags.length > 0 && (
                            <Group gap="xs" mt="xs">
                              {image.tags.map((tag, idx) => (
                                <Badge key={idx} size="xs" variant="light">
                                  {tag}
                                </Badge>
                              ))}
                            </Group>
                          )}
                        </Paper>
                      ))}
                    </Stack>
                  ) : (
                    <Paper p="xl" withBorder style={{ borderStyle: 'dashed' }}>
                      <Stack align="center" gap="sm">
                        <IconPhoto size={48} color="#ccc" />
                        <Text size="sm" c="dimmed" ta="center">
                          {locale === 'he' ? 'אין חומרים' : 'No materials'}
                        </Text>
                      </Stack>
                    </Paper>
                  )}
                </Paper>
              </Grid.Col>

              {/* Textures Column */}
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Paper p="md" withBorder>
                  <Group gap="xs" mb="md">
                    <IconTexture size={20} color="#df2538" />
                    <Text fw={600}>{locale === 'he' ? 'מרקמים' : 'Textures'}</Text>
                    <Badge size="sm" variant="light">
                      {textures.length}
                    </Badge>
                  </Group>

                  {textures.length > 0 ? (
                    <Stack gap="md">
                      {textures.map((texture) => (
                        <Paper
                          key={texture.id}
                          p="md"
                          withBorder
                          radius="md"
                          style={{ cursor: 'pointer' }}
                          onClick={() =>
                            openImages([{
                              url: texture.imageUrl,
                              title: locale === 'he' ? texture.name.he : texture.name.en,
                              description: locale === 'he' ? texture.category.name.he : texture.category.name.en,
                            }], 0)
                          }
                        >
                          <Box
                            style={{
                              width: '100%',
                              height: 200,
                              overflow: 'hidden',
                              borderRadius: 'var(--mantine-radius-md)',
                              marginBottom: '0.5rem',
                            }}
                          >
                            <Image
                              src={texture.imageUrl}
                              alt={locale === 'he' ? texture.name.he : texture.name.en}
                              fit="cover"
                              style={{ width: '100%', height: '100%' }}
                            />
                          </Box>
                          <Text size="sm" fw={500}>
                            {locale === 'he' ? texture.name.he : texture.name.en}
                          </Text>
                          <Group gap="xs" mt="xs" wrap="wrap">
                            <Badge size="xs" variant="light" color="blue">
                              {locale === 'he' ? texture.category.name.he : texture.category.name.en}
                            </Badge>
                            <Badge size="xs" variant="light" color="teal">
                              {locale === 'he' ? texture.type.name.he : texture.type.name.en}
                            </Badge>
                            {texture.usageCount > 1 && (
                              <Badge size="xs" variant="light" color="grape">
                                {locale === 'he'
                                  ? `משמש ב-${texture.usageCount} סגנונות`
                                  : `Used in ${texture.usageCount} styles`}
                              </Badge>
                            )}
                          </Group>
                        </Paper>
                      ))}
                    </Stack>
                  ) : (
                    <Paper p="xl" withBorder style={{ borderStyle: 'dashed' }}>
                      <Stack align="center" gap="sm">
                        <IconTexture size={48} color="#ccc" />
                        <Text size="sm" c="dimmed" ta="center">
                          {locale === 'he' ? 'אין מרקמים' : 'No textures'}
                        </Text>
                      </Stack>
                    </Paper>
                  )}
                </Paper>
              </Grid.Col>
            </Grid>
          </Tabs.Panel>

          {/* All Images Tab */}
          <Tabs.Panel value="images" pt="xl">
            {style.images && style.images.length > 0 ? (
              <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="md">
                {style.images.map((image: string, index: number) => (
                  <Paper
                    key={index}
                    p="xs"
                    withBorder
                    radius="md"
                    style={{ overflow: 'hidden', cursor: 'pointer' }}
                    onClick={() =>
                      openImages(
                        style.images.map((url: string, idx: number) => ({
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
            ) : (
              <Paper p="xl" withBorder style={{ borderStyle: 'dashed' }}>
                <Stack align="center" gap="sm">
                  <IconPhoto size={48} color="#ccc" />
                  <Text size="sm" c="dimmed" ta="center">
                    {locale === 'he' ? 'אין תמונות זמינות' : 'No images available'}
                  </Text>
                </Stack>
              </Paper>
            )}
          </Tabs.Panel>
        </Tabs>
      </Stack>

      {/* Use for Project Modal */}
      <Modal
        opened={useForProjectModalOpen}
        onClose={handleCloseModal}
        title={locale === 'he' ? 'השתמש בסגנון זה לפרויקט' : 'Use This Style for Project'}
        size="md"
      >
        <Stack gap="md">
          {forkStatus === 'idle' && (
            <>
              <Text size="sm" c="dimmed">
                {locale === 'he'
                  ? 'בחר פרויקט להעתקת הסגנון אליו. כל החדרים והאלמנטים יועתקו בחינם.'
                  : 'Select a project to copy this style to. All rooms and elements will be copied for free.'}
              </Text>

              {projectsLoading ? (
                <Stack align="center" py="md">
                  <Loader size="sm" />
                </Stack>
              ) : projects.length === 0 ? (
                <Alert color="yellow">
                  {locale === 'he'
                    ? 'אין לך פרויקטים עדיין. צור פרויקט חדש תחילה.'
                    : 'You have no projects yet. Create a project first.'}
                </Alert>
              ) : (
                <Select
                  label={locale === 'he' ? 'בחר פרויקט' : 'Select Project'}
                  placeholder={locale === 'he' ? 'בחר פרויקט...' : 'Select a project...'}
                  data={projects.map((p: any) => ({
                    value: p.id,
                    label: `${p.name}${p.client ? ` (${p.client.name})` : ''}`,
                  }))}
                  value={selectedProjectId}
                  onChange={setSelectedProjectId}
                  searchable
                  leftSection={<IconFolder size={16} />}
                />
              )}

              <Group justify="flex-end" mt="md">
                <Button variant="subtle" onClick={handleCloseModal}>
                  {locale === 'he' ? 'ביטול' : 'Cancel'}
                </Button>
                <Button
                  onClick={handleUseForProject}
                  disabled={!selectedProjectId}
                  leftSection={<IconCopy size={16} />}
                >
                  {locale === 'he' ? 'העתק לפרויקט' : 'Copy to Project'}
                </Button>
              </Group>
            </>
          )}

          {forkStatus === 'loading' && (
            <Stack align="center" py="xl">
              <Loader size="lg" />
              <Text size="sm" c="dimmed">
                {locale === 'he' ? 'מעתיק סגנון וחדרים...' : 'Copying style and rooms...'}
              </Text>
            </Stack>
          )}

          {forkStatus === 'success' && forkResult && (
            <Stack align="center" py="lg" gap="md">
              <Paper p="md" radius="xl" bg="green.0">
                <IconCheck size={48} color="green" />
              </Paper>
              <Text fw={600} ta="center">
                {locale === 'he' ? 'הסגנון הועתק בהצלחה!' : 'Style copied successfully!'}
              </Text>
              <Text size="sm" c="dimmed" ta="center">
                {locale === 'he'
                  ? `${forkResult.forkedRoomsCount} חדרים נוספו לפרויקט`
                  : `${forkResult.forkedRoomsCount} rooms added to the project`}
              </Text>
              <Group>
                <Button variant="subtle" onClick={handleCloseModal}>
                  {locale === 'he' ? 'סגור' : 'Close'}
                </Button>
                <Button onClick={handleGoToProjectStyle}>
                  {locale === 'he' ? 'עבור לעמוד הסגנון' : 'Go to Style Page'}
                </Button>
              </Group>
            </Stack>
          )}

          {forkStatus === 'error' && (
            <Stack align="center" py="lg" gap="md">
              <Paper p="md" radius="xl" bg="red.0">
                <IconX size={48} color="red" />
              </Paper>
              <Text fw={600} c="red" ta="center">
                {locale === 'he' ? 'שגיאה בהעתקת הסגנון' : 'Error copying style'}
              </Text>
              {forkError && (
                <Text size="sm" c="dimmed" ta="center">
                  {forkError}
                </Text>
              )}
              <Group>
                <Button variant="subtle" onClick={handleCloseModal}>
                  {locale === 'he' ? 'סגור' : 'Close'}
                </Button>
                <Button onClick={() => setForkStatus('idle')}>
                  {locale === 'he' ? 'נסה שנית' : 'Try Again'}
                </Button>
              </Group>
            </Stack>
          )}
        </Stack>
      </Modal>
    </Container>
  )
}

