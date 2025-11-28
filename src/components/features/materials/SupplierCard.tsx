/**
 * SupplierCard Component
 * Displays and allows editing of supplier-specific data for a material:
 * - Pricing (cost, retail, unit, currency, bulk discounts)
 * - Availability (inStock, leadTime, minOrder)
 * - Colors (from system color palette)
 * - Metadata (supplierSku, isPreferred, notes)
 */

'use client'

import { MoodBCard } from '@/components/ui/Card'
import {
  ActionIcon,
  Badge,
  Button,
  Collapse,
  Group,
  MultiSelect,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  Textarea,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import {
  IconChevronDown,
  IconChevronUp,
  IconPlus,
  IconStar,
  IconStarFilled,
  IconTrash,
  IconX,
} from '@tabler/icons-react'
import { useTranslations } from 'next-intl'
import { useMemo } from 'react'
import { Control, Controller, useFieldArray, UseFormRegister, UseFormWatch } from 'react-hook-form'

interface ColorOption {
  value: string
  label: string
  hex?: string
}

interface OrganizationOption {
  value: string
  label: string
}

interface SupplierCardProps {
  index: number
  control: Control<any>
  register: UseFormRegister<any>
  watch: UseFormWatch<any>
  onRemove: () => void
  colorOptions: ColorOption[]
  organizationOptions: OrganizationOption[]
  errors?: any
}

export function SupplierCard({
  index,
  control,
  register,
  watch,
  onRemove,
  colorOptions,
  organizationOptions,
  errors,
}: SupplierCardProps) {
  const t = useTranslations('admin.materials.edit')
  const tCommon = useTranslations('common')
  const [opened, { toggle }] = useDisclosure(true)

  // Watch supplier data for display
  const supplierData = watch(`suppliers.${index}`)
  const organizationId = supplierData?.organizationId
  const isPreferred = supplierData?.isPreferred

  // Find organization name for header
  const organizationName = useMemo(() => {
    const org = organizationOptions.find((o) => o.value === organizationId)
    return org?.label || t('newSupplier')
  }, [organizationId, organizationOptions, t])

  // Bulk discounts field array
  const {
    fields: discountFields,
    append: appendDiscount,
    remove: removeDiscount,
  } = useFieldArray({
    control,
    name: `suppliers.${index}.pricing.bulkDiscounts`,
  })

  const unitOptions = useMemo(
    () => [
      { value: 'sqm', label: t('pricingUnits.sqm') },
      { value: 'unit', label: t('pricingUnits.unit') },
      { value: 'linear_m', label: t('pricingUnits.linearM') },
    ],
    [t]
  )

  const currencyOptions = useMemo(
    () => [
      { value: 'ILS', label: 'ILS' },
      { value: 'USD', label: 'USD' },
      { value: 'EUR', label: 'EUR' },
    ],
    []
  )

  const supplierErrors = errors?.suppliers?.[index]

  return (
    <MoodBCard
      withBorder
      style={{
        borderColor: isPreferred ? 'var(--mantine-color-brand-5)' : undefined,
        borderWidth: isPreferred ? 2 : 1,
      }}
    >
      {/* Header - Always visible */}
      <Group justify="space-between" mb={opened ? 'md' : 0}>
        <Group gap="sm" style={{ cursor: 'pointer' }} onClick={toggle}>
          {opened ? <IconChevronUp size={18} /> : <IconChevronDown size={18} />}
          <Text fw={600}>{organizationName}</Text>
          {isPreferred && (
            <Badge color="brand" size="sm" leftSection={<IconStarFilled size={12} />}>
              {t('preferredSupplier')}
            </Badge>
          )}
        </Group>
        <Group gap="xs">
          <Controller
            name={`suppliers.${index}.isPreferred`}
            control={control}
            render={({ field }) => (
              <ActionIcon
                variant={field.value ? 'filled' : 'subtle'}
                color={field.value ? 'brand' : 'gray'}
                onClick={() => field.onChange(!field.value)}
                title={t('markAsPreferred')}
              >
                {field.value ? <IconStarFilled size={18} /> : <IconStar size={18} />}
              </ActionIcon>
            )}
          />
          <ActionIcon color="red" variant="subtle" onClick={onRemove} title={tCommon('remove')}>
            <IconTrash size={18} />
          </ActionIcon>
        </Group>
      </Group>

      <Collapse in={opened}>
        <Stack gap="md">
          {/* Supplier Selection & SKU */}
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <Controller
              name={`suppliers.${index}.organizationId`}
              control={control}
              render={({ field }) => (
                <Select
                  label={t('supplier')}
                  placeholder={t('selectSupplier')}
                  data={organizationOptions}
                  {...field}
                  error={supplierErrors?.organizationId?.message}
                  searchable
                  required
                />
              )}
            />
            <TextInput
              label={t('supplierSku')}
              placeholder={t('supplierSkuPlaceholder')}
              {...register(`suppliers.${index}.supplierSku`)}
              error={supplierErrors?.supplierSku?.message}
            />
          </SimpleGrid>

          {/* Colors - Per Supplier */}
          <Controller
            name={`suppliers.${index}.colorIds`}
            control={control}
            render={({ field }) => (
              <MultiSelect
                label={t('colors')}
                placeholder={t('selectColors')}
                data={colorOptions}
                value={field.value || []}
                onChange={field.onChange}
                error={supplierErrors?.colorIds?.message}
                searchable
                clearable
                renderOption={({ option }) => (
                  <Group gap="xs">
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        backgroundColor: (option as any).hex || '#ccc',
                        border: '1px solid #ddd',
                        borderRadius: 2,
                      }}
                    />
                    <span>{option.label}</span>
                  </Group>
                )}
              />
            )}
          />

          {/* Pricing Section */}
          <div>
            <Text size="sm" fw={500} mb="xs">
              {t('pricing')}
            </Text>
            <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
              <Controller
                name={`suppliers.${index}.pricing.cost`}
                control={control}
                render={({ field }) => (
                  <NumberInput
                    label={t('cost')}
                    placeholder="0"
                    min={0}
                    value={field.value}
                    onChange={field.onChange}
                    error={supplierErrors?.pricing?.cost?.message}
                  />
                )}
              />
              <Controller
                name={`suppliers.${index}.pricing.retail`}
                control={control}
                render={({ field }) => (
                  <NumberInput
                    label={t('retail')}
                    placeholder="0"
                    min={0}
                    value={field.value}
                    onChange={field.onChange}
                    error={supplierErrors?.pricing?.retail?.message}
                  />
                )}
              />
              <Controller
                name={`suppliers.${index}.pricing.unit`}
                control={control}
                render={({ field }) => (
                  <Select
                    label={t('pricingUnit')}
                    data={unitOptions}
                    {...field}
                    error={supplierErrors?.pricing?.unit?.message}
                  />
                )}
              />
              <Controller
                name={`suppliers.${index}.pricing.currency`}
                control={control}
                render={({ field }) => (
                  <Select
                    label={t('currency')}
                    data={currencyOptions}
                    {...field}
                    error={supplierErrors?.pricing?.currency?.message}
                  />
                )}
              />
            </SimpleGrid>

            {/* Bulk Discounts */}
            <div style={{ marginTop: '0.75rem' }}>
              <Group justify="space-between" mb="xs">
                <Text size="xs" c="dimmed">
                  {t('bulkDiscounts')}
                </Text>
                <Button
                  size="xs"
                  variant="subtle"
                  leftSection={<IconPlus size={12} />}
                  onClick={() => appendDiscount({ minQuantity: 1, discount: 0 })}
                >
                  {t('addDiscount')}
                </Button>
              </Group>
              {discountFields.map((field, discountIndex) => (
                <Group key={field.id} mb="xs" gap="xs">
                  <Controller
                    name={`suppliers.${index}.pricing.bulkDiscounts.${discountIndex}.minQuantity`}
                    control={control}
                    render={({ field }) => (
                      <NumberInput
                        placeholder={t('minQuantity')}
                        min={1}
                        value={field.value}
                        onChange={field.onChange}
                        style={{ flex: 1 }}
                        size="xs"
                      />
                    )}
                  />
                  <Controller
                    name={`suppliers.${index}.pricing.bulkDiscounts.${discountIndex}.discount`}
                    control={control}
                    render={({ field }) => (
                      <NumberInput
                        placeholder="%"
                        min={0}
                        max={100}
                        value={field.value}
                        onChange={field.onChange}
                        style={{ flex: 1 }}
                        size="xs"
                        suffix="%"
                      />
                    )}
                  />
                  <ActionIcon
                    color="red"
                    variant="subtle"
                    size="sm"
                    onClick={() => removeDiscount(discountIndex)}
                  >
                    <IconX size={14} />
                  </ActionIcon>
                </Group>
              ))}
            </div>
          </div>

          {/* Availability Section */}
          <div>
            <Text size="sm" fw={500} mb="xs">
              {t('availability')}
            </Text>
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
              <Controller
                name={`suppliers.${index}.availability.inStock`}
                control={control}
                render={({ field }) => (
                  <Switch
                    label={t('inStock')}
                    checked={field.value}
                    onChange={(e) => field.onChange(e.currentTarget.checked)}
                  />
                )}
              />
              <Controller
                name={`suppliers.${index}.availability.leadTime`}
                control={control}
                render={({ field }) => (
                  <NumberInput
                    label={t('leadTime')}
                    placeholder={t('leadTimePlaceholder')}
                    min={0}
                    value={field.value}
                    onChange={field.onChange}
                    error={supplierErrors?.availability?.leadTime?.message}
                  />
                )}
              />
              <Controller
                name={`suppliers.${index}.availability.minOrder`}
                control={control}
                render={({ field }) => (
                  <NumberInput
                    label={t('minOrder')}
                    placeholder={t('minOrderPlaceholder')}
                    min={0}
                    value={field.value}
                    onChange={field.onChange}
                    error={supplierErrors?.availability?.minOrder?.message}
                  />
                )}
              />
            </SimpleGrid>
          </div>

          {/* Notes */}
          <Textarea
            label={t('supplierNotes')}
            placeholder={t('supplierNotesPlaceholder')}
            {...register(`suppliers.${index}.notes`)}
            rows={2}
          />
        </Stack>
      </Collapse>
    </MoodBCard>
  )
}
