'use client'

import { useState } from 'react'
import {
  Modal,
  Stack,
  Group,
  Title,
  Text,
  Textarea,
  Button,
  Paper,
  Badge,
  Alert,
  ColorSwatch,
  SimpleGrid,
  Image,
  Box,
} from '@mantine/core'
import { IconSparkles, IconAlertCircle, IconCoin } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import type { ProjectRoom } from '@/hooks/useProjectStyle'

interface LocalizedString {
  he: string
  en: string
}

interface ColorItem {
  id: string
  name: LocalizedString
  hex: string
}

interface GenerateRoomModalProps {
  opened: boolean
  onClose: () => void
  roomId?: string
  room?: ProjectRoom
  colors: ColorItem[]
  onGenerate: (
    roomId: string,
    options?: {
      customPrompt?: string
      overrideColorIds?: string[]
    }
  ) => void | Promise<void>
  isGenerating?: boolean
  creditBalance: number
}

export function GenerateRoomModal({
  opened,
  onClose,
  roomId,
  room,
  colors,
  onGenerate,
  isGenerating,
  creditBalance,
}: GenerateRoomModalProps) {
  const t = useTranslations('projectStyle')
  const params = useParams()
  const locale = params.locale as string

  const [customPrompt, setCustomPrompt] = useState('')

  const getName = (name: LocalizedString) =>
    locale === 'he' ? name.he : name.en

  const handleGenerate = async () => {
    if (!roomId) return

    await onGenerate(roomId, {
      customPrompt: customPrompt || undefined,
    })

    setCustomPrompt('')
  }

  const handleClose = () => {
    setCustomPrompt('')
    onClose()
  }

  const hasEnoughCredits = creditBalance >= 1

  // Get latest image for preview
  const latestImage = room?.generatedImages?.[room.generatedImages.length - 1]

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Group gap="sm">
          <IconSparkles size={20} />
          <Title order={3}>{t('generateRoom.title')}</Title>
        </Group>
      }
      size="lg"
      centered
    >
      <Stack gap="lg">
        {/* Room Info */}
        <Paper p="md" radius="md" withBorder>
          <Group gap="md">
            {latestImage && (
              <Image
                src={latestImage.url}
                alt={room?.name || room?.roomType || 'Room'}
                w={100}
                h={75}
                radius="md"
                fit="cover"
              />
            )}
            <Stack gap={4} style={{ flex: 1 }}>
              <Text fw={500}>{room?.name || room?.roomType}</Text>
              {room?.isForked && (
                <Badge size="xs" color="blue">
                  {t('rooms.forked')}
                </Badge>
              )}
              {room?.generatedImages && room.generatedImages.length > 0 && (
                <Text size="xs" c="dimmed">
                  {room.generatedImages.length} {t('generateRoom.imagesGenerated')}
                </Text>
              )}
            </Stack>
          </Group>
        </Paper>

        {/* Design Elements Being Used */}
        {colors.length > 0 && (
          <Paper p="md" radius="md" withBorder>
            <Stack gap="sm">
              <Text size="sm" fw={500}>
                {t('generateRoom.usingColors')}
              </Text>
              <Group gap="xs">
                {colors.map((color) => (
                  <ColorSwatch
                    key={color.id}
                    color={color.hex}
                    size={24}
                    title={getName(color.name)}
                  />
                ))}
              </Group>
            </Stack>
          </Paper>
        )}

        {/* Custom Prompt */}
        <Textarea
          label={t('generateRoom.customPrompt')}
          placeholder={t('generateRoom.customPromptPlaceholder')}
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          rows={3}
        />

        {/* Credit Warning */}
        {!hasEnoughCredits && (
          <Alert
            icon={<IconAlertCircle size={16} />}
            color="red"
            title={t('messages.insufficientCredits')}
          >
            {t('generateRoom.insufficientCreditsDescription')}
          </Alert>
        )}

        {/* Credit Info */}
        <Paper p="sm" radius="md" bg="gray.0">
          <Group justify="space-between">
            <Group gap="xs">
              <IconCoin size={16} />
              <Text size="sm">{t('generateRoom.description')}</Text>
            </Group>
            <Group gap="xs">
              <Badge variant="light" color="brand">
                1 {t('rooms.credit')}
              </Badge>
              <Text size="sm" c="dimmed">
                ({creditBalance} {t('generateRoom.available')})
              </Text>
            </Group>
          </Group>
        </Paper>

        {/* Actions */}
        <Group justify="flex-end">
          <Button variant="subtle" onClick={handleClose}>
            {t('generateRoom.cancel')}
          </Button>
          <Button
            leftSection={<IconSparkles size={16} />}
            onClick={handleGenerate}
            disabled={!hasEnoughCredits}
            loading={isGenerating}
          >
            {latestImage ? t('rooms.regenerate') : t('rooms.generate')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
