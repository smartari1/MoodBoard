/**
 * StudioCanvas Component
 * Center area for new image generation display
 * Note: Prompt input is now in ChatPanel (left side)
 */

'use client'

import {
  Box,
  Stack,
  Text,
  Paper,
  Progress,
  Alert,
  Group,
  Badge,
  Loader,
  SegmentedControl,
} from '@mantine/core'
import {
  IconSparkles,
  IconAlertCircle,
} from '@tabler/icons-react'
import { useTranslations } from 'next-intl'
import type { ProjectRoom } from './types'
import { QuickActionPrompts } from './QuickActionPrompts'

// Room parts that can be generated
const ROOM_PARTS = [
  { value: 'general', labelKey: 'roomParts.general' },
  { value: 'ceiling', labelKey: 'roomParts.ceiling' },
  { value: 'floor', labelKey: 'roomParts.floor' },
  { value: 'walls', labelKey: 'roomParts.walls' },
  { value: 'lighting', labelKey: 'roomParts.lighting' },
] as const

interface StudioCanvasProps {
  room?: ProjectRoom
  roomType?: string | null  // Room type slug for quick action prompts
  isGenerating?: boolean
  progress?: number
  error?: string | null
  customPrompt?: string  // For display only (from chat)
  onCustomPromptChange?: (prompt: string) => void  // For quick action prompts
  selectedRoomPart: string | null
  onRoomPartChange: (part: string | null) => void
  locale: string
}

export function StudioCanvas({
  room,
  roomType,
  isGenerating = false,
  progress = 0,
  error,
  customPrompt = '',
  onCustomPromptChange,
  selectedRoomPart,
  onRoomPartChange,
  locale,
}: StudioCanvasProps) {
  const t = useTranslations('projectStyle.studio')

  // Count of existing images for badge
  const existingCount = room?.generatedImages?.length || 0

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
      {/* Room Part Selector */}
      <Box p="md" style={{ backgroundColor: 'var(--mantine-color-white)' }}>
        <Stack gap="md">
          <Group justify="center">
            <SegmentedControl
              value={selectedRoomPart || 'general'}
              onChange={(value) => onRoomPartChange(value === 'general' ? null : value)}
              data={ROOM_PARTS.map((part) => ({
                value: part.value,
                label: t(part.labelKey),
              }))}
              size="sm"
            />
          </Group>

          {/* Quick Action Prompts */}
          {onCustomPromptChange && (
            <QuickActionPrompts
              roomType={roomType || room?.roomType || null}
              onSelectPrompt={(promptText) => {
                const newPrompt = customPrompt
                  ? `${customPrompt}. ${promptText}`
                  : promptText
                onCustomPromptChange(newPrompt)
              }}
              locale={locale}
            />
          )}
        </Stack>
      </Box>

      {/* Main Canvas Area - For New Generation */}
      <Box flex={1} p="xl" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
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
        ) : (
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
