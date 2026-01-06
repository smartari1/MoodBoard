'use client'

import { SimpleGrid, Box, Text, Badge, Group, Stack } from '@mantine/core'
import { IconSparkles, IconTexture } from '@tabler/icons-react'
import { ImageWithFallback } from '@/components/ui/ImageWithFallback'
import { useImageViewer } from '@/contexts/ImageViewerContext'

interface MaterialsGridProps {
  materials: any[]
  locale: 'he' | 'en'
}

export function MaterialsGrid({ materials, locale }: MaterialsGridProps) {
  const { openImages } = useImageViewer()

  if (!materials || materials.length === 0) {
    return (
      <Text size="sm" c="dimmed" ta="center" py="md">
        {locale === 'he' ? 'אין חומרים להצגה' : 'No materials to display'}
      </Text>
    )
  }

  const handleImageClick = (material: any) => {
    const imageUrl = material.assets?.thumbnail || material.assets?.images?.[0]
    if (imageUrl) {
      openImages([{
        url: imageUrl,
        title: material.name?.[locale] || '',
        description: material.category?.name?.[locale] || '',
      }], 0)
    }
  }

  return (
    <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="md">
      {materials.map((material) => {
        const imageUrl = material.assets?.thumbnail || material.assets?.images?.[0]

        return (
          <Box
            key={material.id}
            style={{
              borderRadius: 12,
              overflow: 'hidden',
              cursor: imageUrl ? 'pointer' : 'default',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            }}
            onClick={() => handleImageClick(material)}
            onMouseEnter={(e) => {
              if (imageUrl) {
                e.currentTarget.style.transform = 'scale(1.02)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            {imageUrl && (
              <Box
                style={{
                  aspectRatio: '1',
                  overflow: 'hidden',
                  borderRadius: 12,
                  marginBottom: 8,
                }}
              >
                <ImageWithFallback
                  src={imageUrl}
                  alt={material.name[locale]}
                  fit="cover"
                  height="100%"
                  width="100%"
                  maxRetries={3}
                  retryDelay={1000}
                />
              </Box>
            )}

            <Stack gap={4} px={4} pb={4}>
              <Text size="sm" fw={500} lineClamp={1}>
                {material.name[locale]}
              </Text>

              {material.application?.[locale] && (
                <Text size="xs" c="dimmed" lineClamp={1}>
                  {material.application[locale]}
                </Text>
              )}

              <Group gap={4} wrap="wrap">
                {material.category && (
                  <Badge size="xs" variant="light" color="blue">
                    {material.category.name[locale]}
                  </Badge>
                )}
                {material.finish && (
                  <Badge size="xs" variant="light" color="cyan">
                    {material.finish}
                  </Badge>
                )}
                {material.isAbstract && (
                  <Badge size="xs" variant="filled" color="grape" leftSection={<IconSparkles size={10} />}>
                    AI
                  </Badge>
                )}
                {material.texture && (
                  <Badge size="xs" variant="outline" color="teal" leftSection={<IconTexture size={10} />}>
                    {locale === 'he' ? 'מרקם' : 'Texture'}
                  </Badge>
                )}
              </Group>
            </Stack>
          </Box>
        )
      })}
    </SimpleGrid>
  )
}
