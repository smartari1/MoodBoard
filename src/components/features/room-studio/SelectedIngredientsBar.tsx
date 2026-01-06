/**
 * SelectedIngredientsBar Component
 * Bottom bar showing selected ingredients as chips
 */

'use client'

import { Box, ScrollArea, Group, Text } from '@mantine/core'
import { IconCheck } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'
import { SelectedChip } from './SelectedChip'
import type { ColorItem, TextureItem, MaterialItem } from './types'

interface SelectedIngredientsBarProps {
  colors: ColorItem[]
  textures: TextureItem[]
  materials: MaterialItem[]
  onRemove: (type: 'color' | 'texture' | 'material', id: string) => void
  locale: string
}

export function SelectedIngredientsBar({
  colors,
  textures,
  materials,
  onRemove,
  locale,
}: SelectedIngredientsBarProps) {
  const t = useTranslations('projectStyle.studio')

  const totalCount = colors.length + textures.length + materials.length

  if (totalCount === 0) {
    return (
      <Box
        p="md"
        style={(theme) => ({
          borderTop: `1px solid ${theme.colors.gray[2]}`,
          backgroundColor: theme.white,
        })}
      >
        <Text size="sm" c="dimmed" ta="center">
          {t('noSelection')}
        </Text>
      </Box>
    )
  }

  return (
    <Box
      style={(theme) => ({
        borderTop: `1px solid ${theme.colors.gray[2]}`,
        backgroundColor: theme.white,
      })}
    >
      <Box px="md" py="xs">
        <Group gap="xs" align="center">
          <IconCheck size={16} />
          <Text size="sm" fw={500}>
            {t('selectedIngredients')}
          </Text>
          <Text size="xs" c="dimmed">
            ({totalCount})
          </Text>
        </Group>
      </Box>

      <ScrollArea
        scrollbarSize={6}
        offsetScrollbars
        px="md"
        pb="md"
        style={{ direction: 'rtl' }}
      >
        <Group gap="xs" wrap="nowrap">
          {/* Colors */}
          {colors.map((color) => (
            <SelectedChip
              key={`color-${color.id}`}
              type="color"
              item={color}
              onRemove={() => onRemove('color', color.id)}
              locale={locale}
            />
          ))}

          {/* Textures */}
          {textures.map((texture) => (
            <SelectedChip
              key={`texture-${texture.id}`}
              type="texture"
              item={texture}
              onRemove={() => onRemove('texture', texture.id)}
              locale={locale}
            />
          ))}

          {/* Materials */}
          {materials.map((material) => (
            <SelectedChip
              key={`material-${material.id}`}
              type="material"
              item={material}
              onRemove={() => onRemove('material', material.id)}
              locale={locale}
            />
          ))}
        </Group>
      </ScrollArea>
    </Box>
  )
}
