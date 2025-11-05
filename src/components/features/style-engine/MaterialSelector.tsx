/**
 * Simplified MaterialSelector Component
 * Simple MultiSelect with SKU display, similar to color selector
 */

'use client'

import { useMaterials, type Material } from '@/hooks/useMaterials'
import { Group, MultiSelect, Text } from '@mantine/core'
import { useTranslations } from 'next-intl'
import { useMemo } from 'react'
import { Control, Controller, FieldPath, FieldValues } from 'react-hook-form'

interface MaterialSelectorProps<T extends FieldValues> {
  control: Control<T>
  name: FieldPath<T>
  locale: string
  label?: string
  description?: string
  placeholder?: string
  limit?: number
  error?: string
}

export function MaterialSelector<T extends FieldValues>({
  control,
  name,
  locale,
  label,
  description,
  placeholder,
  limit = 100,
  error,
}: MaterialSelectorProps<T>) {
  const t = useTranslations('admin.styles.create')

  // Fetch materials
  const { data: materialsData } = useMaterials({ page: 1, limit })
  const materials = materialsData?.data || []

  // Material options with SKU
  const materialOptions = useMemo(() => {
    return materials.map((material) => ({
      value: material.id,
      label: `${locale === 'he' ? material.name.he : material.name.en}${material.sku ? ` (${material.sku})` : ''}`,
      material: material,
    }))
  }, [materials, locale])

  return (
    <Controller
      name={name}
      control={control}
      render={({ field: { onChange, value, name: fieldName, ref: _ref, ...field } }) => {
        // Handle both formats: array of IDs or array of objects with materialId
        const materialIds = Array.isArray(value)
          ? value
              .map((item: any) => (typeof item === 'string' ? item : item?.materialId))
              .filter(Boolean)
          : []

        return (
          <MultiSelect
            {...field}
            name={fieldName}
            label={label}
            description={description}
            placeholder={placeholder || t('selectMaterials')}
            data={materialOptions}
            value={materialIds}
            onChange={(ids) => {
              // Keep the same format as input (if it was objects, return objects; if strings, return strings)
              if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
                // Format for materialSet.defaults: array of objects with only materialId
                const defaults = ids.map((id) => ({
                  materialId: id,
                }))
                onChange(defaults)
              } else {
                // Format for roomProfiles.materials: array of IDs
                onChange(ids)
              }
            }}
            searchable
            clearable
            maxDropdownHeight={300}
            error={error}
            renderOption={({ option }) => {
              const materialOption = option as { value: string; label: string; material?: Material }
              const material = materialOption.material
              if (!material) return <Text size="sm">{option.label}</Text>

              return (
                <Group gap="xs" wrap="nowrap">
                  <div style={{ flex: 1 }}>
                    <Text size="sm" fw={500}>
                      {locale === 'he' ? material.name.he : material.name.en}
                    </Text>
                    <Text size="xs" c="dimmed" ff="monospace">
                      {material.sku}
                    </Text>
                  </div>
                </Group>
              )
            }}
          />
        )
      }}
    />
  )
}

