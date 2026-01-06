/**
 * StudioCanvas Component
 * Center preview area showing generated images gallery, room part selector, and generation progress
 */

'use client'

import { useState } from 'react'
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
  ScrollArea,
  SegmentedControl,
  ActionIcon,
} from '@mantine/core'
import {
  IconPhoto,
  IconSparkles,
  IconAlertCircle,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
} from '@tabler/icons-react'
import { useTranslations } from 'next-intl'
import type { ProjectRoom, GeneratedImage } from './types'

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
  isGenerating?: boolean
  progress?: number
  error?: string | null
  customPrompt: string
  onCustomPromptChange: (prompt: string) => void
  selectedRoomPart: string | null
  onRoomPartChange: (part: string | null) => void
  locale: string
}

export function StudioCanvas({
  room,
  isGenerating = false,
  progress = 0,
  error,
  customPrompt,
  onCustomPromptChange,
  selectedRoomPart,
  onRoomPartChange,
  locale,
}: StudioCanvasProps) {
  const t = useTranslations('projectStyle.studio')

  // All generated images for this room
  const allImages = room?.generatedImages || []

  // State for selected image in gallery (default to latest)
  const [selectedImageIndex, setSelectedImageIndex] = useState(allImages.length - 1)

  // Get the current image to display
  const currentImage = allImages[selectedImageIndex >= 0 ? selectedImageIndex : allImages.length - 1] || null

  // Navigation handlers
  const goToPrevious = () => {
    if (selectedImageIndex > 0) {
      setSelectedImageIndex(selectedImageIndex - 1)
    }
  }

  const goToNext = () => {
    if (selectedImageIndex < allImages.length - 1) {
      setSelectedImageIndex(selectedImageIndex + 1)
    }
  }

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
      </Box>

      {/* Main Canvas Area */}
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
        ) : currentImage ? (
          // Image Preview with Gallery
          <Stack gap="md" align="center" style={{ width: '100%', height: '100%' }}>
            {/* Main Image with Navigation */}
            <Box
              style={{
                position: 'relative',
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
              }}
            >
              {/* Previous Button */}
              {allImages.length > 1 && selectedImageIndex > 0 && (
                <ActionIcon
                  variant="filled"
                  color="white"
                  size="xl"
                  radius="xl"
                  pos="absolute"
                  left={16}
                  onClick={goToPrevious}
                  style={{ zIndex: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
                >
                  <IconChevronLeft size={24} />
                </ActionIcon>
              )}

              <Image
                src={currentImage.url}
                alt={room?.name || room?.roomType || 'Room'}
                radius="lg"
                style={{
                  maxHeight: 'calc(100vh - 400px)',
                  maxWidth: '100%',
                  objectFit: 'contain',
                }}
              />

              {/* Next Button */}
              {allImages.length > 1 && selectedImageIndex < allImages.length - 1 && (
                <ActionIcon
                  variant="filled"
                  color="white"
                  size="xl"
                  radius="xl"
                  pos="absolute"
                  right={16}
                  onClick={goToNext}
                  style={{ zIndex: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
                >
                  <IconChevronRight size={24} />
                </ActionIcon>
              )}

              {/* Image Info Overlay */}
              <Group
                pos="absolute"
                bottom={16}
                left={16}
                right={16}
                justify="space-between"
              >
                {currentImage.isForked && (
                  <Badge color="blue" variant="filled" size="sm">
                    {t('forked')}
                  </Badge>
                )}
                {allImages.length > 1 && (
                  <Badge variant="light" size="sm">
                    {selectedImageIndex + 1} / {allImages.length}
                  </Badge>
                )}
              </Group>
            </Box>

            {/* Thumbnail Gallery */}
            {allImages.length > 1 && (
              <ScrollArea w="100%" maw={600}>
                <Group gap="xs" wrap="nowrap" justify="center">
                  {allImages.map((img, index) => (
                    <Box
                      key={img.id || index}
                      style={{
                        cursor: 'pointer',
                        borderRadius: 8,
                        overflow: 'hidden',
                        border: index === selectedImageIndex
                          ? '2px solid var(--mantine-color-brand-6)'
                          : '2px solid transparent',
                        opacity: index === selectedImageIndex ? 1 : 0.7,
                        transition: 'all 0.2s ease',
                      }}
                      onClick={() => setSelectedImageIndex(index)}
                    >
                      <Image
                        src={img.url}
                        alt={`Version ${index + 1}`}
                        w={60}
                        h={60}
                        fit="cover"
                      />
                    </Box>
                  ))}
                </Group>
              </ScrollArea>
            )}
          </Stack>
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
          {allImages.length > 0 && (
            <Group gap="xs">
              <IconCheck size={16} color="green" />
              <Text size="sm" c="dimmed">
                {t('lastGenerated')}: {new Date(allImages[allImages.length - 1].createdAt).toLocaleString(locale === 'he' ? 'he-IL' : 'en-US')}
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
