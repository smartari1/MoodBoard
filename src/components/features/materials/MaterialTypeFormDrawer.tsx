'use client'

// FIX: Replaced barrel import with direct imports to improve compilation speed
// Barrel imports force compilation of ALL components (including heavy RichTextEditor, ImageUpload)
// Direct imports only compile what's needed
import { FormSection } from '@/components/ui/Form/FormSection'
import { IconSelector } from '@/components/ui/IconSelector'
import {
  useCreateMaterialType,
  useMaterialCategories,
  useMaterialType,
  useUpdateMaterialType,
  type MaterialType,
} from '@/hooks/useMaterialCategories'
import { translateZodError } from '@/lib/validations/error-translator'
import {
  createMaterialTypeSchema,
  updateMaterialTypeSchema,
  type CreateMaterialType,
  type UpdateMaterialType,
} from '@/lib/validations/material-category'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Button,
  Divider,
  Drawer,
  Group,
  NumberInput,
  Select,
  Stack,
  TextInput,
  Textarea,
} from '@mantine/core'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'

interface MaterialTypeFormDrawerProps {
  opened: boolean
  onClose: () => void
  onSuccess: () => void
  editData?: MaterialType | null
}

export function MaterialTypeFormDrawer({
  opened,
  onClose,
  onSuccess,
  editData,
}: MaterialTypeFormDrawerProps) {
  const t = useTranslations('admin.materials.settings.types')
  const tCommon = useTranslations('common')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const createMutation = useCreateMaterialType()
  const updateMutation = useUpdateMaterialType()

  // Fetch categories for dropdown
  const { data: categoriesData } = useMaterialCategories()
  const categoryOptions =
    categoriesData?.data.map((cat) => ({
      value: cat.id,
      label: `${cat.name.he} (${cat.name.en})`,
    })) || []

  // Fetch type data if editing
  const { data: typeData } = useMaterialType(editData?.id || '', {
    enabled: !!editData?.id && opened,
  })

  // React Hook Form with Zod validation
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<CreateMaterialType | UpdateMaterialType>({
    resolver: zodResolver(
      editData ? updateMaterialTypeSchema : createMaterialTypeSchema
    ),
    defaultValues: {
      categoryId: '',
      name: {
        he: '',
        en: '',
      },
      description: {
        he: '',
        en: '',
      },
      slug: '',
      order: 0,
      icon: '',
    },
  })

  const nameHe = watch('name.he')
  const nameEn = watch('name.en')

  // Generate slug from text (prefer English, fallback to Hebrew transliteration)
  const generateSlug = (text: string): string => {
    if (!text) return ''

    return text
      .toLowerCase()
      .trim()
      .replace(/[\u0590-\u05FF]/g, '') // Remove Hebrew characters
      .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphen
      .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
      .substring(0, 50) // Limit length
  }

  // Auto-generate slug from names
  useEffect(() => {
    if (!editData && opened) {
      const slugText = nameEn || nameHe
      if (slugText) {
        const generatedSlug = generateSlug(slugText)
        setValue('slug', generatedSlug)
      }
    }
  }, [nameHe, nameEn, editData, opened, setValue])

  // Reset form when editData changes
  useEffect(() => {
    if (typeData && opened) {
      // Use fetched data if available, otherwise use editData
      const data = typeData || editData
      // When editing, don't include categoryId (it's omitted from update schema)
      reset({
        name: data.name,
        description: data.description || { he: '', en: '' },
        slug: data.slug,
        order: data.order,
        icon: data.icon || '',
      } as UpdateMaterialType)
    } else if (!editData && opened) {
      // Reset to empty form for create
      reset({
        categoryId: '',
        name: {
          he: '',
          en: '',
        },
        description: {
          he: '',
          en: '',
        },
        slug: '',
        order: 0,
        icon: '',
      } as CreateMaterialType)
    }
  }, [typeData, editData, opened, reset])

  const onSubmit = async (data: CreateMaterialType | UpdateMaterialType) => {
    setIsSubmitting(true)
    try {
      if (editData) {
        await updateMutation.mutateAsync({
          id: editData.id,
          data: data as UpdateMaterialType,
        })
      } else {
        await createMutation.mutateAsync(data as CreateMaterialType)
      }

      // Success
      onSuccess()
      reset()
      onClose()
    } catch (error) {
      console.error('Submit error:', error)
      // TODO: Show error notification
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    // Reset to empty form when closing
    reset({
      categoryId: '',
      name: {
        he: '',
        en: '',
      },
      description: {
        he: '',
        en: '',
      },
      slug: '',
      order: 0,
      icon: '',
    })
    onClose()
  }

  return (
    <Drawer
      opened={opened}
      onClose={handleClose}
      title={editData ? t('editType') : t('createType')}
      position="right"
      size="lg"
      padding="md"
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack gap="lg">
          {/* Basic Info */}
          <FormSection>
            {!editData && (
              <Controller
                name="categoryId"
                control={control}
                render={({ field }) => (
                  <Select
                    label={t('form.category')}
                    placeholder={t('form.categoryPlaceholder')}
                    required
                    data={categoryOptions}
                    value={field.value}
                    onChange={field.onChange}
                    error={
                      errors.categoryId?.message
                        ? translateZodError(errors.categoryId.message, (key) => t(key as any))
                        : undefined
                    }
                    searchable
                  />
                )}
              />
            )}

            <TextInput
              label={t('form.nameHe')}
              placeholder={t('form.nameHePlaceholder')}
              required
              error={
                errors.name?.he?.message
                  ? translateZodError(errors.name.he.message, (key) => t(key as any))
                  : undefined
              }
              {...register('name.he')}
            />

            <TextInput
              label={t('form.nameEn')}
              placeholder={t('form.nameEnPlaceholder')}
              required
              error={
                errors.name?.en?.message
                  ? translateZodError(errors.name.en.message, (key) => t(key as any))
                  : undefined
              }
              {...register('name.en')}
            />

            <TextInput
              label={t('form.slug')}
              placeholder={t('form.slugPlaceholder')}
              required
              error={
                errors.slug?.message
                  ? translateZodError(errors.slug.message, (key) => t(key as any))
                  : undefined
              }
              {...register('slug')}
              description={t('form.slugDescription')}
            />
          </FormSection>

          <Divider />

          {/* Description */}
          <FormSection>
            <Textarea
              label={t('form.descriptionHe')}
              placeholder={t('form.descriptionHePlaceholder')}
              minRows={3}
              error={
                errors.description?.he?.message
                  ? translateZodError(errors.description.he.message, (key) => t(key as any))
                  : undefined
              }
              {...register('description.he')}
            />

            <Textarea
              label={t('form.descriptionEn')}
              placeholder={t('form.descriptionEnPlaceholder')}
              minRows={3}
              error={
                errors.description?.en?.message
                  ? translateZodError(errors.description.en.message, (key) => t(key as any))
                  : undefined
              }
              {...register('description.en')}
            />
          </FormSection>

          <Divider />

          {/* Order & Icon */}
          <FormSection>
            <Controller
              name="order"
              control={control}
              render={({ field }) => (
                <NumberInput
                  label={t('form.order')}
                  placeholder={t('form.orderPlaceholder')}
                  min={0}
                  value={field.value}
                  onChange={field.onChange}
                  error={
                    errors.order?.message
                      ? translateZodError(errors.order.message, (key) => t(key as any))
                      : undefined
                  }
                />
              )}
            />

            <Controller
              name="icon"
              control={control}
              render={({ field }) => (
                <IconSelector
                  label={t('form.icon')}
                  placeholder={t('form.iconPlaceholder')}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.icon?.message}
                  description={t('form.iconDescription')}
                />
              )}
            />
          </FormSection>

          {/* Actions */}
          <Group justify="flex-end" mt="xl">
            <Button
              variant="subtle"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              {tCommon('cancel')}
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {editData ? tCommon('save') : tCommon('create')}
            </Button>
          </Group>
        </Stack>
      </form>
    </Drawer>
  )
}

