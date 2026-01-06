/**
 * IngredientSidebar Component
 * Left sidebar with expandable sections for ingredient selection
 * Kive-style blocks with RTL support
 */

'use client'

import { Box, ScrollArea, Stack, Button, Group, Divider } from '@mantine/core'
import { IconLibrary, IconPlus } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'
import { CategorySelector } from './CategorySelector'
import { IngredientSection } from './IngredientSection'
import type {
  ColorItem,
  TextureItem,
  MaterialItem,
  CategoryItem,
  SubCategoryItem,
} from './types'

interface IngredientSidebarProps {
  // Category
  categories: CategoryItem[]
  subCategories: SubCategoryItem[]
  selectedCategoryId: string | null
  selectedSubCategoryId: string | null
  onSelectCategory: (id: string | null) => void
  onSelectSubCategory: (id: string | null) => void
  // Colors
  availableColors: ColorItem[]
  selectedColorIds: string[]
  onToggleColor: (id: string) => void
  // Textures
  availableTextures: TextureItem[]
  selectedTextureIds: string[]
  onToggleTexture: (id: string) => void
  // Materials
  availableMaterials: MaterialItem[]
  selectedMaterialIds: string[]
  onToggleMaterial: (id: string) => void
  // Custom actions
  onAddFromLibrary?: (type: 'color' | 'texture' | 'material') => void
  onCreateCustom?: (type: 'color' | 'texture' | 'material') => void
  // Locale
  locale: string
}

export function IngredientSidebar({
  categories,
  subCategories,
  selectedCategoryId,
  selectedSubCategoryId,
  onSelectCategory,
  onSelectSubCategory,
  availableColors,
  selectedColorIds,
  onToggleColor,
  availableTextures,
  selectedTextureIds,
  onToggleTexture,
  availableMaterials,
  selectedMaterialIds,
  onToggleMaterial,
  onAddFromLibrary,
  onCreateCustom,
  locale,
}: IngredientSidebarProps) {
  const t = useTranslations('projectStyle.studio')

  return (
    <Box
      w={320}
      h="100%"
      style={(theme) => ({
        borderInlineEnd: `1px solid ${theme.colors.gray[2]}`,
        backgroundColor: theme.colors.gray[0],
        display: 'flex',
        flexDirection: 'column',
      })}
    >
      <ScrollArea flex={1} p="md">
        <Stack gap="md">
          {/* Category Selector */}
          <CategorySelector
            categories={categories}
            subCategories={subCategories}
            selectedCategoryId={selectedCategoryId}
            selectedSubCategoryId={selectedSubCategoryId}
            onSelectCategory={onSelectCategory}
            onSelectSubCategory={onSelectSubCategory}
            locale={locale}
          />

          <Divider />

          {/* Colors Section */}
          <IngredientSection
            type="color"
            title={t('colors')}
            items={availableColors}
            selectedIds={selectedColorIds}
            onToggle={onToggleColor}
            locale={locale}
            defaultExpanded
          />

          {/* Textures Section */}
          <IngredientSection
            type="texture"
            title={t('textures')}
            items={availableTextures}
            selectedIds={selectedTextureIds}
            onToggle={onToggleTexture}
            locale={locale}
          />

          {/* Materials Section */}
          <IngredientSection
            type="material"
            title={t('materials')}
            items={availableMaterials}
            selectedIds={selectedMaterialIds}
            onToggle={onToggleMaterial}
            locale={locale}
          />
        </Stack>
      </ScrollArea>

      {/* Bottom Actions */}
      <Box p="md" style={(theme) => ({ borderTop: `1px solid ${theme.colors.gray[2]}` })}>
        <Stack gap="xs">
          {onAddFromLibrary && (
            <Button
              variant="light"
              leftSection={<IconLibrary size={16} />}
              fullWidth
              size="sm"
              onClick={() => onAddFromLibrary('color')}
            >
              {t('addFromLibrary')}
            </Button>
          )}
          {onCreateCustom && (
            <Button
              variant="subtle"
              leftSection={<IconPlus size={16} />}
              fullWidth
              size="sm"
              onClick={() => onCreateCustom('color')}
            >
              {t('createCustom')}
            </Button>
          )}
        </Stack>
      </Box>
    </Box>
  )
}
