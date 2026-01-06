'use client'

import { Modal, Stack, Title, Text, Divider, List, ThemeIcon, ScrollArea, Box } from '@mantine/core'
import { IconPalette, IconPhoto, IconTexture, IconBulb, IconFileDescription } from '@tabler/icons-react'
import { ColorPaletteDisplay } from './ColorPaletteDisplay'
import { MaterialsGrid } from './MaterialsGrid'
import { TexturesGrid } from './TexturesGrid'
import type { Color } from '@/hooks/useColors'

interface RoomColorPalette {
  primaryId?: string
  secondaryIds?: string[]
  accentIds?: string[]
  description?: { he: string; en: string }
}

interface RoomMaterial {
  id: string
  name: { he: string; en: string }
  application?: { he: string; en: string }
  finish?: string
  sku?: string
  isAbstract?: boolean
  aiDescription?: string
  category?: { name: { he: string; en: string } }
  texture?: { id: string }
  assets?: {
    thumbnail?: string
    images?: string[]
  }
}

interface RoomTexture {
  id: string
  name: { he: string; en: string }
  imageUrl: string
  category?: { name: { he: string; en: string } }
  type?: { name: { he: string; en: string } }
  linkedMaterial?: { name: { he: string; en: string } }
}

interface DesignTip {
  tip?: { he: string; en: string }
}

interface GalleryRoom {
  id: string
  roomTypeName: { he: string; en: string }
  description: { he: string; en: string }
  images: string[]
  colorPalette?: RoomColorPalette
  materials: RoomMaterial[]
  textures: RoomTexture[]
  designTips: (DesignTip | string)[]
}

interface RoomInfoModalProps {
  opened: boolean
  onClose: () => void
  room: GalleryRoom
  colorMap: Map<string, Color>
  locale: 'he' | 'en'
}

export function RoomInfoModal({ opened, onClose, room, colorMap, locale }: RoomInfoModalProps) {
  const hasDescription = room.description[locale] && room.description[locale].trim() !== ''
  const hasColorPalette = room.colorPalette && (
    room.colorPalette.primaryId ||
    (room.colorPalette.secondaryIds && room.colorPalette.secondaryIds.length > 0) ||
    (room.colorPalette.accentIds && room.colorPalette.accentIds.length > 0)
  )
  const hasMaterials = room.materials && room.materials.length > 0
  const hasTextures = room.textures && room.textures.length > 0
  const hasDesignTips = room.designTips && room.designTips.length > 0

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Title order={3}>
          {room.roomTypeName[locale]}
        </Title>
      }
      size="lg"
      centered
      scrollAreaComponent={ScrollArea.Autosize}
    >
      <Stack gap="xl">
        {/* Full Description (AI generated) */}
        {hasDescription && (
          <Box>
            <Stack gap="xs" mb="md">
              <Title order={5} c="dimmed" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <IconFileDescription size={18} />
                {locale === 'he' ? 'תיאור החדר' : 'Room Description'}
              </Title>
            </Stack>
            <Text size="sm" style={{ lineHeight: 1.7 }}>
              {room.description[locale]}
            </Text>
          </Box>
        )}

        {hasDescription && (hasColorPalette || hasMaterials || hasTextures || hasDesignTips) && <Divider />}

        {/* Color Palette */}
        {hasColorPalette && (
          <Box>
            <Stack gap="xs" mb="md">
              <Title order={5} c="dimmed" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <IconPalette size={18} />
                {locale === 'he' ? 'פלטת צבעים' : 'Color Palette'}
              </Title>
            </Stack>
            <ColorPaletteDisplay
              colorPalette={room.colorPalette!}
              colorMap={colorMap}
              locale={locale}
            />
          </Box>
        )}

        {hasColorPalette && (hasMaterials || hasTextures || hasDesignTips) && <Divider />}

        {/* Materials */}
        {hasMaterials && (
          <Box>
            <Stack gap="xs" mb="md">
              <Title order={5} c="dimmed" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <IconPhoto size={18} />
                {locale === 'he' ? 'חומרים' : 'Materials'}
              </Title>
            </Stack>
            <MaterialsGrid materials={room.materials} locale={locale} />
          </Box>
        )}

        {hasMaterials && (hasTextures || hasDesignTips) && <Divider />}

        {/* Textures */}
        {hasTextures && (
          <Box>
            <Stack gap="xs" mb="md">
              <Title order={5} c="dimmed" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <IconTexture size={18} />
                {locale === 'he' ? 'מרקמים' : 'Textures'}
              </Title>
            </Stack>
            <TexturesGrid textures={room.textures} locale={locale} />
          </Box>
        )}

        {hasTextures && hasDesignTips && <Divider />}

        {/* Design Tips */}
        {hasDesignTips && (
          <Box>
            <Stack gap="xs" mb="md">
              <Title order={5} c="dimmed" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <IconBulb size={18} />
                {locale === 'he' ? 'טיפים לעיצוב' : 'Design Tips'}
              </Title>
            </Stack>
            <List
              spacing="sm"
              size="sm"
              icon={
                <ThemeIcon color="brand" size={20} radius="xl">
                  <IconBulb size={12} />
                </ThemeIcon>
              }
            >
              {room.designTips.map((tip, index) => {
                const tipText = typeof tip === 'string' ? tip : tip.tip?.[locale]
                if (!tipText) return null
                return (
                  <List.Item key={index}>
                    <Text size="sm">{tipText}</Text>
                  </List.Item>
                )
              })}
            </List>
          </Box>
        )}

        {/* Empty state */}
        {!hasDescription && !hasColorPalette && !hasMaterials && !hasTextures && !hasDesignTips && (
          <Text size="sm" c="dimmed" ta="center" py="xl">
            {locale === 'he' ? 'אין מידע נוסף על החדר' : 'No additional room information available'}
          </Text>
        )}
      </Stack>
    </Modal>
  )
}
