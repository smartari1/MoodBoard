/**
 * QuickActionPrompts Component
 * Displays clickable prompt chips for quick room design modifications
 * Each room type has specific prompts relevant to that space
 */

'use client'

import { ScrollArea, Group, Badge, Text, Box } from '@mantine/core'
import { useTranslations } from 'next-intl'

// Quick action prompts organized by room type slug
// Default prompts are used when room type is not found
const QUICK_ACTIONS: Record<string, string[]> = {
  living_room: [
    'addAccentWall',
    'brightenSpace',
    'addTexture',
    'updateLighting',
    'addGreenery',
  ],
  bedroom: [
    'addAccentWall',
    'createCoziness',
    'updateBedding',
    'addAmbientLight',
    'addTexture',
  ],
  master_bedroom: [
    'addAccentWall',
    'createCoziness',
    'updateBedding',
    'addAmbientLight',
    'addWalkInCloset',
  ],
  kitchen: [
    'updateBacksplash',
    'changeCountertop',
    'modernizeCabinets',
    'addIsland',
    'updateLighting',
  ],
  bathroom: [
    'updateTiles',
    'addStorage',
    'improveVanity',
    'addMirrorWall',
    'updateLighting',
  ],
  dining_room: [
    'addAccentWall',
    'updateLighting',
    'addTexture',
    'changeFlooring',
    'addGreenery',
  ],
  home_office: [
    'brightenSpace',
    'addStorage',
    'updateLighting',
    'addGreenery',
    'addTexture',
  ],
  kids_room: [
    'addAccentWall',
    'brightenSpace',
    'addStorage',
    'addPlayArea',
    'updateLighting',
  ],
  guest_room: [
    'createCoziness',
    'addTexture',
    'updateBedding',
    'addAmbientLight',
    'addStorage',
  ],
  default: [
    'addAccentWall',
    'brightenSpace',
    'addTexture',
    'changeFlooring',
    'updateLighting',
  ],
}

// Maps prompt keys to actual prompt text (in English - will be translated via t())
const PROMPT_TEXT: Record<string, string> = {
  addAccentWall: 'Add an accent wall',
  brightenSpace: 'Brighten the space',
  addTexture: 'Add texture and depth',
  changeFlooring: 'Change the flooring style',
  updateLighting: 'Update the lighting',
  addGreenery: 'Add plants and greenery',
  createCoziness: 'Create a cozy atmosphere',
  updateBedding: 'Update the bedding style',
  addAmbientLight: 'Add ambient lighting',
  addWalkInCloset: 'Add walk-in closet',
  updateBacksplash: 'Update the backsplash',
  changeCountertop: 'Change the countertop',
  modernizeCabinets: 'Modernize the cabinets',
  addIsland: 'Add a kitchen island',
  updateTiles: 'Update the tiles',
  addStorage: 'Add storage solutions',
  improveVanity: 'Improve the vanity',
  addMirrorWall: 'Add a mirror wall',
  addPlayArea: 'Add a play area',
}

interface QuickActionPromptsProps {
  roomType: string | null  // Room type slug (e.g., 'living_room')
  onSelectPrompt: (promptText: string) => void
  locale: string
}

export function QuickActionPrompts({
  roomType,
  onSelectPrompt,
  locale,
}: QuickActionPromptsProps) {
  const t = useTranslations('projectStyle.studio.quickActions')

  // Get prompts for this room type, fallback to default
  const promptKeys = QUICK_ACTIONS[roomType || 'default'] || QUICK_ACTIONS.default

  const handlePromptClick = (promptKey: string) => {
    // Try to get translated prompt, fallback to English
    try {
      const translatedPrompt = t(promptKey)
      onSelectPrompt(translatedPrompt)
    } catch {
      // Fallback to English prompt text
      onSelectPrompt(PROMPT_TEXT[promptKey] || promptKey)
    }
  }

  return (
    <Box>
      <Text size="xs" c="dimmed" mb="xs">
        {t('title')}
      </Text>
      <ScrollArea>
        <Group gap="xs" wrap="nowrap">
          {promptKeys.map((promptKey) => (
            <Badge
              key={promptKey}
              variant="light"
              color="brand"
              size="lg"
              style={{ cursor: 'pointer', flexShrink: 0 }}
              onClick={() => handlePromptClick(promptKey)}
            >
              {(() => {
                try {
                  return t(promptKey)
                } catch {
                  return PROMPT_TEXT[promptKey] || promptKey
                }
              })()}
            </Badge>
          ))}
        </Group>
      </ScrollArea>
    </Box>
  )
}
