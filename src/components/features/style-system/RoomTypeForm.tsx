/**
 * Room Type Form Component
 * Form for creating and editing room types
 */

'use client'

// FIX: Replaced barrel import with direct imports to improve compilation speed
// Barrel imports force compilation of ALL components (including heavy RichTextEditor, ImageUpload)
// Direct imports only compile what's needed
import { FormSection } from '@/components/ui/Form/FormSection'
import { useCreateRoomType, useUpdateRoomType } from '@/hooks/useRoomTypes'
import { createRoomTypeFormSchema } from '@/lib/validations/roomType'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, NumberInput, Stack, TextInput, Textarea } from '@mantine/core'
import { useTranslations } from 'next-intl'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'

type RoomTypeFormValues = z.infer<typeof createRoomTypeFormSchema>

interface RoomTypeFormProps {
  roomType?: any
  onSuccess?: () => void
}

export function RoomTypeForm({ roomType, onSuccess }: RoomTypeFormProps) {
  const t = useTranslations('admin.styleSystem.roomTypes')
  const tCommon = useTranslations('common')

  const isEditMode = !!roomType
  const createMutation = useCreateRoomType()
  const updateMutation = useUpdateRoomType()

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<RoomTypeFormValues>({
    resolver: zodResolver(createRoomTypeFormSchema),
    defaultValues: {
      name: { he: '', en: '' },
      slug: '',
      description: { he: '', en: '' },
      icon: '',
      order: 0,
    },
  })

  useEffect(() => {
    if (roomType) {
      reset({
        name: roomType.name,
        slug: roomType.slug,
        description: roomType.description || { he: '', en: '' },
        icon: roomType.icon || '',
        order: roomType.order,
      })
    }
  }, [roomType, reset])

  const onSubmit = async (data: RoomTypeFormValues) => {
    try {
      if (isEditMode) {
        await updateMutation.mutateAsync({ id: roomType.id, data })
      } else {
        await createMutation.mutateAsync(data)
      }
      onSuccess?.()
    } catch (error: any) {
      console.error('Submit error:', error)
    }
  }

  const generateSlug = () => {
    const enName = getValues('name.en')
    if (enName) {
      const slug = enName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
      setValue('slug', slug)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Stack gap="md">
        <FormSection title={t('form.basicInfo')}>
          <Stack gap="md">
            <Controller
              name="name.he"
              control={control}
              render={({ field }) => (
                <TextInput
                  {...field}
                  label={t('form.nameHe')}
                  placeholder={t('form.nameHePlaceholder')}
                  required
                  error={errors.name?.he?.message}
                />
              )}
            />

            <Controller
              name="name.en"
              control={control}
              render={({ field }) => (
                <TextInput
                  {...field}
                  label={t('form.nameEn')}
                  placeholder={t('form.nameEnPlaceholder')}
                  required
                  error={errors.name?.en?.message}
                  onBlur={() => {
                    field.onBlur()
                    if (!getValues('slug')) {
                      generateSlug()
                    }
                  }}
                />
              )}
            />

            <Controller
              name="slug"
              control={control}
              render={({ field }) => (
                <TextInput
                  {...field}
                  label={t('form.slug')}
                  placeholder={t('form.slugPlaceholder')}
                  required
                  error={errors.slug?.message}
                  rightSection={
                    <Button size="xs" variant="subtle" onClick={generateSlug}>
                      {tCommon('generate')}
                    </Button>
                  }
                />
              )}
            />

            <Controller
              name="icon"
              control={control}
              render={({ field }) => (
                <TextInput
                  {...field}
                  label={t('form.icon')}
                  placeholder={t('form.iconPlaceholder')}
                  error={errors.icon?.message}
                />
              )}
            />

            <Controller
              name="order"
              control={control}
              render={({ field }) => (
                <NumberInput
                  {...field}
                  label={t('form.order')}
                  placeholder={t('form.orderPlaceholder')}
                  min={0}
                  error={errors.order?.message}
                />
              )}
            />
          </Stack>
        </FormSection>

        <FormSection title={t('form.description')}>
          <Stack gap="md">
            <Controller
              name="description.he"
              control={control}
              render={({ field }) => (
                <Textarea
                  {...field}
                  label={t('form.descriptionHe')}
                  placeholder={t('form.descriptionHePlaceholder')}
                  minRows={3}
                  error={errors.description?.he?.message}
                />
              )}
            />

            <Controller
              name="description.en"
              control={control}
              render={({ field }) => (
                <Textarea
                  {...field}
                  label={t('form.descriptionEn')}
                  placeholder={t('form.descriptionEnPlaceholder')}
                  minRows={3}
                  error={errors.description?.en?.message}
                />
              )}
            />
          </Stack>
        </FormSection>

        <Button type="submit" color="brand" fullWidth loading={isSubmitting}>
          {isEditMode ? tCommon('save') : tCommon('create')}
        </Button>
      </Stack>
    </form>
  )
}
