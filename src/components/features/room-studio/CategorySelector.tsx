/**
 * CategorySelector Component
 * Category and SubCategory selection dropdowns
 */

'use client'

import { Paper, Stack, Group, Text, Select } from '@mantine/core'
import { IconCategory } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'
import { useMemo } from 'react'
import type { CategoryItem, SubCategoryItem } from './types'

interface CategorySelectorProps {
  categories: CategoryItem[]
  subCategories: SubCategoryItem[]
  selectedCategoryId: string | null
  selectedSubCategoryId: string | null
  onSelectCategory: (id: string | null) => void
  onSelectSubCategory: (id: string | null) => void
  locale: string
}

export function CategorySelector({
  categories,
  subCategories,
  selectedCategoryId,
  selectedSubCategoryId,
  onSelectCategory,
  onSelectSubCategory,
  locale,
}: CategorySelectorProps) {
  const t = useTranslations('projectStyle.studio')

  // Get localized name
  const getName = (name: { he: string; en: string }) =>
    locale === 'he' ? name.he : name.en

  // Category options
  const categoryOptions = useMemo(
    () =>
      categories.map((cat) => ({
        value: cat.id,
        label: getName(cat.name),
      })),
    [categories, locale]
  )

  // SubCategory options (filtered by selected category)
  const subCategoryOptions = useMemo(
    () =>
      subCategories.map((sc) => ({
        value: sc.id,
        label: getName(sc.name),
      })),
    [subCategories, locale]
  )

  const handleCategoryChange = (value: string | null) => {
    onSelectCategory(value)
    // Reset subcategory when category changes
    if (value !== selectedCategoryId) {
      onSelectSubCategory(null)
    }
  }

  return (
    <Paper p="sm" mb="md" radius="md" withBorder>
      <Stack gap="sm">
        <Group gap="xs">
          <IconCategory size={18} />
          <Text fw={500} size="sm">
            {t('category')}
          </Text>
        </Group>

        <Select
          data={categoryOptions}
          value={selectedCategoryId}
          onChange={handleCategoryChange}
          placeholder={t('selectCategory')}
          clearable
          searchable
          size="sm"
        />

        {selectedCategoryId && subCategoryOptions.length > 0 && (
          <Select
            data={subCategoryOptions}
            value={selectedSubCategoryId}
            onChange={onSelectSubCategory}
            placeholder={t('selectSubCategory')}
            clearable
            searchable
            size="sm"
          />
        )}
      </Stack>
    </Paper>
  )
}
