/**
 * Shared StyleForm Component
 * Handles both create and edit modes for style forms
 */

'use client'

// FIX: Replaced barrel import with direct imports to improve compilation speed
// Barrel imports force compilation of ALL components (including heavy RichTextEditor, ImageUpload)
// Direct imports only compile what's needed
import { FormSection } from '@/components/ui/Form/FormSection'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { MoodBCard } from '@/components/ui/Card'
import { useCategories, useSubCategories } from '@/hooks/useCategories'
import { useColors } from '@/hooks/useColors'
import { createStyleFormSchema, updateStyleSchema, type CreateStyle, type UpdateStyle } from '@/lib/validations/style'
import { zodResolver } from '@hookform/resolvers/zod'
import { ActionIcon, Alert, Button, Group, Paper, Select, SimpleGrid, Stack, Text, TextInput, Title } from '@mantine/core'
import { IconAlertCircle, IconArrowLeft } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'

interface StyleFormProps {
  mode: 'create' | 'edit'
  locale: string
  initialData?: any
  onSubmit: (data: CreateStyle | UpdateStyle) => Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
  error?: Error | null
  title?: string
}

const objectIdRegex = /^[0-9a-fA-F]{24}$/

const sanitizeImages = (images: string[] | undefined) =>
  (images || []).filter((url) => {
    if (typeof url !== 'string') return false
    if (url.startsWith('blob:')) return false
    try {
      const parsed = new URL(url)
      return parsed.protocol === 'http:' || parsed.protocol === 'https:'
    } catch {
      return false
    }
  })

const cleanMetadata = (metadata: any) =>
  metadata
    ? {
        ...metadata,
        approvalStatus: metadata.approvalStatus ?? undefined,
        approvedBy: metadata.approvedBy ?? undefined,
        approvedAt: metadata.approvedAt ? new Date(metadata.approvedAt) : undefined,
        rejectionReason: metadata.rejectionReason ?? undefined,
        rating: metadata.rating ?? undefined,
      }
    : undefined

export function StyleForm({
  mode,
  locale,
  initialData,
  onSubmit,
  onCancel,
  isSubmitting: externalIsSubmitting,
  error: externalError,
  title,
}: StyleFormProps) {
  const t = useTranslations('admin.styles.create')
  const tCommon = useTranslations('common')

  const formRef = useRef<HTMLFormElement>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  const { data: categoriesData } = useCategories()
  const categories = categoriesData?.data || []

  const { data: colorsData } = useColors({ page: 1, limit: 200 })
  const colors = colorsData?.data || []

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting: formIsSubmitting },
    watch,
    setValue,
    reset,
  } = useForm<CreateStyle | UpdateStyle>({
    // @ts-expect-error resolver types (create/update share shape)
    resolver: zodResolver(mode === 'create' ? createStyleFormSchema : updateStyleSchema),
    mode: 'onChange',
    defaultValues: {
      name: { he: '', en: '' },
      categoryId: '',
      subCategoryId: '',
      slug: '',
      colorId: '',
      images: [],
      metadata: {},
    },
  })

  const isSubmitting = externalIsSubmitting ?? formIsSubmitting

  const categoryId = watch('categoryId')

  const { data: subCategoriesData } = useSubCategories(categoryId || undefined)
  const subCategories = subCategoriesData?.data || []

  useEffect(() => {
    if (mode === 'edit' && initialData?.id) {
      reset(
        {
          name: initialData.name || { he: '', en: '' },
          categoryId: initialData.categoryId || '',
          subCategoryId: initialData.subCategoryId || '',
          slug: initialData.slug || '',
          colorId: initialData.colorId || '',
          images: sanitizeImages(initialData.images),
          metadata: cleanMetadata(initialData.metadata),
        },
        { keepDefaultValues: false }
      )
    }
  }, [initialData, mode, reset])

  useEffect(() => {
    if (categoryId && initialData?.categoryId !== categoryId) {
      setValue('subCategoryId', '')
    }
  }, [categoryId, initialData?.categoryId, setValue])

  const categoryOptions = useMemo(
    () =>
      categories.map((cat) => ({
        value: cat.id,
        label: locale === 'he' ? cat.name.he : cat.name.en,
      })),
    [categories, locale]
  )

  const subCategoryOptions = useMemo(
    () =>
      subCategories.map((subCat) => ({
        value: subCat.id,
        label: locale === 'he' ? subCat.name.he : subCat.name.en,
      })),
    [subCategories, locale]
  )

  const colorOptions = useMemo(
    () =>
      colors.map((color) => ({
        value: color.id,
        label: `${locale === 'he' ? color.name.he : color.name.en} (${color.hex})`,
        hex: color.hex,
      })),
    [colors, locale]
  )

  useEffect(() => {
    const messages: string[] = []
    if (errors.name?.he?.message) messages.push(errors.name.he.message)
    if (errors.name?.en?.message) messages.push(errors.name.en.message)
    if (errors.categoryId?.message) messages.push(errors.categoryId.message)
    if (errors.subCategoryId?.message) messages.push(errors.subCategoryId.message)
    if (errors.slug?.message) messages.push(errors.slug.message)
    if (errors.colorId?.message) messages.push(errors.colorId.message)
    if (errors.images?.message) messages.push(errors.images.message)

    setValidationErrors(messages)
  }, [errors])

  const handleFormSubmit = async (data: CreateStyle | UpdateStyle) => {
    const cleanedData: CreateStyle | UpdateStyle = {
      ...data,
      images: mode === 'edit' ? data.images : sanitizeImages(data.images),
      metadata: cleanMetadata(data.metadata),
    }

    await onSubmit(cleanedData)
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit(handleFormSubmit)}>
      <Stack gap="lg">
        <Group gap="md" align="center">
          <ActionIcon variant="subtle" onClick={onCancel}>
            <IconArrowLeft size={20} />
          </ActionIcon>
          <Title order={1} c="brand" style={{ flex: 1 }}>
            {title || (mode === 'create' ? t('title') : `${t('title')} - ${initialData?.name?.he || ''}`)}
          </Title>
          <Button type="submit" color="brand" variant="filled" loading={isSubmitting} disabled={isSubmitting}>
            {tCommon('save')}
          </Button>
        </Group>

        {validationErrors.length > 0 && (
          <Alert
            icon={<IconAlertCircle size={16} />}
            title={tCommon('error')}
            color="red"
            onClose={() => setValidationErrors([])}
            withCloseButton
          >
            <Stack gap={4}>
              {validationErrors.map((err, index) => (
                <Text size="sm" key={index}>
                  • {err}
                </Text>
              ))}
            </Stack>
          </Alert>
        )}

        {externalError && (
          <Alert icon={<IconAlertCircle size={16} />} title={tCommon('error')} color="red">
            {externalError instanceof Error
              ? externalError.message
              : locale === 'he'
                ? 'שגיאה בשמירת הסגנון'
                : 'Failed to save style'}
          </Alert>
        )}

        <MoodBCard>
          <Stack gap="md">
            <FormSection title={t('basicInfo')}>
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                <TextInput
                  label={t('nameHe')}
                  placeholder={t('nameHe')}
                  {...register('name.he')}
                  error={errors.name?.he?.message}
                  required
                />
                <TextInput
                  label={t('nameEn')}
                  placeholder={t('nameEn')}
                  {...register('name.en')}
                  error={errors.name?.en?.message}
                  required
                />
              </SimpleGrid>

              <Controller
                name="categoryId"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    label={t('category')}
                    placeholder={t('categoryPlaceholder')}
                    data={categoryOptions}
                    error={errors.categoryId?.message}
                    required
                    searchable
                  />
                )}
              />

              <Controller
                name="subCategoryId"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    label={t('subCategory')}
                    placeholder={t('subCategoryPlaceholder')}
                    data={subCategoryOptions}
                    error={errors.subCategoryId?.message}
                    required
                    disabled={!categoryId}
                    searchable
                  />
                )}
              />

              <TextInput
                label={t('slug')}
                placeholder={t('slugPlaceholder')}
                {...register('slug')}
                error={errors.slug?.message}
                description={t('slugInvalid')}
              />
            </FormSection>
          </Stack>
        </MoodBCard>

        <MoodBCard>
          <Stack gap="md">
            <FormSection title={t('selectColor')}>
              <Controller
                name="colorId"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    label={t('color')}
                    placeholder={t('colorPlaceholder')}
                    data={colorOptions.map((option) => ({
                      value: option.value,
                      label: option.label,
                    }))}
                    error={errors.colorId?.message}
                    required
                    searchable
                  />
                )}
              />
            </FormSection>
          </Stack>
        </MoodBCard>

        <MoodBCard>
          <Stack gap="md">
            <FormSection title={t('images')}>
              <Controller
                name="images"
                control={control}
                render={({ field }) => (
                  <ImageUpload
                    value={field.value || []}
                    onChange={(newImages) => field.onChange(newImages)}
                    entityType="style"
                    entityId={mode === 'edit' ? initialData?.id : ''}
                    maxImages={20}
                    multiple
                    error={errors.images?.message}
                  />
                )}
              />
            </FormSection>
          </Stack>
        </MoodBCard>
      </Stack>
    </form>
  )
}