'use client'

import { Box, Group, Text, ActionIcon } from '@mantine/core'
import { IconInfoCircle } from '@tabler/icons-react'
import { useState } from 'react'
import { MasonryGrid } from './MasonryGrid'
import { MasonryImage } from './MasonryImage'
import { RoomInfoModal } from './RoomInfoModal'
import { useImageViewer } from '@/contexts/ImageViewerContext'
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

export interface GalleryRoom {
  id: string
  roomTypeName: { he: string; en: string } // Short room type name for display
  description: { he: string; en: string } // Full AI description for modal
  images: string[]
  colorPalette?: RoomColorPalette
  materials: RoomMaterial[]
  textures: RoomTexture[]
  designTips: (DesignTip | string)[]
}

interface RoomGallerySectionProps {
  room: GalleryRoom
  colorMap: Map<string, Color>
  locale: 'he' | 'en'
  styleName: string
}

export function RoomGallerySection({ room, colorMap, locale, styleName }: RoomGallerySectionProps) {
  const [infoModalOpen, setInfoModalOpen] = useState(false)
  const { openImages } = useImageViewer()

  const handleImageClick = (index: number) => {
    openImages(
      room.images.map((url, i) => ({
        url,
        title: `${room.roomTypeName[locale]} - ${locale === 'he' ? 'תמונה' : 'Image'} ${i + 1}`,
        description: styleName,
      })),
      index
    )
  }

  // Check if room has additional info to show in modal
  const hasRoomInfo =
    (room.description[locale] && room.description[locale].trim() !== '') ||
    (room.colorPalette && (
      room.colorPalette.primaryId ||
      (room.colorPalette.secondaryIds && room.colorPalette.secondaryIds.length > 0) ||
      (room.colorPalette.accentIds && room.colorPalette.accentIds.length > 0)
    )) ||
    (room.materials && room.materials.length > 0) ||
    (room.textures && room.textures.length > 0) ||
    (room.designTips && room.designTips.length > 0)

  if (room.images.length === 0) {
    return null
  }

  return (
    <Box id={`room-${room.id}`} py="md">
      {/* Room Header - Shows room type name (short) */}
      <Group justify="space-between" align="center" mb="lg">
        <Text size="xl" fw={600}>
          {room.roomTypeName[locale]}
        </Text>
        {hasRoomInfo && (
          <ActionIcon
            variant="subtle"
            size="lg"
            onClick={() => setInfoModalOpen(true)}
            aria-label={locale === 'he' ? 'מידע על החדר' : 'Room Information'}
          >
            <IconInfoCircle size={24} />
          </ActionIcon>
        )}
      </Group>

      {/* Masonry Gallery */}
      <MasonryGrid>
        {room.images.map((url, index) => (
          <MasonryImage
            key={`${room.id}-${index}`}
            src={url}
            alt={`${room.roomTypeName[locale]} - ${index + 1}`}
            onClick={() => handleImageClick(index)}
          />
        ))}
      </MasonryGrid>

      {/* Info Modal - Shows full details including AI description */}
      {hasRoomInfo && (
        <RoomInfoModal
          opened={infoModalOpen}
          onClose={() => setInfoModalOpen(false)}
          room={room}
          colorMap={colorMap}
          locale={locale}
        />
      )}
    </Box>
  )
}
