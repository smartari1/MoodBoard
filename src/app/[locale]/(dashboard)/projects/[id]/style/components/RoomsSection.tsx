'use client'

import {
  Paper,
  Stack,
  Group,
  Title,
  Text,
  Button,
  Center,
  Loader,
} from '@mantine/core'
import { IconPlus, IconHome, IconPhoto } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'
import type { ProjectRoom } from '@/hooks/useProjectStyle'
import { RoomTypeSection } from './RoomTypeSection'

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

interface RoomsSectionProps {
  rooms: ProjectRoom[]
  roomTypes: RoomType[]
  onAddRoom: (roomTypeId?: string) => void
  onGenerateRoom: (roomId: string) => void
  onOpenStudioForType: (roomTypeId: string, roomType: string) => void
  onDeleteRoom: (roomId: string) => void
  isGenerating?: boolean
  isLoadingRoomTypes?: boolean
  locale: string
}

/**
 * Find the single room for a room type
 * Each room type should have at most one room
 */
function findRoomForType(
  rooms: ProjectRoom[],
  roomType: RoomType
): ProjectRoom | null {
  // First try exact roomTypeId match
  const byId = rooms.find((room) => room.roomTypeId === roomType.id)
  if (byId) return byId

  // Fallback: try to match by slug/name
  return (
    rooms.find(
      (room) =>
        room.roomType === roomType.slug ||
        room.roomType?.toLowerCase() === roomType.name.en.toLowerCase() ||
        room.roomType === roomType.name.he
    ) || null
  )
}

export function RoomsSection({
  rooms,
  roomTypes = [],
  onAddRoom,
  onGenerateRoom,
  onOpenStudioForType,
  onDeleteRoom,
  isGenerating,
  isLoadingRoomTypes,
  locale,
}: RoomsSectionProps) {
  const t = useTranslations('projectStyle')

  // Ensure roomTypes is always an array
  const safeRoomTypes = roomTypes || []

  // Count total images across all rooms
  const totalImages = rooms.reduce(
    (sum, room) => sum + (room.generatedImages?.length || 0),
    0
  )

  if (isLoadingRoomTypes) {
    return (
      <Paper p="md" radius="md" withBorder>
        <Center py="xl">
          <Loader size="sm" />
        </Center>
      </Paper>
    )
  }

  // Get room types that have rooms (show only relevant ones)
  const roomTypesWithRooms = safeRoomTypes
    .map((roomType) => ({
      roomType,
      room: findRoomForType(rooms, roomType),
    }))
    .filter(({ room }) => room !== null)

  return (
    <Stack gap="lg">
      {/* Header */}
      <Paper p="md" radius="md" withBorder>
        <Group justify="space-between">
          <Group gap="sm">
            <IconHome size={20} />
            <Title order={4}>{t('rooms.title')}</Title>
            <Text c="dimmed" size="sm">
              ({totalImages} {t('rooms.images')})
            </Text>
          </Group>
          <Button
            variant="light"
            size="xs"
            leftSection={<IconPlus size={14} />}
            onClick={() => onAddRoom()}
          >
            {t('rooms.addRoom')}
          </Button>
        </Group>
      </Paper>

      {/* Empty State */}
      {roomTypesWithRooms.length === 0 ? (
        <Paper p="md" radius="md" withBorder>
          <Center py="xl">
            <Stack align="center" gap="md">
              <IconPhoto size={40} color="gray" />
              <Text c="dimmed" size="sm" ta="center">
                {t('rooms.noRooms')}
              </Text>
              <Button
                variant="light"
                leftSection={<IconPlus size={16} />}
                onClick={() => onAddRoom()}
              >
                {t('rooms.addRoom')}
              </Button>
            </Stack>
          </Center>
        </Paper>
      ) : (
        <>
          {/* Room Type Sections - one per room type that has a room */}
          {roomTypesWithRooms.map(({ roomType, room }) => (
            <RoomTypeSection
              key={roomType.id}
              roomType={roomType}
              room={room}
              onCreateRoom={() => onAddRoom(roomType.id)}
              onOpenStudio={(roomId) => onGenerateRoom(roomId)}
              isGenerating={isGenerating}
              locale={locale}
            />
          ))}
        </>
      )}
    </Stack>
  )
}
