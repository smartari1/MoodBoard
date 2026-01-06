/**
 * ImagePreviewModal Component
 * Simple lightbox modal for viewing existing generated images
 * Options: Open in Studio, Delete
 */

'use client'

import {
  Modal,
  Box,
  Stack,
  Group,
  Button,
  Text,
  Image,
  ActionIcon,
} from '@mantine/core'
import {
  IconTrash,
  IconSparkles,
  IconX,
} from '@tabler/icons-react'
import { useTranslations } from 'next-intl'
import type { GeneratedImage, ProjectRoom } from './types'

interface ImagePreviewModalProps {
  opened: boolean
  onClose: () => void
  image: GeneratedImage | null
  room: ProjectRoom | null
  onOpenInStudio: () => void
  onDelete: () => void
  isDeleting?: boolean
  locale?: string
}

export function ImagePreviewModal({
  opened,
  onClose,
  image,
  room,
  onOpenInStudio,
  onDelete,
  isDeleting = false,
  locale = 'he',
}: ImagePreviewModalProps) {
  const t = useTranslations('projectStyle')

  if (!image) return null

  // Format date
  const createdDate = image.createdAt
    ? new Date(image.createdAt).toLocaleDateString(locale === 'he' ? 'he-IL' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size={1000}
      centered
      withCloseButton={false}
      padding={0}
      radius="lg"
      styles={{
        body: {
          overflow: 'hidden',
        },
      }}
    >
      {/* Header */}
      <Box
        p="md"
        style={{
          borderBottom: '1px solid var(--mantine-color-gray-2)',
          backgroundColor: 'var(--mantine-color-white)',
        }}
      >
        <Group justify="space-between" align="center">
          <Stack gap={2}>
            <Text fw={600} size="lg">
              {room?.name || room?.roomType || t('imagePreview.untitledRoom')}
            </Text>
            {createdDate && (
              <Text size="xs" c="dimmed">
                {t('imagePreview.createdOn', { date: createdDate })}
              </Text>
            )}
          </Stack>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="lg"
            onClick={onClose}
          >
            <IconX size={20} />
          </ActionIcon>
        </Group>
      </Box>

      {/* Image Display */}
      <Box
        p="md"
        style={{
          backgroundColor: 'var(--mantine-color-gray-1)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 400,
          maxHeight: 'calc(80vh - 180px)',
          overflow: 'auto',
        }}
      >
        <Image
          src={image.url}
          alt={image.prompt || t('imagePreview.generatedImage')}
          fit="contain"
          radius="md"
          style={{
            maxHeight: 'calc(80vh - 200px)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
          }}
        />
      </Box>

      {/* Prompt Display */}
      {image.prompt && (
        <Box
          px="md"
          py="sm"
          style={{
            borderTop: '1px solid var(--mantine-color-gray-2)',
            backgroundColor: 'var(--mantine-color-gray-0)',
          }}
        >
          <Text size="sm" c="dimmed" lineClamp={2}>
            {image.prompt}
          </Text>
        </Box>
      )}

      {/* Actions */}
      <Box
        p="md"
        style={{
          borderTop: '1px solid var(--mantine-color-gray-2)',
          backgroundColor: 'var(--mantine-color-white)',
        }}
      >
        <Group justify="space-between">
          <Button
            variant="light"
            color="red"
            leftSection={<IconTrash size={16} />}
            onClick={onDelete}
            loading={isDeleting}
          >
            {t('imagePreview.delete')}
          </Button>
          <Button
            variant="filled"
            color="brand"
            leftSection={<IconSparkles size={16} />}
            onClick={onOpenInStudio}
          >
            {t('imagePreview.openInStudio')}
          </Button>
        </Group>
      </Box>
    </Modal>
  )
}
