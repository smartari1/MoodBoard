'use client'

import { Box, Container, Title, Group, Badge, Button, Stack, Text, Paper } from '@mantine/core'
import { IconCopy, IconDiamond, IconSparkles, IconBuildingStore, IconPhoto } from '@tabler/icons-react'
import { ImageWithFallback } from '@/components/ui/ImageWithFallback'
import { useImageViewer } from '@/contexts/ImageViewerContext'

interface StyleCategory {
  name: { he: string; en: string }
}

interface StyleApproach {
  name: { he: string; en: string }
}

interface StyleColor {
  name: { he: string; en: string }
  hex: string
}

interface Style {
  name: { he: string; en: string }
  compositeImageUrl?: string
  anchorImageUrl?: string
  category?: StyleCategory
  subCategory?: StyleCategory
  approach?: StyleApproach
  color?: StyleColor
  priceLevel?: 'LUXURY' | 'REGULAR'
  roomCategory?: string
}

interface StyleGalleryHeroProps {
  style: Style
  locale: 'he' | 'en'
  onUseForProject: () => void
}

export function StyleGalleryHero({ style, locale, onUseForProject }: StyleGalleryHeroProps) {
  const { openImages } = useImageViewer()

  return (
    <Stack gap="xl">
      {/* Composite Hero Image */}
      {style.compositeImageUrl && (
        <Paper radius="lg" style={{ overflow: 'hidden' }} shadow="md">
          <Box
            style={{
              width: '100%',
              height: 400,
              position: 'relative',
              cursor: 'pointer',
            }}
            onClick={() => {
              if (style.compositeImageUrl) {
                openImages([{
                  url: style.compositeImageUrl,
                  title: style.name[locale],
                  description: locale === 'he' ? 'תמונת מצב רוח מורכבת' : 'Composite Mood Board',
                }], 0)
              }
            }}
          >
            <ImageWithFallback
              src={style.compositeImageUrl}
              alt={`${style.name[locale]} - Composite Mood Board`}
              fit="cover"
              height={400}
              width="100%"
              maxRetries={3}
              retryDelay={1000}
              priority={true}
            />
          </Box>
        </Paper>
      )}

      {/* Header with black text */}
      <Group justify="space-between" align="flex-start">
        <div style={{ flex: 1 }}>
          {/* Badges */}
          <Group gap="xs" mb="xs" wrap="wrap">
            {style.category && (
              <Badge size="lg" variant="light">
                {style.category.name[locale]}
              </Badge>
            )}
            {style.subCategory && (
              <Badge size="lg" variant="outline">
                {style.subCategory.name[locale]}
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

          {/* Title - Black text */}
          <Title order={1} mb="xs">
            {style.name[locale]}
          </Title>

          {/* Approach & Color */}
          <Group gap="md" wrap="wrap">
            {style.approach && (
              <Group gap="xs">
                <IconSparkles size={20} />
                <Text size="lg" c="dimmed">
                  {style.approach.name[locale]}
                </Text>
              </Group>
            )}
            {style.color && (
              <Group gap="xs">
                <Box
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 4,
                    backgroundColor: style.color.hex,
                    border: '1px solid #ddd',
                  }}
                />
                <Text size="lg" c="dimmed">
                  {style.color.name[locale]}
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
          onClick={onUseForProject}
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
                    title: style.name[locale],
                    description: locale === 'he' ? 'תמונת עוגן' : 'Anchor Image',
                  }], 0)
                }
              }}
            >
              <ImageWithFallback
                src={style.anchorImageUrl}
                alt={`${style.name[locale]} - Anchor`}
                fit="cover"
                height={300}
                width="100%"
                maxRetries={3}
                retryDelay={1000}
                priority={true}
              />
            </Box>
          </Paper>
        </Paper>
      )}
    </Stack>
  )
}
