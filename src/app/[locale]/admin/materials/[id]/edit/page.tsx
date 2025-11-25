/**
 * Admin Material Edit Page
 * Edit existing material with comprehensive form
 */

'use client'

// FIX: Replaced barrel import with direct imports to improve compilation speed
import { FormSection } from '@/components/ui/Form/FormSection'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { MoodBCard } from '@/components/ui/Card'
import { useColors } from '@/hooks/useColors'
import { useImageUpload } from '@/hooks/useImageUpload'
import { useMaterialCategories, useMaterialTypes } from '@/hooks/useMaterialCategories'
import { useMaterial, useUpdateMaterial } from '@/hooks/useMaterials'
import { useOrganizations } from '@/hooks/useOrganizations'
import { useTextures } from '@/hooks/useTextures'
import { updateMaterialSchema, type UpdateMaterial } from '@/lib/validations/material'
import { zodResolver } from '@hookform/resolvers/zod'
import { ActionIcon, Alert, Button, Container, Group, MultiSelect, NumberInput, Select, SimpleGrid, Skeleton, Stack, Switch, Text, TextInput, Title } from '@mantine/core'
import { IconAlertCircle, IconArrowLeft, IconPlus, IconX } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'
import dynamic from 'next/dynamic'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'

// Lazy load ImageUpload component
const ImageUpload = dynamic(
  () => import('@/components/ui/ImageUpload').then((mod) => ({ default: mod.ImageUpload })),
  {
    loading: () => <Skeleton height={200} />,
  }
)

/**
 * Helper function to validate ObjectID format
 */
function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id)
}

export default function AdminMaterialEditPage() {
  const t = useTranslations('admin.materials.edit')
  const tCommon = useTranslations('common')
  const params = useParams()
  const router = useRouter()
  const locale = params.locale as string
  const materialId = params.id as string

  // Redirect for invalid IDs
  if (materialId === 'new' || !isValidObjectId(materialId)) {
    return (
      <Container size="xl" py="xl">
        <ErrorState message={tCommon('error')} />
      </Container>
    )
  }

  const { data: material, isLoading: isLoadingMaterial, error: materialError } = useMaterial(materialId)
  const updateMutation = useUpdateMaterial()
  const { uploadImage } = useImageUpload()
  const [pendingImageFiles, setPendingImageFiles] = useState<File[]>([])

  // Fetch all global colors
  const { data: colorsData } = useColors({})
  const colors = colorsData?.data || []

  // Fetch material categories
  const { data: categoriesData } = useMaterialCategories()
  const categories = categoriesData?.data || []

  // Fetch organizations for suppliers
  const { data: organizationsData } = useOrganizations()
  const organizations = organizationsData?.data || []

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
    reset,
  } = useForm<UpdateMaterial>({
    // @ts-expect-error - zodResolver type issue with nested schemas
    resolver: zodResolver(updateMaterialSchema),
  })

  // Watch categoryId to filter types and textures
  const categoryId = watch('categoryId')
  const effectiveCategoryId = categoryId || material?.categoryId
  const { data: typesData } = useMaterialTypes('', effectiveCategoryId, {
    enabled: !!effectiveCategoryId,
  })

  // Fetch textures filtered by selected category
  const { data: texturesData } = useTextures({
    materialCategoryId: effectiveCategoryId || undefined,
    limit: 100,
  })

  // Initialize form with material data
  useEffect(() => {
    if (material) {
      // Extract supplier IDs from the suppliers array
      const supplierIds = material.suppliers?.map((s: any) => s.organizationId) || []

      reset({
        sku: material.sku,
        name: material.name,
        categoryId: material.categoryId,
        supplierIds,
        textureId: material.textureId || null,
        properties: material.properties,
        pricing: material.pricing,
        availability: material.availability,
        assets: material.assets,
      })
    }
  }, [material, reset])

  // Check if material has no suppliers (global material)
  const isGlobalMaterial = !material?.suppliers || material.suppliers.length === 0

  // Prepare color options for MultiSelect
  const colorOptions = useMemo(() => {
    return colors.map((color) => ({
      value: color.id,
      label: `${color.name.he} (${color.name.en})`,
      hex: color.hex,
    }))
  }, [colors])

  // Prepare category options
  const categoryOptions = useMemo(() => {
    return categories.map((cat) => ({
      value: cat.id,
      label: `${cat.name.he} (${cat.name.en})`,
    }))
  }, [categories])

  // Prepare type options filtered by category
  const typeOptions = useMemo(() => {
    const types = typesData?.data || []
    return types.map((type) => ({
      value: type.id,
      label: `${type.name.he} (${type.name.en})`,
    }))
  }, [typesData])

  // Prepare texture options filtered by category
  const textureOptions = useMemo(() => {
    const textures = texturesData?.data || []
    return textures.map((texture) => ({
      value: texture.id,
      label: `${texture.name.he} (${texture.name.en})`,
    }))
  }, [texturesData])

  // Prepare supplier (organization) options
  const supplierOptions = useMemo(() => {
    return organizations.map((org) => ({
      value: org.id,
      label: org.name,
    }))
  }, [organizations])

  const unitOptions = useMemo(
    () => [
      { value: 'sqm', label: t('pricingUnits.sqm') },
      { value: 'unit', label: t('pricingUnits.unit') },
      { value: 'linear_m', label: t('pricingUnits.linearM') },
    ],
    [t]
  )

  const dimensionUnitOptions = useMemo(
    () => [
      { value: 'mm', label: 'mm' },
      { value: 'cm', label: 'cm' },
      { value: 'm', label: 'm' },
    ],
    []
  )

  const currencyOptions = useMemo(
    () => [
      { value: 'ILS', label: 'ILS (₪)' },
      { value: 'USD', label: 'USD ($)' },
      { value: 'EUR', label: 'EUR (€)' },
    ],
    []
  )

  const { fields: finishFields, append: appendFinish, remove: removeFinish } = useFieldArray({
    control,
    name: 'properties.finish',
  })

  const { fields: discountFields, append: appendDiscount, remove: removeDiscount } = useFieldArray({
    control,
    name: 'pricing.bulkDiscounts',
  })

  const onSubmit = useCallback(async (data: UpdateMaterial) => {
    console.log('Form submitted with data:', data)
    try {
      // Update material
      await updateMutation.mutateAsync({ id: materialId, data })
      console.log('Material updated')

      // Upload pending image files if any
      if (pendingImageFiles.length > 0) {
        const uploadedImages: string[] = []
        for (const file of pendingImageFiles) {
          try {
            const url = await uploadImage({
              file,
              entityType: 'material',
              entityId: materialId,
            })
            uploadedImages.push(url)
          } catch (err) {
            console.error('Failed to upload image:', err)
          }
        }

        // Update material with uploaded images if any
        if (uploadedImages.length > 0) {
          const existingAssets = data.assets || material?.assets || {}
          await updateMutation.mutateAsync({
            id: materialId,
            data: {
              assets: {
                ...existingAssets,
                images: [...(existingAssets.images || []), ...uploadedImages],
              },
            },
          })
        }
      }

      router.push(`/${locale}/admin/materials/${materialId}`)
    } catch (error) {
      console.error('Error updating material:', error)
      // Error is already handled by mutation state
    }
  }, [updateMutation, uploadImage, pendingImageFiles, router, locale, materialId, material])

  const handleCancel = useCallback(() => {
    router.push(`/${locale}/admin/materials/${materialId}`)
  }, [router, locale, materialId])

  if (isLoadingMaterial) {
    return <LoadingState />
  }

  if (materialError || !material) {
    return (
      <Container size="xl" py="xl">
        <ErrorState message={tCommon('error')} />
      </Container>
    )
  }

  return (
    <Container size="xl" py="xl">
      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack gap="lg">
          {/* Header */}
          <Group>
            <ActionIcon variant="subtle" onClick={handleCancel}>
              <IconArrowLeft size={20} />
            </ActionIcon>
            <Title order={1} c="brand">
              {t('title')}
            </Title>
          </Group>

          {/* Read-only Alert */}
          {isGlobalMaterial && (
            <Alert
              icon={<IconAlertCircle size={16} />}
              title={t('readOnlyMaterial') || 'Read-Only Material'}
              color="blue"
            >
              {t('readOnlyMessage') || 'This is a global material and cannot be edited. You can view its details but not make changes.'}
            </Alert>
          )}

          {/* Validation Errors Alert */}
          {Object.keys(errors).length > 0 && (
            <Alert
              icon={<IconAlertCircle size={16} />}
              title={t('validationErrors') || 'Validation Errors'}
              color="red"
            >
              <Text size="sm" mb="xs">
                {t('pleaseFixErrors') || 'Please fix the following errors:'}
              </Text>
              <ul style={{ margin: 0, paddingInlineStart: '1.5rem' }}>
                {errors.sku && <li>SKU: {errors.sku.message}</li>}
                {errors.categoryId && <li>Category: {errors.categoryId.message}</li>}
                {errors.name?.he && <li>Name (Hebrew): {errors.name.he.message}</li>}
                {errors.name?.en && <li>Name (English): {errors.name.en.message}</li>}
                {errors.properties?.typeId && <li>Type: {errors.properties.typeId.message}</li>}
                {errors.properties?.subType && <li>Sub-type: {errors.properties.subType.message}</li>}
                {errors.textureId && <li>Texture: {errors.textureId.message}</li>}
                {errors.properties?.colorIds && <li>Colors: {errors.properties.colorIds.message}</li>}
                {errors.pricing?.cost && <li>Cost: {errors.pricing.cost.message}</li>}
                {errors.pricing?.retail && <li>Retail: {errors.pricing.retail.message}</li>}
              </ul>
            </Alert>
          )}

          {/* Error Alert */}
          {updateMutation.isError && (
            <Alert
              icon={<IconAlertCircle size={16} />}
              title={tCommon('error')}
              color="red"
            >
              {updateMutation.error instanceof Error
                ? updateMutation.error.message
                : t('errorMessage')}
            </Alert>
          )}

          {/* Basic Information */}
          <MoodBCard>
            <FormSection title={t('basicInfo')}>
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                <TextInput
                  label={t('sku')}
                  placeholder={t('skuPlaceholder')}
                  {...register('sku')}
                  error={errors.sku?.message}
                  disabled={isGlobalMaterial}
                />
                <Controller
                  name="categoryId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      label={t('category')}
                      placeholder={t('categoryPlaceholder')}
                      data={categoryOptions}
                      {...field}
                      error={errors.categoryId?.message}
                      searchable
                      disabled={isGlobalMaterial}
                    />
                  )}
                />
                <TextInput
                  label={t('nameHe')}
                  placeholder={t('nameHePlaceholder')}
                  {...register('name.he')}
                  error={errors.name?.he?.message}
                  disabled={isGlobalMaterial}
                />
                <TextInput
                  label={t('nameEn')}
                  placeholder={t('nameEnPlaceholder')}
                  {...register('name.en')}
                  error={errors.name?.en?.message}
                  disabled={isGlobalMaterial}
                />
              </SimpleGrid>

              {/* Suppliers - Optional MultiSelect */}
              <div style={{ marginTop: '1rem' }}>
                <Controller
                  name="supplierIds"
                  control={control}
                  render={({ field }) => (
                    <MultiSelect
                      label={t('suppliers')}
                      placeholder={t('suppliersPlaceholder')}
                      data={supplierOptions}
                      value={field.value || []}
                      onChange={field.onChange}
                      error={errors.supplierIds?.message}
                      searchable
                      clearable
                      disabled={isGlobalMaterial}
                    />
                  )}
                />
              </div>
            </FormSection>
          </MoodBCard>

          {/* Properties */}
          <MoodBCard>
            <FormSection title={t('properties')}>
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                <Controller
                  name="properties.typeId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      label={t('type')}
                      placeholder={t('typePlaceholder')}
                      data={typeOptions}
                      {...field}
                      error={errors.properties?.typeId?.message}
                      searchable
                      disabled={isGlobalMaterial || !categoryId}
                    />
                  )}
                />
                <TextInput
                  label={t('subType')}
                  placeholder={t('subTypePlaceholder')}
                  {...register('properties.subType')}
                  error={errors.properties?.subType?.message}
                  disabled={isGlobalMaterial}
                />
                <Controller
                  name="textureId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      label={t('texture')}
                      placeholder={t('texturePlaceholder')}
                      data={textureOptions}
                      value={field.value || null}
                      onChange={field.onChange}
                      error={errors.textureId?.message}
                      disabled={isGlobalMaterial || !effectiveCategoryId}
                      searchable
                      clearable
                    />
                  )}
                />
              </SimpleGrid>

              {/* Colors - MultiSelect */}
              <div style={{ marginTop: '1rem' }}>
                <Controller
                  name="properties.colorIds"
                  control={control}
                  render={({ field }) => (
                    <MultiSelect
                      label={t('colors')}
                      placeholder={t('selectColors')}
                      data={colorOptions}
                      value={field.value}
                      onChange={field.onChange}
                      error={errors.properties?.colorIds?.message}
                      searchable
                      disabled={isGlobalMaterial}
                      renderOption={({ option }) => (
                        <Group gap="xs">
                          <div
                            style={{
                              width: 16,
                              height: 16,
                              backgroundColor: option.hex,
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
              </div>

              {/* Finish */}
              <div style={{ marginTop: '1rem' }}>
                <Group justify="space-between" mb="xs">
                  <Text size="sm" fw={500}>{t('finish')}</Text>
                  {!isGlobalMaterial && (
                    <Button
                      size="xs"
                      variant="light"
                      leftSection={<IconPlus size={14} />}
                      onClick={() => appendFinish('')}
                    >
                      {t('addFinish')}
                    </Button>
                  )}
                </Group>
                {finishFields.map((field, index) => (
                  <Group key={field.id} mb="xs">
                    <TextInput
                      placeholder={t('finishPlaceholder')}
                      {...register(`properties.finish.${index}`)}
                      style={{ flex: 1 }}
                      disabled={isGlobalMaterial}
                    />
                    {!isGlobalMaterial && (
                      <ActionIcon
                        color="red"
                        variant="subtle"
                        onClick={() => removeFinish(index)}
                      >
                        <IconX size={16} />
                      </ActionIcon>
                    )}
                  </Group>
                ))}
              </div>

              {/* Technical Specs */}
              <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md" mt="md">
                <NumberInput
                  label={t('durability')}
                  placeholder="1-10"
                  min={1}
                  max={10}
                  {...register('properties.technical.durability', { valueAsNumber: true })}
                  error={errors.properties?.technical?.durability?.message}
                  disabled={isGlobalMaterial}
                />
                <NumberInput
                  label={t('maintenance')}
                  placeholder="1-10"
                  min={1}
                  max={10}
                  {...register('properties.technical.maintenance', { valueAsNumber: true })}
                  error={errors.properties?.technical?.maintenance?.message}
                  disabled={isGlobalMaterial}
                />
                <NumberInput
                  label={t('sustainability')}
                  placeholder="1-10"
                  min={1}
                  max={10}
                  {...register('properties.technical.sustainability', { valueAsNumber: true })}
                  error={errors.properties?.technical?.sustainability?.message}
                  disabled={isGlobalMaterial}
                />
              </SimpleGrid>
            </FormSection>
          </MoodBCard>

          {/* Pricing */}
          <MoodBCard>
            <FormSection title={t('pricing')}>
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                <NumberInput
                  label={t('cost')}
                  placeholder={t('costPlaceholder')}
                  min={0}
                  {...register('pricing.cost', { valueAsNumber: true })}
                  error={errors.pricing?.cost?.message}
                  disabled={isGlobalMaterial}
                />
                <NumberInput
                  label={t('retail')}
                  placeholder={t('retailPlaceholder')}
                  min={0}
                  {...register('pricing.retail', { valueAsNumber: true })}
                  error={errors.pricing?.retail?.message}
                  disabled={isGlobalMaterial}
                />
                <Controller
                  name="pricing.unit"
                  control={control}
                  render={({ field }) => (
                    <Select
                      label={t('pricingUnit')}
                      data={unitOptions}
                      {...field}
                      error={errors.pricing?.unit?.message}
                      disabled={isGlobalMaterial}
                    />
                  )}
                />
                <Controller
                  name="pricing.currency"
                  control={control}
                  render={({ field }) => (
                    <Select
                      label={t('currency')}
                      data={currencyOptions}
                      {...field}
                      error={errors.pricing?.currency?.message}
                      disabled={isGlobalMaterial}
                    />
                  )}
                />
              </SimpleGrid>

              {/* Bulk Discounts */}
              <div style={{ marginTop: '1rem' }}>
                <Group justify="space-between" mb="xs">
                  <Text size="sm" fw={500}>{t('bulkDiscounts')}</Text>
                  {!isGlobalMaterial && (
                    <Button
                      size="xs"
                      variant="light"
                      leftSection={<IconPlus size={14} />}
                      onClick={() => appendDiscount({ minQuantity: 1, discount: 0 })}
                    >
                      {t('addDiscount')}
                    </Button>
                  )}
                </Group>
                {discountFields.map((field, index) => (
                  <Group key={field.id} mb="xs">
                    <NumberInput
                      label={t('minQuantity')}
                      placeholder={t('minQuantityPlaceholder')}
                      min={1}
                      {...register(`pricing.bulkDiscounts.${index}.minQuantity`, { valueAsNumber: true })}
                      style={{ flex: 1 }}
                      disabled={isGlobalMaterial}
                    />
                    <NumberInput
                      label={t('discount')}
                      placeholder="%"
                      min={0}
                      max={100}
                      {...register(`pricing.bulkDiscounts.${index}.discount`, { valueAsNumber: true })}
                      style={{ flex: 1 }}
                      disabled={isGlobalMaterial}
                    />
                    {!isGlobalMaterial && (
                      <ActionIcon
                        color="red"
                        variant="subtle"
                        onClick={() => removeDiscount(index)}
                        style={{ marginTop: '1.5rem' }}
                      >
                        <IconX size={16} />
                      </ActionIcon>
                    )}
                  </Group>
                ))}
              </div>
            </FormSection>
          </MoodBCard>

          {/* Availability */}
          <MoodBCard>
            <FormSection title={t('availability')}>
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                <Controller
                  name="availability.inStock"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      label={t('inStock')}
                      checked={field.value}
                      onChange={(e) => field.onChange(e.currentTarget.checked)}
                      disabled={isGlobalMaterial}
                    />
                  )}
                />
                <NumberInput
                  label={t('leadTime')}
                  placeholder={t('leadTimePlaceholder')}
                  min={0}
                  {...register('availability.leadTime', { valueAsNumber: true })}
                  error={errors.availability?.leadTime?.message}
                  disabled={isGlobalMaterial}
                />
                <NumberInput
                  label={t('minOrder')}
                  placeholder={t('minOrderPlaceholder')}
                  min={0}
                  {...register('availability.minOrder', { valueAsNumber: true })}
                  error={errors.availability?.minOrder?.message}
                  disabled={isGlobalMaterial}
                />
              </SimpleGrid>
            </FormSection>
          </MoodBCard>

          {/* Image Gallery */}
          <MoodBCard>
            <FormSection title={t('imageGallery')}>
              <Controller
                name="assets.images"
                control={control}
                render={({ field }) => (
                  <ImageUpload
                    entityType="material"
                    entityId={materialId}
                    value={field.value || []}
                    onChange={field.onChange}
                    onPendingFilesChange={setPendingImageFiles}
                    maxImages={20}
                    multiple
                    disabled={isGlobalMaterial}
                  />
                )}
              />
            </FormSection>
          </MoodBCard>

          {/* Submit */}
          <Group justify="flex-end">
            <Button variant="subtle" onClick={handleCancel}>
              {tCommon('cancel')}
            </Button>
            {!isGlobalMaterial && (
              <Button
                type="submit"
                color="brand"
                loading={updateMutation.isPending || isSubmitting}
                disabled={updateMutation.isPending || isSubmitting}
              >
                {t('submit')}
              </Button>
            )}
          </Group>
        </Stack>
      </form>
    </Container>
  )
}
