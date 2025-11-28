/**
 * Admin Material Create Page
 * Create new material with comprehensive form
 *
 * Architecture:
 * - Material: Shared properties (name, category, properties, assets)
 * - MaterialSupplier: Per-supplier data (pricing, availability, colors)
 */

'use client'

// FIX: Replaced barrel import with direct imports to improve compilation speed
// Barrel imports force compilation of ALL components (including heavy RichTextEditor, ImageUpload)
// Direct imports only compile what's needed
import { FormSection } from '@/components/ui/Form/FormSection'
import { MoodBCard } from '@/components/ui/Card'
import { SupplierCard } from '@/components/features/materials/SupplierCard'
import { useAuth } from '@/hooks/use-auth/useAuth'
import { useColors } from '@/hooks/useColors'
import { useImageUpload } from '@/hooks/useImageUpload'
import { useMaterialCategories, useMaterialTypes } from '@/hooks/useMaterialCategories'
import { useCreateMaterial, useUpdateMaterial } from '@/hooks/useMaterials'
import { useOrganizations } from '@/hooks/useOrganizations'
import { useTextures } from '@/hooks/useTextures'
import { createMaterialSchema, type CreateMaterial } from '@/lib/validations/material'
import { zodResolver } from '@hookform/resolvers/zod'
import { ActionIcon, Alert, Button, Container, Group, NumberInput, Select, SimpleGrid, Skeleton, Stack, Text, TextInput, Title } from '@mantine/core'
import { IconAlertCircle, IconArrowLeft, IconPlus, IconX } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'
import dynamic from 'next/dynamic'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useMemo, useState } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'

// Lazy load ImageUpload component
const ImageUpload = dynamic(
  () => import('@/components/ui/ImageUpload').then((mod) => ({ default: mod.ImageUpload })),
  {
    loading: () => <Skeleton height={200} />,
  }
)

export default function AdminMaterialNewPage() {
  const t = useTranslations('admin.materials.create')
  const tCommon = useTranslations('common')
  const params = useParams()
  const router = useRouter()
  const locale = params.locale as string
  const { organization } = useAuth()

  const createMutation = useCreateMaterial()
  const updateMutation = useUpdateMaterial()
  const { uploadImage } = useImageUpload()
  const [pendingImageFiles, setPendingImageFiles] = useState<File[]>([])
  
  // Fetch all global colors (not organization-specific)
  const { data: colorsData } = useColors({ page: 1, limit: 200 })
  const colors = colorsData?.data || []
  
  // Fetch material categories
  const { data: categoriesData } = useMaterialCategories()
  const categories = categoriesData?.data || []

  // Fetch organizations for assignment
  const { data: organizationsData } = useOrganizations()
  const organizations = organizationsData?.data || []

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
  } = useForm<CreateMaterial>({
    // @ts-expect-error - zodResolver type issue with nested schemas
    resolver: zodResolver(createMaterialSchema),
    defaultValues: {
      sku: '',
      name: {
        he: '',
        en: '',
      },
      categoryId: '',
      textureId: null,
      properties: {
        typeId: '',
        subType: '',
        finish: [],
        texture: '',
        dimensions: {
          unit: 'mm',
        },
        technical: {
          durability: 5,
          maintenance: 5,
          sustainability: 5,
        },
      },
      assets: {
        thumbnail: '',
        images: [],
        texture: '',
        technicalSheet: '',
      },
      // Suppliers with their per-supplier pricing, availability, colors
      suppliers: [],
    },
  })

  // Watch categoryId to filter types and textures (must be after useForm)
  // Use selective subscription to avoid unnecessary re-renders
  const categoryId = watch('categoryId')
  const { data: typesData } = useMaterialTypes('', categoryId, {
    enabled: !!categoryId,
  })

  // Fetch textures filtered by selected category
  const { data: texturesData } = useTextures({
    materialCategoryId: categoryId || undefined,
    limit: 100,
  })

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

  // Memoize Controller render functions to prevent unnecessary re-renders
  const renderCategorySelect = useCallback(
    ({ field }: { field: any }) => (
      <Select
        label={t('category')}
        placeholder={t('categoryPlaceholder')}
        data={categoryOptions}
        {...field}
        error={errors.categoryId?.message}
        required
        searchable
      />
    ),
    [t, categoryOptions, errors.categoryId?.message]
  )

  const renderTypeSelect = useCallback(
    ({ field }: { field: any }) => (
      <Select
        label={t('type')}
        placeholder={t('typePlaceholder')}
        data={typeOptions}
        {...field}
        error={errors.properties?.typeId?.message}
        required
        disabled={!categoryId}
        searchable
      />
    ),
    [t, typeOptions, errors.properties?.typeId?.message, categoryId]
  )

  const renderTextureSelect = useCallback(
    ({ field }: { field: any }) => (
      <Select
        label={t('texture')}
        placeholder={t('texturePlaceholder')}
        data={textureOptions}
        value={field.value || null}
        onChange={field.onChange}
        error={errors.textureId?.message}
        disabled={!categoryId}
        searchable
        clearable
      />
    ),
    [t, textureOptions, errors.textureId, categoryId]
  )

  const renderDimensionUnitSelect = useCallback(
    ({ field }: { field: any }) => (
      <Select
        label={t('dimensionUnit')}
        data={dimensionUnitOptions}
        {...field}
      />
    ),
    [t, dimensionUnitOptions]
  )

  const renderImageUpload = useCallback(
    ({ field }: { field: any }) => (
      <ImageUpload
        entityType="material"
        entityId=""
        value={field.value || []}
        onChange={field.onChange}
        onPendingFilesChange={setPendingImageFiles}
        label={t('uploadImages')}
        error={errors.assets?.images?.message}
        maxImages={20}
        multiple
      />
    ),
    [t, errors.assets?.images?.message]
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

  const onSubmit = useCallback(async (data: CreateMaterial) => {
    console.log('Form submitted with data:', data)
    try {
      // Create material first
      const createdMaterial = await createMutation.mutateAsync(data)
      console.log('Material created:', createdMaterial)
      
      // Upload pending image files if any
      if (pendingImageFiles.length > 0) {
        const uploadedImages: string[] = []
        for (const file of pendingImageFiles) {
          try {
            const url = await uploadImage({
              file,
              entityType: 'material',
              entityId: createdMaterial.id,
            })
            uploadedImages.push(url)
          } catch (err) {
            console.error('Failed to upload image:', err)
          }
        }
        
        // Update material with uploaded images if any
        if (uploadedImages.length > 0) {
          const existingAssets = createdMaterial.assets || {}
          await updateMutation.mutateAsync({
            id: createdMaterial.id,
            data: {
              assets: {
                ...existingAssets,
                images: [...(existingAssets.images || []), ...uploadedImages],
              },
            },
          })
        }
      }
      
      router.push(`/${locale}/admin/materials`)
    } catch (error) {
      console.error('Error creating material:', error)
      // Error is already handled by mutation state
    }
  }, [createMutation, updateMutation, uploadImage, pendingImageFiles, router, locale])

  const handleCancel = useCallback(() => {
    router.push(`/${locale}/admin/materials`)
  }, [router, locale])

  const handleFormSubmit = handleSubmit(
    (data) => {
      console.log('Form validation passed, submitting:', data)
      onSubmit(data)
    },
    (errors) => {
      console.error('Form validation failed:', errors)
    }
  )

  return (
    <Container size="xl" py="xl">
      <form onSubmit={handleFormSubmit}>
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
                {errors.categoryId && <li>Category: {errors.categoryId.message}</li>}
                {errors.name?.he && <li>Name (Hebrew): {errors.name.he.message}</li>}
                {errors.name?.en && <li>Name (English): {errors.name.en.message}</li>}
                {errors.properties?.typeId && <li>Type: {errors.properties.typeId.message}</li>}
                {errors.properties?.subType && <li>Sub-type: {errors.properties.subType.message}</li>}
                {errors.textureId && <li>Texture: {errors.textureId.message}</li>}
                {errors.suppliers && <li>Suppliers: Check supplier details</li>}
              </ul>
            </Alert>
          )}

          {/* Error Alert */}
          {createMutation.isError && (
            <Alert
              icon={<IconAlertCircle size={16} />}
              title={tCommon('error')}
              color="red"
            >
              {createMutation.error instanceof Error
                ? createMutation.error.message
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
                  required
                />
                <Controller
                  name="categoryId"
                  control={control}
                  render={renderCategorySelect}
                />
                <TextInput
                  label={t('nameHe')}
                  placeholder={t('nameHePlaceholder')}
                  {...register('name.he')}
                  error={errors.name?.he?.message}
                  required
                />
                <TextInput
                  label={t('nameEn')}
                  placeholder={t('nameEnPlaceholder')}
                  {...register('name.en')}
                  error={errors.name?.en?.message}
                  required
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
                  render={renderTypeSelect}
                />
                <TextInput
                  label={t('subType')}
                  placeholder={t('subTypePlaceholder')}
                  {...register('properties.subType')}
                  error={errors.properties?.subType?.message}
                  required
                />
                <Controller
                  name="textureId"
                  control={control}
                  render={renderTextureSelect}
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

              {/* Dimensions */}
              <SimpleGrid cols={{ base: 1, sm: 4 }} spacing="md" mt="md">
                <NumberInput
                  label={t('width')}
                  placeholder={t('widthPlaceholder')}
                  {...register('properties.dimensions.width', { valueAsNumber: true })}
                  error={errors.properties?.dimensions?.width?.message}
                />
                <NumberInput
                  label={t('height')}
                  placeholder={t('heightPlaceholder')}
                  {...register('properties.dimensions.height', { valueAsNumber: true })}
                  error={errors.properties?.dimensions?.height?.message}
                />
                <NumberInput
                  label={t('thickness')}
                  placeholder={t('thicknessPlaceholder')}
                  {...register('properties.dimensions.thickness', { valueAsNumber: true })}
                  error={errors.properties?.dimensions?.thickness?.message}
                />
                <Controller
                  name="properties.dimensions.unit"
                  control={control}
                  render={renderDimensionUnitSelect}
                />
              </SimpleGrid>

              {/* Technical Specs */}
              <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md" mt="md">
                <NumberInput
                  label={t('durability')}
                  placeholder="1-10"
                  min={1}
                  max={10}
                  {...register('properties.technical.durability', { valueAsNumber: true })}
                  error={errors.properties?.technical?.durability?.message}
                  required
                />
                <NumberInput
                  label={t('maintenance')}
                  placeholder="1-10"
                  min={1}
                  max={10}
                  {...register('properties.technical.maintenance', { valueAsNumber: true })}
                  error={errors.properties?.technical?.maintenance?.message}
                  required
                />
                <NumberInput
                  label={t('sustainability')}
                  placeholder="1-10"
                  min={1}
                  max={10}
                  {...register('properties.technical.sustainability', { valueAsNumber: true })}
                  error={errors.properties?.technical?.sustainability?.message}
                  required
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
                render={renderImageUpload}
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
              loading={createMutation.isPending || isSubmitting}
              disabled={createMutation.isPending || isSubmitting}
            >
              {t('submit')}
            </Button>
          </Group>
        </Stack>
      </form>
    </Container>
  )
}

