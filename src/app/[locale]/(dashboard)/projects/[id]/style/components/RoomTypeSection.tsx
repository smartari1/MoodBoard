'use client'

import {
  Paper,
  Stack,
  Group,
  Title,
  Text,
  ActionIcon,
  Image,
  Box,
  SimpleGrid,
  Center,
} from '@mantine/core'
import { IconPlus, IconPhoto } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'
import type { ProjectRoom, GeneratedImage } from '@/hooks/useProjectStyle'

interface LocalizedString {
  he: string
  en: string
}

interface RoomType {
  id: string
  slug: string
  name: LocalizedString
  icon?: string
}

interface RoomTypeSectionProps {
  roomType: RoomType
  room: ProjectRoom | null  // The single room for this type (or null if none)
  onCreateRoom: () => void  // Create room if doesn't exist, then open studio
  onOpenStudio: (roomId: string) => void  // Open studio for existing room
  isGenerating?: boolean
  locale: string
}

export function RoomTypeSection({
  roomType,
  room,
  onCreateRoom,
  onOpenStudio,
  isGenerating,
  locale,
}: RoomTypeSectionProps) {
  const t = useTranslations('projectStyle')

  // Get room type name based on locale
  const roomTypeName = locale === 'he' ? roomType.name.he : roomType.name.en

  // Get all images for this room
  const images = room?.generatedImages || []

  // Handle click on plus - either create room or open studio
  const handleAddVariant = () => {
    if (room) {
      onOpenStudio(room.id)
    } else {
      onCreateRoom()
    }
  }

  return (
    <Paper p="md" radius="md" withBorder>
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between">
          <Title order={5}>{roomTypeName}</Title>
          <Text size="sm" c="dimmed">
            {images.length} {t('rooms.images')}
          </Text>
        </Group>

        {/* Images Grid */}
        <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="sm">
          {/* Existing Images */}
          {images.map((img, index) => (
            <Box
              key={img.id || index}
              style={{
                cursor: 'pointer',
                borderRadius: 8,
                overflow: 'hidden',
                aspectRatio: '4/3',
              }}
              onClick={() => room && onOpenStudio(room.id)}
            >
              <Image
                src={img.url}
                alt={`${roomTypeName} ${index + 1}`}
                h="100%"
                w="100%"
                fit="cover"
              />
            </Box>
          ))}

          {/* Add Variant Button */}
          <Box
            style={{
              cursor: 'pointer',
              borderRadius: 8,
              border: '2px dashed var(--mantine-color-gray-4)',
              aspectRatio: '4/3',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'var(--mantine-color-gray-0)',
            }}
            onClick={handleAddVariant}
          >
            <Stack align="center" gap="xs">
              <ActionIcon size="lg" variant="light" radius="xl">
                <IconPlus size={20} />
              </ActionIcon>
              <Text size="xs" c="dimmed">
                {t('rooms.roomTypeSection.addVariant')}
              </Text>
            </Stack>
          </Box>
        </SimpleGrid>

        {/* Empty state - no images yet */}
        {images.length === 0 && (
          <Center py="md">
            <Text size="sm" c="dimmed">
              {t('rooms.roomTypeSection.clickToGenerate')}
            </Text>
          </Center>
        )}
      </Stack>
    </Paper>
  )
}
