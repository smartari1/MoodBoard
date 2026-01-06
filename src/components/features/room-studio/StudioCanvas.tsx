/**
 * StudioCanvas Component
 * Center area for new image generation display
 * Shows: Empty state | Generating state | Generated image preview
 */

'use client'

import {
  Box,
  Stack,
  Text,
  Paper,
  Progress,
  Alert,
  Badge,
  Loader,
  Image,
  Button,
  Group,
} from '@mantine/core'
import {
  IconSparkles,
  IconAlertCircle,
  IconRefresh,
  IconCheck,
  IconX,
} from '@tabler/icons-react'
import { useTranslations } from 'next-intl'
import type { ProjectRoom, GeneratedImage } from './types'

interface StudioCanvasProps {
  room?: ProjectRoom
  isGenerating?: boolean
  progress?: number
  error?: string | null
  // Preview image (not yet saved to DB - pending approval)
  previewImage?: GeneratedImage | null
  // Whether the preview is being approved (saving to DB)
  isApproving?: boolean
  // Handlers for preview workflow
  onApprove?: () => void
  onDiscard?: () => void
  onDone?: () => void
}

export function StudioCanvas({
  room,
  isGenerating = false,
  progress = 0,
  error,
  previewImage,
  isApproving = false,
  onApprove,
  onDiscard,
  onDone,
}: StudioCanvasProps) {
  const t = useTranslations('projectStyle.studio')

  // Count of existing images for badge
  const existingCount = room?.generatedImages?.length || 0

  // Determine which state to show
  const showGenerating = isGenerating
  const showPreview = !isGenerating && previewImage
  const showEmpty = !isGenerating && !previewImage

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
      <Box
        flex={1}
        p="xl"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          overflow: 'auto',
        }}
      >
        {showGenerating && (
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
        )}

        {showPreview && (
          // Preview Image - Pending Approval
          <Stack align="center" gap="lg" w="100%" maw={800}>
            {/* Preview Badge */}
            <Badge variant="light" color="yellow" size="lg">
              {t('preview')}
            </Badge>

            <Paper
              radius="lg"
              withBorder
              shadow="md"
              style={{ overflow: 'hidden', width: '100%' }}
            >
              <Image
                src={previewImage.url}
                alt={previewImage.prompt || 'Generated image'}
                fit="contain"
                style={{ maxHeight: 'calc(100vh - 350px)' }}
              />
            </Paper>

            {/* Preview Action Buttons: Discard | Approve & Save */}
            <Group justify="center" gap="md">
              <Button
                variant="light"
                color="red"
                leftSection={<IconX size={18} />}
                size="md"
                onClick={onDiscard}
                disabled={isApproving}
              >
                {t('discard')}
              </Button>
              <Button
                variant="filled"
                color="green"
                leftSection={<IconCheck size={18} />}
                size="md"
                onClick={onApprove}
                loading={isApproving}
              >
                {t('approveAndSave')}
              </Button>
            </Group>

            {/* Image count badge */}
            {existingCount > 0 && (
              <Badge variant="light" color="gray" size="sm">
                {existingCount} {t('existingVariants')}
              </Badge>
            )}
          </Stack>
        )}

        {showEmpty && (
          // Empty State - Ready for generation
          <Paper p="xl" radius="lg" withBorder style={{ maxWidth: 500 }}>
            <Stack align="center" gap="md">
              <Box
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  backgroundColor: 'var(--mantine-color-brand-0)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <IconSparkles size={40} color="var(--mantine-color-brand-6)" />
              </Box>
              <Text fw={600} size="lg" ta="center">
                {t('readyToGenerate')}
              </Text>
              <Text size="sm" c="dimmed" ta="center" maw={350}>
                {t('readyToGenerateDescription')}
              </Text>
              {existingCount > 0 && (
                <Badge variant="light" color="gray" size="sm">
                  {existingCount} {t('existingVariants')}
                </Badge>
              )}
            </Stack>
          </Paper>
        )}
      </Box>

      {/* Error Alert - shown at bottom if present */}
      {error && (
        <Box
          p="md"
          style={(theme) => ({
            borderTop: `1px solid ${theme.colors.gray[2]}`,
            backgroundColor: theme.white,
          })}
        >
          <Alert
            icon={<IconAlertCircle size={16} />}
            color="red"
            variant="light"
            withCloseButton
            onClose={() => {}}
          >
            {error}
          </Alert>
        </Box>
      )}
    </Box>
  )
}
