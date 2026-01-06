/**
 * IngredientSection Component
 * Collapsible section for each ingredient type (colors, textures, materials)
 */

'use client'

import { useState, useMemo } from 'react'
import {
  Paper,
  Collapse,
  Group,
  Text,
  ActionIcon,
  Badge,
  TextInput,
  SimpleGrid,
  Stack,
  Box,
} from '@mantine/core'
import {
  IconChevronDown,
  IconChevronUp,
  IconSearch,
  IconPalette,
  IconTexture,
  IconCube,
} from '@tabler/icons-react'
import { IngredientItem } from './IngredientItem'
import type { ColorItem, TextureItem, MaterialItem } from './types'

type IngredientType = 'color' | 'texture' | 'material'
type IngredientItemType = ColorItem | TextureItem | MaterialItem

interface IngredientSectionProps {
  type: IngredientType
  title: string
  items: IngredientItemType[]
  selectedIds: string[]
  onToggle: (id: string) => void
  locale: string
  defaultExpanded?: boolean
}

export function IngredientSection({
  type,
  title,
  items,
  selectedIds,
  onToggle,
  locale,
  defaultExpanded = false,
}: IngredientSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [searchQuery, setSearchQuery] = useState('')

  // Get icon based on type
  const getIcon = () => {
    switch (type) {
      case 'color':
        return <IconPalette size={18} />
      case 'texture':
        return <IconTexture size={18} />
      case 'material':
        return <IconCube size={18} />
    }
  }

  // Get localized name
  const getName = (name: { he: string; en: string }) =>
    locale === 'he' ? name.he : name.en

  // Filter items by search
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items
    const query = searchQuery.toLowerCase()
    return items.filter((item) => {
      const name = getName(item.name).toLowerCase()
      return name.includes(query)
    })
  }, [items, searchQuery, locale])

  // Count selected
  const selectedCount = selectedIds.length

  return (
    <Paper radius="md" withBorder>
      {/* Header - Clickable to expand/collapse */}
      <Box
        p="sm"
        style={{ cursor: 'pointer' }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <Group justify="space-between">
          <Group gap="xs">
            {getIcon()}
            <Text fw={500} size="sm">
              {title}
            </Text>
            {selectedCount > 0 && (
              <Badge size="sm" variant="filled" color="brand">
                {selectedCount}
              </Badge>
            )}
          </Group>
          <ActionIcon variant="subtle" size="sm">
            {isExpanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
          </ActionIcon>
        </Group>
      </Box>

      {/* Content */}
      <Collapse in={isExpanded}>
        <Box px="sm" pb="sm">
          <Stack gap="sm">
            {/* Search */}
            {items.length > 6 && (
              <TextInput
                placeholder={`חיפוש ${title}...`}
                size="xs"
                leftSection={<IconSearch size={14} />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            )}

            {/* Items Grid */}
            {filteredItems.length > 0 ? (
              <SimpleGrid cols={type === 'color' ? 6 : 3} spacing="xs">
                {filteredItems.map((item) => (
                  <IngredientItem
                    key={item.id}
                    type={type}
                    item={item}
                    isSelected={selectedIds.includes(item.id)}
                    onToggle={() => onToggle(item.id)}
                    locale={locale}
                  />
                ))}
              </SimpleGrid>
            ) : (
              <Text size="xs" c="dimmed" ta="center" py="md">
                {searchQuery ? 'לא נמצאו תוצאות' : 'אין פריטים זמינים'}
              </Text>
            )}
          </Stack>
        </Box>
      </Collapse>
    </Paper>
  )
}
