'use client'

import { SimpleGrid, Box, Text, Badge, Group, Stack } from '@mantine/core'
import { ImageWithFallback } from '@/components/ui/ImageWithFallback'
import { useImageViewer } from '@/contexts/ImageViewerContext'

interface Texture {
  id: string
  name: { he: string; en: string }
  imageUrl: string
  category?: { name: { he: string; en: string } }
  type?: { name: { he: string; en: string } }
  linkedMaterial?: { name: { he: string; en: string } }
  usageCount?: number
}

interface TexturesGridProps {
  textures: Texture[]
  locale: 'he' | 'en'
}

export function TexturesGrid({ textures, locale }: TexturesGridProps) {
  const { openImages } = useImageViewer()

  if (!textures || textures.length === 0) {
    return (
      <Text size="sm" c="dimmed" ta="center" py="md">
        {locale === 'he' ? 'אין מרקמים להצגה' : 'No textures to display'}
      </Text>
    )
  }

  const handleImageClick = (texture: Texture) => {
    if (texture.imageUrl) {
      openImages([{
        url: texture.imageUrl,
        title: texture.name[locale],
        description: texture.category?.name?.[locale] || '',
      }], 0)
    }
  }

  return (
    <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="md">
      {textures.map((texture) => (
        <Box
          key={texture.id}
          style={{
            borderRadius: 12,
            overflow: 'hidden',
            cursor: 'pointer',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          }}
          onClick={() => handleImageClick(texture)}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.02)'
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)'
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          <Box
            style={{
              aspectRatio: '1',
              overflow: 'hidden',
              borderRadius: 12,
              marginBottom: 8,
            }}
          >
            <ImageWithFallback
              src={texture.imageUrl}
              alt={texture.name[locale]}
              fit="cover"
              height="100%"
              width="100%"
              maxRetries={3}
              retryDelay={1000}
            />
          </Box>

          <Stack gap={4} px={4} pb={4}>
            <Text size="sm" fw={500} lineClamp={1}>
              {texture.name[locale]}
            </Text>

            {texture.linkedMaterial && (
              <Text size="xs" c="dimmed" lineClamp={1}>
                {locale === 'he' ? 'מקושר ל: ' : 'Linked to: '}
                {texture.linkedMaterial.name[locale]}
              </Text>
            )}

            <Group gap={4} wrap="wrap">
              {texture.category && (
                <Badge size="xs" variant="light" color="blue">
                  {texture.category.name[locale]}
                </Badge>
              )}
              {texture.type && (
                <Badge size="xs" variant="light" color="teal">
                  {texture.type.name[locale]}
                </Badge>
              )}
            </Group>
          </Stack>
        </Box>
      ))}
    </SimpleGrid>
  )
}
