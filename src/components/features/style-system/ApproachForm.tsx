/**
 * Approach Form Component
 * Form for creating and editing design approaches
 */

'use client'

// FIX: Replaced barrel import with direct imports to improve compilation speed
// Barrel imports force compilation of ALL components (including heavy RichTextEditor, ImageUpload)
// Direct imports only compile what's needed
import { FormSection } from '@/components/ui/Form/FormSection'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { useCreateApproach, useUpdateApproach } from '@/hooks/useApproaches'
import { createApproachFormSchema } from '@/lib/validations/approach'
import { zodResolver } from '@hookform/resolvers/zod'
import { Accordion, Button, NumberInput, Paper, Stack, Text, TextInput, Textarea } from '@mantine/core'
import { useTranslations } from 'next-intl'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { DetailedContentEditor } from './DetailedContentEditor'

type ApproachFormValues = z.infer<typeof createApproachFormSchema>

interface ApproachFormProps {
  approach?: any
  onSuccess?: () => void
}

export function ApproachForm({ approach, onSuccess }: ApproachFormProps) {
  const t = useTranslations('admin.styleSystem.approaches')
  const tCommon = useTranslations('common')

  const isEditMode = !!approach
  const createMutation = useCreateApproach()
  const updateMutation = useUpdateApproach()

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ApproachFormValues>({
    resolver: zodResolver(createApproachFormSchema),
    defaultValues: {
      name: { he: '', en: '' },
      slug: '',
      order: 0,
      description: { he: '', en: '' },
      images: [],
      detailedContent: {
        he: {
          introduction: '',
          description: '',
          period: '',
          characteristics: [],
          visualElements: [],
          philosophy: '',
          colorGuidance: '',
          materialGuidance: '',
          applications: [],
        },
        en: {
          introduction: '',
          description: '',
          period: '',
          characteristics: [],
          visualElements: [],
          philosophy: '',
          colorGuidance: '',
          materialGuidance: '',
          applications: [],
        },
      },
      metadata: {
        isDefault: false,
        version: '1.0.0',
        tags: [],
        usage: 0,
      },
    },
  })

  useEffect(() => {
    if (approach) {
      reset({
        name: approach.name,
        slug: approach.slug,
        order: approach.order,
        description: approach.description || { he: '', en: '' },
        images: approach.images || [],
        detailedContent: approach.detailedContent || {
          he: {
            introduction: '',
            description: '',
            period: '',
            characteristics: [],
            visualElements: [],
            philosophy: '',
            colorGuidance: '',
            materialGuidance: '',
            applications: [],
          },
          en: {
            introduction: '',
            description: '',
            period: '',
            characteristics: [],
            visualElements: [],
            philosophy: '',
            colorGuidance: '',
            materialGuidance: '',
            applications: [],
          },
        },
        metadata: approach.metadata || {
          isDefault: false,
          version: '1.0.0',
          tags: [],
          usage: 0,
        },
      })
    }
  }, [approach, reset])

  const onSubmit = async (data: ApproachFormValues) => {
    try {
      if (isEditMode) {
        await updateMutation.mutateAsync({ id: approach.id, data })
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

        {/* Images Section */}
        <FormSection title={t('form.images') || 'Images'}>
          <Controller
            name="images"
            control={control}
            render={({ field }) => (
              <ImageUpload
                value={field.value || []}
                onChange={(images) => {
                  field.onChange(images)
                  setValue('images', images)
                }}
                entityType="approach"
                entityId={isEditMode ? approach?.id : ''}
                maxImages={20}
                multiple
                error={errors.images?.message}
              />
            )}
          />
        </FormSection>

        {/* Detailed Content Editor */}
        <DetailedContentEditor
          control={control}
          errors={errors}
          watch={watch}
          setValue={setValue}
          entityType="approach"
        />

        <Button type="submit" color="brand" fullWidth loading={isSubmitting}>
          {isEditMode ? tCommon('save') : tCommon('create')}
        </Button>
      </Stack>
    </form>
  )
}
