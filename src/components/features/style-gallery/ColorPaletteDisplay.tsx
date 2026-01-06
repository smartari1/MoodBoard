'use client'

import { Box, Group, Text, Stack, Tooltip } from '@mantine/core'
import type { Color } from '@/hooks/useColors'

interface RoomColorPalette {
  primaryId?: string
  secondaryIds?: string[]
  accentIds?: string[]
  description?: { he: string; en: string }
}

interface ColorPaletteDisplayProps {
  colorPalette: RoomColorPalette
  colorMap: Map<string, Color>
  locale: 'he' | 'en'
}

export function ColorPaletteDisplay({ colorPalette, colorMap, locale }: ColorPaletteDisplayProps) {
  if (!colorPalette) return null

  const primaryColor = colorPalette.primaryId ? colorMap.get(colorPalette.primaryId) : null
  const secondaryColors = (colorPalette.secondaryIds || [])
    .map(id => colorMap.get(id))
    .filter(Boolean) as Color[]
  const accentColors = (colorPalette.accentIds || [])
    .map(id => colorMap.get(id))
    .filter(Boolean) as Color[]

  const hasColors = primaryColor || secondaryColors.length > 0 || accentColors.length > 0

  if (!hasColors) return null

  return (
    <Stack gap="md">
      {colorPalette.description?.[locale] && (
        <Text size="sm" c="dimmed">
          {colorPalette.description[locale]}
        </Text>
      )}

      <Group gap="lg" wrap="wrap" align="flex-start">
        {/* Primary Color */}
        {primaryColor && (
          <Stack gap={4} align="center">
            <Tooltip label={primaryColor.name[locale]}>
              <Box
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  backgroundColor: primaryColor.hex,
                  border: '3px solid rgba(0,0,0,0.1)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                }}
              />
            </Tooltip>
            <Text size="xs" fw={600} c="dimmed">
              {locale === 'he' ? 'ראשי' : 'Primary'}
            </Text>
            <Text size="xs" ta="center" maw={80} lineClamp={1}>
              {primaryColor.name[locale]}
            </Text>
          </Stack>
        )}

        {/* Secondary Colors */}
        {secondaryColors.length > 0 && (
          <Stack gap={4} align="center">
            <Group gap="xs">
              {secondaryColors.map((color) => (
                <Tooltip key={color.id} label={color.name[locale]}>
                  <Box
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      backgroundColor: color.hex,
                      border: '2px solid rgba(0,0,0,0.1)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    }}
                  />
                </Tooltip>
              ))}
            </Group>
            <Text size="xs" fw={600} c="dimmed">
              {locale === 'he' ? 'משניים' : 'Secondary'}
            </Text>
          </Stack>
        )}

        {/* Accent Colors */}
        {accentColors.length > 0 && (
          <Stack gap={4} align="center">
            <Group gap="xs">
              {accentColors.map((color) => (
                <Tooltip key={color.id} label={color.name[locale]}>
                  <Box
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      backgroundColor: color.hex,
                      border: '2px dashed rgba(0,0,0,0.2)',
                    }}
                  />
                </Tooltip>
              ))}
            </Group>
            <Text size="xs" fw={600} c="dimmed">
              {locale === 'he' ? 'הדגשות' : 'Accent'}
            </Text>
          </Stack>
        )}
      </Group>
    </Stack>
  )
}
