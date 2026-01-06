/**
 * IngredientItem Component
 * Selectable ingredient card with visual indicator
 */

'use client'

import { Box, ColorSwatch, Image, Tooltip, Center, Text } from '@mantine/core'
import { IconCheck, IconTexture, IconCube } from '@tabler/icons-react'
import type { ColorItem, TextureItem, MaterialItem } from './types'

type IngredientType = 'color' | 'texture' | 'material'

interface IngredientItemProps {
  type: IngredientType
  item: ColorItem | TextureItem | MaterialItem
  isSelected: boolean
  onToggle: () => void
  locale: string
}

export function IngredientItem({
  type,
  item,
  isSelected,
  onToggle,
  locale,
}: IngredientItemProps) {
  // Get localized name
  const getName = (name: { he: string; en: string }) =>
    locale === 'he' ? name.he : name.en

  const name = getName(item.name)

  // Render based on type
  if (type === 'color') {
    const colorItem = item as ColorItem
    return (
      <Tooltip label={name} withArrow>
        <Box
          style={{
            position: 'relative',
            cursor: 'pointer',
          }}
          onClick={onToggle}
        >
          <ColorSwatch
            color={colorItem.hex}
            size={36}
            radius="sm"
            style={{
              border: isSelected
                ? '2px solid var(--mantine-color-brand-6)'
                : '1px solid var(--mantine-color-gray-3)',
              boxShadow: isSelected
                ? '0 0 0 2px var(--mantine-color-brand-1)'
                : 'none',
            }}
          />
          {isSelected && (
            <Box
              style={{
                position: 'absolute',
                top: -4,
                insetInlineEnd: -4,
                backgroundColor: 'var(--mantine-color-brand-6)',
                borderRadius: '50%',
                width: 16,
                height: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconCheck size={10} color="white" />
            </Box>
          )}
        </Box>
      </Tooltip>
    )
  }

  if (type === 'texture') {
    const textureItem = item as TextureItem
    const imageUrl = textureItem.thumbnailUrl || textureItem.imageUrl
    return (
      <Tooltip label={name} withArrow>
        <Box
          style={{
            position: 'relative',
            cursor: 'pointer',
            borderRadius: 'var(--mantine-radius-sm)',
            overflow: 'hidden',
            border: isSelected
              ? '2px solid var(--mantine-color-brand-6)'
              : '1px solid var(--mantine-color-gray-3)',
            boxShadow: isSelected
              ? '0 0 0 2px var(--mantine-color-brand-1)'
              : 'none',
          }}
          onClick={onToggle}
        >
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={name}
              w={60}
              h={60}
              fit="cover"
            />
          ) : (
            <Center w={60} h={60} bg="gray.1">
              <IconTexture size={24} color="gray" />
            </Center>
          )}
          {isSelected && (
            <Box
              style={{
                position: 'absolute',
                top: -4,
                insetInlineEnd: -4,
                backgroundColor: 'var(--mantine-color-brand-6)',
                borderRadius: '50%',
                width: 16,
                height: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconCheck size={10} color="white" />
            </Box>
          )}
        </Box>
      </Tooltip>
    )
  }

  if (type === 'material') {
    const materialItem = item as MaterialItem
    const imageUrl = materialItem.assets?.thumbnail || materialItem.assets?.images?.[0]
    return (
      <Tooltip label={name} withArrow>
        <Box
          style={{
            position: 'relative',
            cursor: 'pointer',
            borderRadius: 'var(--mantine-radius-sm)',
            overflow: 'hidden',
            border: isSelected
              ? '2px solid var(--mantine-color-brand-6)'
              : '1px solid var(--mantine-color-gray-3)',
            boxShadow: isSelected
              ? '0 0 0 2px var(--mantine-color-brand-1)'
              : 'none',
          }}
          onClick={onToggle}
        >
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={name}
              w={60}
              h={60}
              fit="cover"
            />
          ) : (
            <Center w={60} h={60} bg="gray.1">
              <IconCube size={24} color="gray" />
            </Center>
          )}
          {isSelected && (
            <Box
              style={{
                position: 'absolute',
                top: -4,
                insetInlineEnd: -4,
                backgroundColor: 'var(--mantine-color-brand-6)',
                borderRadius: '50%',
                width: 16,
                height: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconCheck size={10} color="white" />
            </Box>
          )}
        </Box>
      </Tooltip>
    )
  }

  return null
}
