/**
 * SelectedChip Component
 * Individual chip showing selected ingredient with thumbnail and remove button
 */

'use client'

import {
  Paper,
  Group,
  Text,
  ActionIcon,
  ColorSwatch,
  Image,
  Box,
  Badge,
} from '@mantine/core'
import { IconX, IconPalette, IconTexture, IconCube } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'
import type { ColorItem, TextureItem, MaterialItem } from './types'

type IngredientType = 'color' | 'texture' | 'material'

interface SelectedChipProps {
  type: IngredientType
  item: ColorItem | TextureItem | MaterialItem
  onRemove: () => void
  locale: string
}

export function SelectedChip({
  type,
  item,
  onRemove,
  locale,
}: SelectedChipProps) {
  const t = useTranslations('projectStyle.studio')

  // Get localized name
  const getName = (name: { he: string; en: string }) =>
    locale === 'he' ? name.he : name.en

  const name = getName(item.name)

  // Get category label
  const getCategoryLabel = () => {
    switch (type) {
      case 'color':
        return t('color')
      case 'texture':
        return t('texture')
      case 'material':
        return t('material')
    }
  }

  // Get category color
  const getCategoryColor = () => {
    switch (type) {
      case 'color':
        return 'pink'
      case 'texture':
        return 'cyan'
      case 'material':
        return 'grape'
    }
  }

  // Render thumbnail based on type
  const renderThumbnail = () => {
    if (type === 'color') {
      const colorItem = item as ColorItem
      return (
        <ColorSwatch
          color={colorItem.hex}
          size={24}
          radius="xs"
        />
      )
    }

    if (type === 'texture') {
      const textureItem = item as TextureItem
      const imageUrl = textureItem.thumbnailUrl || textureItem.imageUrl
      return imageUrl ? (
        <Image
          src={imageUrl}
          alt={name}
          w={24}
          h={24}
          radius="xs"
          fit="cover"
        />
      ) : (
        <Box
          w={24}
          h={24}
          bg="gray.2"
          style={{
            borderRadius: 'var(--mantine-radius-xs)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <IconTexture size={14} color="gray" />
        </Box>
      )
    }

    if (type === 'material') {
      const materialItem = item as MaterialItem
      const imageUrl = materialItem.assets?.thumbnail || materialItem.assets?.images?.[0]
      return imageUrl ? (
        <Image
          src={imageUrl}
          alt={name}
          w={24}
          h={24}
          radius="xs"
          fit="cover"
        />
      ) : (
        <Box
          w={24}
          h={24}
          bg="gray.2"
          style={{
            borderRadius: 'var(--mantine-radius-xs)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <IconCube size={14} color="gray" />
        </Box>
      )
    }

    return null
  }

  return (
    <Paper
      p="xs"
      radius="md"
      withBorder
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--mantine-spacing-xs)',
        whiteSpace: 'nowrap',
      }}
    >
      {/* Thumbnail */}
      {renderThumbnail()}

      {/* Name and Category */}
      <Box>
        <Text size="sm" fw={500} lh={1.2}>
          {name}
        </Text>
        <Badge size="xs" variant="light" color={getCategoryColor()}>
          {getCategoryLabel()}
        </Badge>
      </Box>

      {/* Remove Button */}
      <ActionIcon
        variant="subtle"
        color="gray"
        size="sm"
        onClick={onRemove}
        aria-label={`${t('remove')} ${name}`}
      >
        <IconX size={14} />
      </ActionIcon>
    </Paper>
  )
}
