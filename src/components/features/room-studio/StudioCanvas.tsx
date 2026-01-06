/**
 * StudioCanvas Component
 * Center preview area showing generated images and generation progress
 */

'use client'

import {
  Box,
  Center,
  Stack,
  Text,
  Image,
  Paper,
  Textarea,
  Progress,
  Alert,
  Group,
  Badge,
  Loader,
} from '@mantine/core'
import {
  IconPhoto,
  IconSparkles,
  IconAlertCircle,
  IconCheck,
} from '@tabler/icons-react'
import { useTranslations } from 'next-intl'
import type { ProjectRoom, GeneratedImage } from './types'

interface StudioCanvasProps {
  room?: ProjectRoom
  latestImage: GeneratedImage | null
  isGenerating?: boolean
  progress?: number
  error?: string | null
  customPrompt: string
  onCustomPromptChange: (prompt: string) => void
  locale: string
}

export function StudioCanvas({
  room,
  latestImage,
  isGenerating = false,
  progress = 0,
  error,
  customPrompt,
  onCustomPromptChange,
  locale,
}: StudioCanvasProps) {
  const t = useTranslations('projectStyle.studio')

  return (
    <Box
      flex={1}
      h="100%"
      style={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--mantine-color-gray-1)',
      }}
    >
      {/* Main Canvas Area */}
      <Box flex={1} p="xl" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {isGenerating ? (
          // Generating State
          <Paper p="xl" radius="lg" withBorder shadow="sm" w={400}>
            <Stack align="center" gap="md">
              <Loader size="lg" type="bars" />
              <Text fw={500}>{t('generating')}</Text>
              <Progress
                value={progress}
                size="lg"
                w="100%"
                animated
                color="brand"
              />
              <Text size="sm" c="dimmed">
                {t('generatingDescription')}
              </Text>
            </Stack>
          </Paper>
        ) : latestImage ? (
          // Image Preview
          <Box
            style={{
              position: 'relative',
              maxWidth: '100%',
              maxHeight: '100%',
            }}
          >
            <Image
              src={latestImage.url}
              alt={room?.name || room?.roomType || 'Room'}
              radius="lg"
              style={{
                maxHeight: 'calc(100vh - 300px)',
                objectFit: 'contain',
              }}
            />
            {/* Image Info Overlay */}
            <Group
              pos="absolute"
              bottom={16}
              left={16}
              right={16}
              justify="space-between"
            >
              {latestImage.isForked && (
                <Badge color="blue" variant="filled" size="sm">
                  {t('forked')}
                </Badge>
              )}
              {room?.generatedImages && room.generatedImages.length > 1 && (
                <Badge variant="light" size="sm">
                  {room.generatedImages.length} {t('versions')}
                </Badge>
              )}
            </Group>
          </Box>
        ) : (
          // Empty State
          <Paper p="xl" radius="lg" withBorder>
            <Stack align="center" gap="md">
              <IconPhoto size={48} color="gray" />
              <Text fw={500} c="dimmed">
                {t('noImage')}
              </Text>
              <Text size="sm" c="dimmed" ta="center" maw={300}>
                {t('noImageDescription')}
              </Text>
            </Stack>
          </Paper>
        )}
      </Box>

      {/* Bottom Section - Custom Prompt */}
      <Box
        p="md"
        style={(theme) => ({
          borderTop: `1px solid ${theme.colors.gray[2]}`,
          backgroundColor: theme.white,
        })}
      >
        <Stack gap="sm">
          {/* Error Alert */}
          {error && (
            <Alert
              icon={<IconAlertCircle size={16} />}
              color="red"
              variant="light"
              withCloseButton
              onClose={() => onCustomPromptChange(customPrompt)}
            >
              {error}
            </Alert>
          )}

          {/* Generation Status */}
          {room?.generatedImages && room.generatedImages.length > 0 && (
            <Group gap="xs">
              <IconCheck size={16} color="green" />
              <Text size="sm" c="dimmed">
                {t('lastGenerated')}: {new Date(room.generatedImages[room.generatedImages.length - 1].createdAt).toLocaleString(locale === 'he' ? 'he-IL' : 'en-US')}
              </Text>
            </Group>
          )}

          {/* Custom Prompt Input */}
          <Textarea
            placeholder={t('customPromptPlaceholder')}
            value={customPrompt}
            onChange={(e) => onCustomPromptChange(e.target.value)}
            rows={2}
            disabled={isGenerating}
            styles={{
              input: {
                direction: 'rtl',
              },
            }}
          />
        </Stack>
      </Box>
    </Box>
  )
}
