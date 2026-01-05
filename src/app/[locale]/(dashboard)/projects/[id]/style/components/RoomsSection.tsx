'use client'

import {
  Paper,
  Stack,
  Group,
  Title,
  Text,
  Button,
  SimpleGrid,
  Card,
  Image,
  Badge,
  ActionIcon,
  Menu,
  Center,
  Loader,
  Box,
} from '@mantine/core'
import {
  IconPlus,
  IconSparkles,
  IconTrash,
  IconDotsVertical,
  IconRefresh,
  IconPhoto,
  IconHome,
} from '@tabler/icons-react'
import { useTranslations } from 'next-intl'
import type { ProjectRoom, GeneratedImage } from '@/hooks/useProjectStyle'

interface RoomsSectionProps {
  rooms: ProjectRoom[]
  onAddRoom: () => void
  onGenerateRoom: (roomId: string) => void
  onDeleteRoom: (roomId: string) => void
  isGenerating?: boolean
}

export function RoomsSection({
  rooms,
  onAddRoom,
  onGenerateRoom,
  onDeleteRoom,
  isGenerating,
}: RoomsSectionProps) {
  const t = useTranslations('projectStyle')

  // Get the latest image from a room
  const getLatestImage = (room: ProjectRoom): GeneratedImage | null => {
    if (!room.generatedImages || room.generatedImages.length === 0) return null
    return room.generatedImages[room.generatedImages.length - 1]
  }

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'green'
      case 'generating':
        return 'yellow'
      case 'failed':
        return 'red'
      default:
        return 'gray'
    }
  }

  return (
    <Paper p="md" radius="md" withBorder>
      <Stack gap="md">
        <Group justify="space-between">
          <Group gap="sm">
            <IconHome size={20} />
            <Title order={4}>{t('rooms.title')}</Title>
            <Text c="dimmed" size="sm">
              ({rooms.length})
            </Text>
          </Group>
          <Button
            variant="light"
            size="xs"
            leftSection={<IconPlus size={14} />}
            onClick={onAddRoom}
          >
            {t('rooms.addRoom')}
          </Button>
        </Group>

        {rooms.length === 0 ? (
          <Center py="xl">
            <Stack align="center" gap="md">
              <IconPhoto size={40} color="gray" />
              <Text c="dimmed" size="sm" ta="center">
                {t('rooms.noRooms')}
              </Text>
              <Button
                variant="light"
                leftSection={<IconPlus size={16} />}
                onClick={onAddRoom}
              >
                {t('rooms.addRoom')}
              </Button>
            </Stack>
          </Center>
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
            {rooms.map((room) => {
              const latestImage = getLatestImage(room)
              const isCurrentlyGenerating = isGenerating && room.status === 'generating'

              return (
                <Card key={room.id} padding="sm" radius="md" withBorder>
                  {/* Image */}
                  <Card.Section>
                    <Box pos="relative">
                      {latestImage ? (
                        <Image
                          src={latestImage.url}
                          alt={room.name || room.roomType}
                          h={180}
                          fit="cover"
                        />
                      ) : (
                        <Center h={180} bg="gray.1">
                          {isCurrentlyGenerating ? (
                            <Stack align="center" gap="xs">
                              <Loader size="sm" />
                              <Text size="xs" c="dimmed">
                                {t('rooms.generating')}
                              </Text>
                            </Stack>
                          ) : (
                            <Stack align="center" gap="xs">
                              <IconPhoto size={32} color="gray" />
                              <Text size="xs" c="dimmed">
                                {t('rooms.noImage')}
                              </Text>
                            </Stack>
                          )}
                        </Center>
                      )}

                      {/* Status badges */}
                      <Group pos="absolute" top={8} left={8} gap={4}>
                        {room.isForked && (
                          <Badge size="xs" color="blue" variant="filled">
                            {t('rooms.forked')}
                          </Badge>
                        )}
                        <Badge
                          size="xs"
                          color={getStatusColor(room.status)}
                          variant="filled"
                        >
                          {t(`rooms.${room.status}`)}
                        </Badge>
                      </Group>

                      {/* Menu */}
                      <Menu position="bottom-end" withArrow>
                        <Menu.Target>
                          <ActionIcon
                            variant="filled"
                            color="gray"
                            pos="absolute"
                            top={8}
                            right={8}
                            size="sm"
                          >
                            <IconDotsVertical size={14} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item
                            leftSection={<IconRefresh size={14} />}
                            onClick={() => onGenerateRoom(room.id)}
                            disabled={isCurrentlyGenerating}
                          >
                            {latestImage ? t('rooms.regenerate') : t('rooms.generate')}
                          </Menu.Item>
                          <Menu.Divider />
                          <Menu.Item
                            leftSection={<IconTrash size={14} />}
                            color="red"
                            onClick={() => onDeleteRoom(room.id)}
                          >
                            {t('rooms.delete')}
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    </Box>
                  </Card.Section>

                  {/* Info */}
                  <Stack gap={4} mt="sm">
                    <Text fw={500} size="sm">
                      {room.name || room.roomType}
                    </Text>
                    {room.creditsUsed > 0 && (
                      <Text size="xs" c="dimmed">
                        {room.creditsUsed} {t('rooms.creditsUsed')}
                      </Text>
                    )}
                  </Stack>

                  {/* Generate button */}
                  <Button
                    fullWidth
                    mt="sm"
                    variant={latestImage ? 'light' : 'filled'}
                    leftSection={<IconSparkles size={16} />}
                    onClick={() => onGenerateRoom(room.id)}
                    loading={isCurrentlyGenerating}
                    disabled={isCurrentlyGenerating}
                  >
                    {latestImage ? t('rooms.regenerate') : t('rooms.generate')}
                    <Text component="span" size="xs" c="dimmed" ml={4}>
                      (1 {t('rooms.credit')})
                    </Text>
                  </Button>
                </Card>
              )
            })}

            {/* Add Room Card */}
            <Card
              padding="sm"
              radius="md"
              withBorder
              style={{
                cursor: 'pointer',
                borderStyle: 'dashed',
              }}
              onClick={onAddRoom}
            >
              <Center h={280}>
                <Stack align="center" gap="sm">
                  <ActionIcon size="xl" variant="light" radius="xl">
                    <IconPlus size={24} />
                  </ActionIcon>
                  <Text size="sm" c="dimmed">
                    {t('rooms.addRoom')}
                  </Text>
                </Stack>
              </Center>
            </Card>
          </SimpleGrid>
        )}
      </Stack>
    </Paper>
  )
}
