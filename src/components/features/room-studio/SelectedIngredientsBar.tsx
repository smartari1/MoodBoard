/**
 * SelectedIngredientsBar Component
 * Bottom bar showing selected ingredients and reference images as chips
 */

'use client'

import { Box, ScrollArea, Group, Text, Image, Paper, Badge } from '@mantine/core'
import { IconCheck } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'
import { SelectedChip } from './SelectedChip'
import type { ColorItem, TextureItem, MaterialItem, GeneratedImage } from './types'

interface SelectedIngredientsBarProps {
  colors: ColorItem[]
  textures: TextureItem[]
  materials: MaterialItem[]
  referenceImages?: GeneratedImage[]
  onRemove: (type: 'color' | 'texture' | 'material', id: string) => void
  locale: string
}

export function SelectedIngredientsBar({
  colors,
  textures,
  materials,
  referenceImages = [],
  onRemove,
  locale,
}: SelectedIngredientsBarProps) {
  const t = useTranslations('projectStyle.studio')

  const totalCount = colors.length + textures.length + materials.length
  const hasReferenceImages = referenceImages.length > 0

  if (totalCount === 0 && !hasReferenceImages) {
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
          {/* Reference Images - same style as other chips */}
          {referenceImages.map((img, index) => (
            <Paper
              key={img.id || `ref-${index}`}
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
              <Image
                src={img.url}
                alt={`Reference ${index + 1}`}
                w={24}
                h={24}
                radius="xs"
                fit="cover"
              />
              <Box>
                <Text size="sm" fw={500} lh={1.2}>
                  {t('image')} {index + 1}
                </Text>
                <Badge size="xs" variant="light" color="blue">
                  {t('reference')}
                </Badge>
              </Box>
            </Paper>
          ))}

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
