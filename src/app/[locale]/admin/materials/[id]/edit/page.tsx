/**
 * Admin Material Edit Page
 * Edit existing material with comprehensive form
 *
 * Architecture:
 * - Material: Shared properties (name, category, properties, assets)
 * - MaterialSupplier: Per-supplier data (pricing, availability, colors)
 */

'use client'

// FIX: Replaced barrel import with direct imports to improve compilation speed
import { FormSection } from '@/components/ui/Form/FormSection'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { MoodBCard } from '@/components/ui/Card'
import { SupplierCard } from '@/components/features/materials/SupplierCard'
import { useColors } from '@/hooks/useColors'
import { useImageUpload } from '@/hooks/useImageUpload'
import { useMaterialCategories, useMaterialTypes } from '@/hooks/useMaterialCategories'
import { useMaterial, useUpdateMaterial } from '@/hooks/useMaterials'
import { useOrganizations } from '@/hooks/useOrganizations'
import { useTextures } from '@/hooks/useTextures'
import { updateMaterialSchema, type UpdateMaterial } from '@/lib/validations/material'
import { zodResolver } from '@hookform/resolvers/zod'
import { ActionIcon, Alert, Button, Container, Group, NumberInput, Select, SimpleGrid, Skeleton, Stack, Text, TextInput, Title } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconAlertCircle, IconArrowLeft, IconCheck, IconPlus, IconX } from '@tabler/icons-react'
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
  const { data: colorsData } = useColors({ page: 1, limit: 200 })
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

  // Debug: Log validation errors to console
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      console.log('Form validation errors:', JSON.stringify(errors, null, 2))
    }
  }, [errors])

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
      const materialData = material as any

      // Map suppliers with their full data (pricing, availability, colors)
      const suppliers = (materialData.suppliers || []).map((s: any) => ({
        organizationId: s.organizationId,
        supplierSku: s.supplierSku || '',
        colorIds: s.colorIds || [],
        pricing: s.pricing || {
          cost: 0,
          retail: 0,
          unit: 'sqm',
          currency: 'ILS',
          bulkDiscounts: [],
        },
        availability: s.availability || {
          inStock: false,
          leadTime: 0,
          minOrder: 0,
        },
        isPreferred: s.isPreferred || false,
        notes: s.notes || '',
      }))

      reset({
        sku: material.sku || undefined,
        name: material.name,
        categoryId: material.categoryId,
        textureId: materialData.textureId || null,
        properties: material.properties as any,
        assets: material.assets as any,
        suppliers,
      })
    }
  }, [material, reset])

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

  // Prepare organization options for supplier selection
  const organizationOptions = useMemo(() => {
    return organizations.map((org) => ({
      value: org.id,
      label: org.name,
    }))
  }, [organizations])

  const dimensionUnitOptions = useMemo(
    () => [
      { value: 'mm', label: 'mm' },
      { value: 'cm', label: 'cm' },
      { value: 'm', label: 'm' },
    ],
    []
  )

  // @ts-ignore - useFieldArray typing issue with nested string arrays
  const { fields: finishFields, append: appendFinish, remove: removeFinish } = useFieldArray({
    control,
    name: 'properties.finish' as any,
  })

  // Suppliers field array - each supplier has their own pricing, availability, colors
  const {
    fields: supplierFields,
    append: appendSupplier,
    remove: removeSupplier,
  } = useFieldArray({
    control,
    name: 'suppliers',
  })

  // Default values for new supplier
  const addNewSupplier = useCallback(() => {
    appendSupplier({
      organizationId: '',
      supplierSku: '',
      colorIds: [],
      pricing: {
        cost: 0,
        retail: 0,
        unit: 'sqm',
        currency: 'ILS',
        bulkDiscounts: [],
      },
      availability: {
        inStock: false,
        leadTime: 0,
        minOrder: 0,
      },
      isPreferred: false,
      notes: '',
    })
  }, [appendSupplier])

  const onSubmit = useCallback(async (data: UpdateMaterial) => {
    console.log('Form submitted with data:', data)
    try {
      // Filter out incomplete suppliers (those without a valid organizationId)
      const validSuppliers = (data.suppliers || []).filter(
        (s) => s.organizationId && /^[0-9a-fA-F]{24}$/.test(s.organizationId)
      )
      
      // Update material with filtered suppliers
      const submissionData = {
        ...data,
        suppliers: validSuppliers,
      }
      
      await updateMutation.mutateAsync({ id: materialId, data: submissionData })
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

      // Show success notification
      notifications.show({
        title: tCommon('success'),
        message: t('updateSuccess') || 'Material updated successfully',
        color: 'green',
        icon: <IconCheck size={16} />,
      })

      router.push(`/${locale}/admin/materials/${materialId}`)
    } catch (error) {
      console.error('Error updating material:', error)
      // Show error notification
      notifications.show({
        title: tCommon('error'),
        message: error instanceof Error ? error.message : t('errorMessage'),
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      })
    }
  }, [updateMutation, uploadImage, pendingImageFiles, router, locale, materialId, material, t, tCommon])

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
                {errors.categoryId && <li>{t('category')}: {errors.categoryId.message}</li>}
                {errors.name?.he && <li>{t('nameHe')}: {errors.name.he.message}</li>}
                {errors.name?.en && <li>{t('nameEn')}: {errors.name.en.message}</li>}
                {errors.properties?.typeId && <li>{t('type')}: {errors.properties.typeId.message}</li>}
                {errors.properties?.subType && <li>{t('subType')}: {errors.properties.subType.message}</li>}
                {errors.properties?.technical?.durability && <li>{t('durability')}: {errors.properties.technical.durability.message}</li>}
                {errors.properties?.technical?.maintenance && <li>{t('maintenance')}: {errors.properties.technical.maintenance.message}</li>}
                {errors.properties?.technical?.sustainability && <li>{t('sustainability')}: {errors.properties.technical.sustainability.message}</li>}
                {errors.textureId && <li>{t('texture')}: {errors.textureId.message}</li>}
                {errors.suppliers && Array.isArray(errors.suppliers) && errors.suppliers.map((supplierError: any, idx: number) => (
                  supplierError && (
                    <li key={idx}>
                      {t('supplier')} #{idx + 1}: {
                        supplierError.organizationId?.message ||
                        supplierError.pricing?.cost?.message ||
                        supplierError.pricing?.retail?.message ||
                        supplierError.availability?.leadTime?.message ||
                        supplierError.availability?.minOrder?.message ||
                        'Check supplier details'
                      }
                    </li>
                  )
                ))}
                {errors.suppliers && !Array.isArray(errors.suppliers) && (
                  <li>{t('suppliers')}: {(errors.suppliers as any).message || 'Check supplier details'}</li>
                )}
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
                        />
                  )}
                />
                <TextInput
                  label={t('nameHe')}
                  placeholder={t('nameHePlaceholder')}
                  {...register('name.he')}
                  error={errors.name?.he?.message}
                />
                <TextInput
                  label={t('nameEn')}
                  placeholder={t('nameEnPlaceholder')}
                  {...register('name.en')}
                  error={errors.name?.en?.message}
                />
              </SimpleGrid>
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
                      disabled={!categoryId}
                    />
                  )}
                />
                <TextInput
                  label={t('subType')}
                  placeholder={t('subTypePlaceholder')}
                  {...register('properties.subType')}
                  error={errors.properties?.subType?.message}
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
                      disabled={!effectiveCategoryId}
                      searchable
                      clearable
                    />
                  )}
                />
              </SimpleGrid>

              {/* Finish */}
              <div style={{ marginTop: '1rem' }}>
                <Group justify="space-between" mb="xs">
                  <Text size="sm" fw={500}>{t('finish')}</Text>
                  <Button
                    size="xs"
                    variant="light"
                    leftSection={<IconPlus size={14} />}
                    onClick={() => appendFinish('')}
                  >
                    {t('addFinish')}
                  </Button>
                </Group>
                {finishFields.map((field, index) => (
                  <Group key={field.id} mb="xs">
                    <TextInput
                      placeholder={t('finishPlaceholder')}
                      {...register(`properties.finish.${index}`)}
                      style={{ flex: 1 }}
                    />
                    <ActionIcon
                      color="red"
                      variant="subtle"
                      onClick={() => removeFinish(index)}
                    >
                      <IconX size={16} />
                    </ActionIcon>
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
                />
                <NumberInput
                  label={t('maintenance')}
                  placeholder="1-10"
                  min={1}
                  max={10}
                  {...register('properties.technical.maintenance', { valueAsNumber: true })}
                  error={errors.properties?.technical?.maintenance?.message}
                />
                <NumberInput
                  label={t('sustainability')}
                  placeholder="1-10"
                  min={1}
                  max={10}
                  {...register('properties.technical.sustainability', { valueAsNumber: true })}
                  error={errors.properties?.technical?.sustainability?.message}
                />
              </SimpleGrid>
            </FormSection>
          </MoodBCard>

          {/* Suppliers Section - Per-supplier pricing, availability, colors */}
          <MoodBCard>
            <FormSection title={t('suppliers')}>
              <Group justify="space-between" mb="md">
                <Text size="sm" c="dimmed">
                  {t('suppliersDescription')}
                </Text>
                <Button
                  size="sm"
                  variant="light"
                  leftSection={<IconPlus size={16} />}
                  onClick={addNewSupplier}
                >
                  {t('addSupplier')}
                </Button>
              </Group>

              {supplierFields.length === 0 ? (
                <Text size="sm" c="dimmed" ta="center" py="lg">
                  {t('noSuppliers')}
                </Text>
              ) : (
                <Stack gap="md">
                  {supplierFields.map((field, index) => (
                    <SupplierCard
                      key={field.id}
                      index={index}
                      control={control}
                      register={register}
                      watch={watch}
                      onRemove={() => removeSupplier(index)}
                      colorOptions={colorOptions}
                      organizationOptions={organizationOptions}
                      errors={errors}
                    />
                  ))}
                </Stack>
              )}
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
            <Button
              type="submit"
              color="brand"
              loading={updateMutation.isPending || isSubmitting}
              disabled={updateMutation.isPending || isSubmitting}
            >
              {t('submit')}
            </Button>
          </Group>
        </Stack>
      </form>
    </Container>
  )
}
