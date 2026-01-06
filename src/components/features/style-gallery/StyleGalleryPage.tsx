'use client'

import { Container, Stack, Divider, Tabs, Badge, Paper, Text, SimpleGrid, Box, Grid, Group } from '@mantine/core'
import { IconPalette, IconDoor, IconTexture, IconPhoto } from '@tabler/icons-react'
import { useMemo, useState } from 'react'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { ImageWithFallback } from '@/components/ui/ImageWithFallback'
import { useStyle } from '@/hooks/useStyles'
import { useStyleRoomImages } from '@/hooks/useStyleImages'
import { useStyleTextures } from '@/hooks/useStyleTextures'
import { useStyleMaterials } from '@/hooks/useStyleMaterials'
import { useAllColors, type Color } from '@/hooks/useColors'
import { useRoomTypes } from '@/hooks/useRoomTypes'
import { useImageViewer } from '@/contexts/ImageViewerContext'
import { StyleGalleryHero } from './StyleGalleryHero'
import { RoomGallerySection, type GalleryRoom } from './RoomGallerySection'
import { UseForProjectModal } from './UseForProjectModal'
import { MaterialsGrid } from './MaterialsGrid'
import { TexturesGrid } from './TexturesGrid'

interface StyleGalleryPageProps {
  styleId: string
  locale: 'he' | 'en'
}

export function StyleGalleryPage({ styleId, locale }: StyleGalleryPageProps) {
  const { data: style, isLoading, error } = useStyle(styleId)
  const { data: roomImagesData } = useStyleRoomImages(styleId)
  const { data: texturesData } = useStyleTextures(styleId)
  const { data: materialsData } = useStyleMaterials(styleId)
  const { data: allColors } = useAllColors()
  const { data: roomTypesData } = useRoomTypes()
  const { openImages } = useImageViewer()

  const [useForProjectModalOpen, setUseForProjectModalOpen] = useState(false)

  // Create room type lookup map by ID
  const roomTypeMap = useMemo(() => {
    const map = new Map<string, { name: { he: string; en: string } }>()
    if (roomTypesData?.data) {
      roomTypesData.data.forEach((rt: any) => map.set(rt.id, { name: rt.name }))
    }
    return map
  }, [roomTypesData])

  // Create color lookup map by ID
  const colorMap = useMemo(() => {
    const map = new Map<string, Color>()
    if (allColors) {
      allColors.forEach((color) => map.set(color.id, color))
    }
    return map
  }, [allColors])

  // Transform room data into gallery rooms
  const galleryRooms = useMemo(() => {
    if (!style?.roomProfiles) return []

    const roomImages = roomImagesData?.data.images || []
    const allMaterials = materialsData?.data?.materials || []
    const textures = texturesData?.data.textures || []

    // Group StyleImages by roomType
    const imagesByRoomType = new Map<string, string[]>()
    roomImages.forEach((img) => {
      if (img.roomType) {
        const existing = imagesByRoomType.get(img.roomType) || []
        existing.push(img.url)
        imagesByRoomType.set(img.roomType, existing)
      }
    })

    const rooms: GalleryRoom[] = []

    ;(style.roomProfiles as any[]).forEach((profile, index) => {
      // Get images from views (new schema) or images (legacy)
      const viewImages = profile.views
        ?.filter((v: any) => v.url && v.status === 'COMPLETED')
        .map((v: any) => v.url) || []
      const legacyImages = profile.images || []
      const roomTypeImages = imagesByRoomType.get(profile.roomTypeId) || []

      // Merge all image sources
      const allImages = [
        ...viewImages,
        ...legacyImages,
        ...roomTypeImages,
      ].filter((url, idx, arr) => arr.indexOf(url) === idx) // Remove duplicates

      // Get room type name
      const roomType = roomTypeMap.get(profile.roomTypeId)
      const roomTypeName = roomType?.name || { he: `חדר ${index + 1}`, en: `Room ${index + 1}` }

      // Get materials for this room (from profile)
      const profileMaterials = profile.materials?.map((m: any) => {
        // Find full material data if available
        const fullMaterial = allMaterials.find(
          (mat: any) => mat.id === m.materialId || mat.name?.en === m.application?.en
        )
        return fullMaterial || {
          id: `profile-${index}-mat-${m.application?.en || Math.random()}`,
          name: m.application || { he: '', en: '' },
          application: m.application,
          finish: m.finish,
          category: m.category,
          assets: {},
        }
      }) || []

      // Get textures for this room
      const roomTextures = textures.filter((t: any) =>
        profile.materials?.some((m: any) => m.materialId === t.linkedMaterial?.id)
      )

      rooms.push({
        id: profile.roomTypeId || `room-${index}`,
        roomTypeName, // Short name for display
        description: profile.description || { he: '', en: '' }, // Full description for modal
        images: allImages,
        colorPalette: profile.colorPalette,
        materials: profileMaterials,
        textures: roomTextures,
        designTips: profile.designTips || [],
      })
    })

    // Filter out rooms with no images
    return rooms.filter((room) => room.images.length > 0)
  }, [style, roomImagesData, materialsData, texturesData, roomTypeMap])

  // Get all materials and textures for the tabs
  const allMaterials = materialsData?.data?.materials || []
  const allTextures = texturesData?.data.textures || []
  const allStyleImages = style?.images || []

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
        <ErrorState message={locale === 'he' ? 'שגיאה בטעינת הסגנון' : 'Error loading style'} />
      </Container>
    )
  }

  if (!style.approach) {
    return (
      <Container size="xl" py="xl">
        <ErrorState message={locale === 'he' ? 'סגנון לא שלם. חסר מידע על גישה.' : 'Style is incomplete. Missing approach information.'} />
      </Container>
    )
  }

  return (
    <>
      <Container size="xl" py="md">
        <Stack gap={0}>
          {/* Hero Section */}
          <StyleGalleryHero
            style={style}
            locale={locale}
            onUseForProject={() => setUseForProjectModalOpen(true)}
          />

          {/* Tabs for Content Organization */}
          <Tabs defaultValue="rooms" variant="pills" radius="md" mt="xl">
            <Tabs.List>
              <Tabs.Tab value="overview" leftSection={<IconPalette size={16} />}>
                {locale === 'he' ? 'סקירה' : 'Overview'}
              </Tabs.Tab>
              <Tabs.Tab value="rooms" leftSection={<IconDoor size={16} />}>
                {locale === 'he' ? 'חדרים' : 'Rooms'}
                {galleryRooms.length > 0 && (
                  <Badge size="sm" variant="light" ml="xs">
                    {galleryRooms.length}
                  </Badge>
                )}
              </Tabs.Tab>
              <Tabs.Tab value="materials" leftSection={<IconTexture size={16} />}>
                {locale === 'he' ? 'חומרים ומרקמים' : 'Materials & Textures'}
                {(allMaterials.length > 0 || allTextures.length > 0) && (
                  <Badge size="sm" variant="light" ml="xs">
                    {allMaterials.length + allTextures.length}
                  </Badge>
                )}
              </Tabs.Tab>
              <Tabs.Tab value="images" leftSection={<IconPhoto size={16} />}>
                {locale === 'he' ? 'כל התמונות' : 'All Images'}
                {allStyleImages.length > 0 && (
                  <Badge size="sm" variant="light" ml="xs">
                    {allStyleImages.length}
                  </Badge>
                )}
              </Tabs.Tab>
            </Tabs.List>

            {/* Overview Tab */}
            <Tabs.Panel value="overview" pt="xl">
              <Stack gap="md">
                {style.detailedContent && (
                  <Paper shadow="sm" p="lg" withBorder>
                    <Stack gap="md">
                      <Text size="xl" fw={600}>{locale === 'he' ? 'אודות הסגנון' : 'About This Style'}</Text>
                      {style.detailedContent[locale]?.description && (
                        <Text>{style.detailedContent[locale].description}</Text>
                      )}

                      {style.detailedContent[locale]?.characteristics &&
                        style.detailedContent[locale].characteristics.length > 0 && (
                          <>
                            <Divider />
                            <div>
                              <Text fw={600} mb="xs">
                                {locale === 'he' ? 'מאפיינים עיקריים' : 'Key Characteristics'}
                              </Text>
                              <Stack gap="xs">
                                {style.detailedContent[locale].characteristics.map(
                                  (char: string, index: number) => (
                                    <Text key={index} size="sm">• {char}</Text>
                                  )
                                )}
                              </Stack>
                            </div>
                          </>
                        )}
                    </Stack>
                  </Paper>
                )}

                {/* Room count summary */}
                {galleryRooms.length > 0 && (
                  <Paper shadow="sm" p="md" withBorder>
                    <Text fw={600} mb="xs">
                      {locale === 'he' ? 'עיצובי חדרים' : 'Room Designs'}
                    </Text>
                    <Text c="dimmed" size="sm">
                      {galleryRooms.length} {locale === 'he' ? 'תצורות חדר זמינות' : 'room configurations available'}
                    </Text>
                  </Paper>
                )}
              </Stack>
            </Tabs.Panel>

            {/* Rooms Tab - Pinterest Style */}
            <Tabs.Panel value="rooms" pt="xl">
              <Stack gap="xl">
                {galleryRooms.map((room, index) => (
                  <div key={room.id}>
                    <RoomGallerySection
                      room={room}
                      colorMap={colorMap}
                      locale={locale}
                      styleName={style.name[locale]}
                    />
                    {index < galleryRooms.length - 1 && <Divider my="xl" />}
                  </div>
                ))}

                {galleryRooms.length === 0 && (
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
                {/* Materials Column */}
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Stack gap="md">
                    <Group gap="xs">
                      <IconPhoto size={20} color="#df2538" />
                      <Text fw={600}>{locale === 'he' ? 'חומרים' : 'Materials'}</Text>
                      <Badge size="sm" variant="light">
                        {allMaterials.length}
                      </Badge>
                    </Group>
                    <MaterialsGrid materials={allMaterials} locale={locale} />
                  </Stack>
                </Grid.Col>

                {/* Textures Column */}
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Stack gap="md">
                    <Group gap="xs">
                      <IconTexture size={20} color="#df2538" />
                      <Text fw={600}>{locale === 'he' ? 'מרקמים' : 'Textures'}</Text>
                      <Badge size="sm" variant="light">
                        {allTextures.length}
                      </Badge>
                    </Group>
                    <TexturesGrid textures={allTextures} locale={locale} />
                  </Stack>
                </Grid.Col>
              </Grid>
            </Tabs.Panel>

            {/* All Images Tab */}
            <Tabs.Panel value="images" pt="xl">
              {allStyleImages.length > 0 ? (
                <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="md">
                  {allStyleImages.map((image: any, index: number) => {
                    const imageUrl = typeof image === 'string' ? image : image?.url
                    if (!imageUrl) return null

                    return (
                      <Box
                        key={image?.id || index}
                        style={{
                          borderRadius: 12,
                          overflow: 'hidden',
                          cursor: 'pointer',
                          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                        }}
                        onClick={() =>
                          openImages(
                            allStyleImages
                              .map((img: any) => {
                                const url = typeof img === 'string' ? img : img?.url
                                return url ? {
                                  url,
                                  title: `${style.name[locale]} - ${locale === 'he' ? 'תמונה' : 'Image'} ${allStyleImages.indexOf(img) + 1}`,
                                  description: style.approach?.name?.[locale] || '',
                                } : null
                              })
                              .filter(Boolean),
                            index
                          )
                        }
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.02)'
                          e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)'
                          e.currentTarget.style.boxShadow = 'none'
                        }}
                      >
                        <Box style={{ aspectRatio: '1', overflow: 'hidden' }}>
                          <ImageWithFallback
                            src={imageUrl}
                            alt={`${style.name[locale]} - Image ${index + 1}`}
                            fit="cover"
                            height="100%"
                            width="100%"
                            radius={12}
                            maxRetries={3}
                            retryDelay={1000}
                          />
                        </Box>
                      </Box>
                    )
                  })}
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
      </Container>

      {/* Use for Project Modal */}
      <UseForProjectModal
        opened={useForProjectModalOpen}
        onClose={() => setUseForProjectModalOpen(false)}
        styleId={styleId}
        locale={locale}
      />
    </>
  )
}
