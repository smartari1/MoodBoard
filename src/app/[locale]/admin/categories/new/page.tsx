/**
 * Admin Category Create Page
 * Create new category with bilingual name, slug, and order
 */

'use client'

import { useState } from 'react'
import { Container, Title, Stack, Group, ActionIcon, Alert, TextInput, Button, SimpleGrid, NumberInput, Paper, Text } from '@mantine/core'
import { useTranslations } from 'next-intl'
import { useParams, useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { IconArrowLeft, IconAlertCircle, IconInfoCircle } from '@tabler/icons-react'
// FIX: Replaced barrel import with direct imports to improve compilation speed
// Barrel imports force compilation of ALL components (including heavy RichTextEditor, ImageUpload)
// Direct imports only compile what's needed
import { MoodBCard } from '@/components/ui/Card'
import { FormSection } from '@/components/ui/Form/FormSection'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { createCategorySchema, type CreateCategory } from '@/lib/validations/category'
import { useCreateCategory } from '@/hooks/useCategories'
import { hasHtmlContent } from '@/lib/utils/html'

export default function AdminCategoryNewPage() {
  const t = useTranslations('admin.categories.create')
  const tCommon = useTranslations('common')
  const params = useParams()
  const router = useRouter()
  const locale = params.locale as string

  const createMutation = useCreateCategory()
  const [slugValue, setSlugValue] = useState('')

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<CreateCategory>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: {
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
      images: [],
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
      .replace(/[\u0590-\u05FF]/g, '') // Remove Hebrew characters (for transliteration, use English)
      .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphen
      .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
      .substring(0, 50) // Limit length
  }

  // Auto-generate slug from names
  const handleNameHeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setValue('name.he', value)
    
    // Auto-generate slug if slug is empty or matches previous name
    if (!slugValue || slugValue === generateSlug(nameHe || nameEn || '')) {
      const newSlug = generateSlug(value || nameEn || '')
      if (newSlug) {
        setSlugValue(newSlug)
        setValue('slug', newSlug)
      }
    }
  }

  const handleNameEnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setValue('name.en', value)
    
    // Auto-generate slug from English if Hebrew doesn't produce a good slug
    if (!slugValue || (!nameHe && value)) {
      const newSlug = generateSlug(value || nameHe || '')
      if (newSlug) {
        setSlugValue(newSlug)
        setValue('slug', newSlug)
      }
    }
  }

  const nameHeRegister = register('name.he')
  const nameEnRegister = register('name.en')

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
    setSlugValue(value)
    setValue('slug', value, { shouldValidate: true })
  }

  const onSubmit = async (data: CreateCategory) => {
    try {
      // Clean up empty description - check if HTML actually has content
      const hasHeContent = hasHtmlContent(data.description?.he)
      const hasEnContent = hasHtmlContent(data.description?.en)
      
      const submitData = {
        ...data,
        description: (hasHeContent || hasEnContent)
          ? {
              he: hasHeContent ? data.description!.he : '',
              en: hasEnContent ? data.description!.en : '',
            }
          : undefined,
        images: data.images || [],
      }
      await createMutation.mutateAsync(submitData)
      router.push(`/${locale}/admin/categories`)
    } catch (error) {
      console.error('Error creating category:', error)
    }
  }

  return (
    <Container size="xl" py="xl">
      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack gap="lg">
          {/* Header */}
          <Group>
            <ActionIcon
              variant="subtle"
              onClick={() => router.push(`/${locale}/admin/categories`)}
            >
              <IconArrowLeft size={20} />
            </ActionIcon>
            <Title order={1} c="brand">
              {t('title')}
            </Title>
          </Group>

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

          {/* Form */}
          <MoodBCard>
            <Stack gap="md">
              <FormSection title={t('basicInfo')}>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                  <TextInput
                    label={t('nameHe')}
                    placeholder={t('nameHePlaceholder')}
                    {...nameHeRegister}
                    onChange={(e) => {
                      nameHeRegister.onChange(e)
                      handleNameHeChange(e)
                    }}
                    error={errors.name?.he?.message}
                    required
                  />
                  <TextInput
                    label={t('nameEn')}
                    placeholder={t('nameEnPlaceholder')}
                    {...nameEnRegister}
                    onChange={(e) => {
                      nameEnRegister.onChange(e)
                      handleNameEnChange(e)
                    }}
                    error={errors.name?.en?.message}
                    required
                  />
                </SimpleGrid>

                {/* Description Section */}
                <Paper p="md" withBorder style={{ backgroundColor: '#fafafa' }}>
                  <Stack gap="md">
                    <Group gap="xs">
                      <IconInfoCircle size={18} style={{ color: '#df2538' }} />
                      <Text fw={500} size="sm">
                        {t('description')}
                      </Text>
                    </Group>
                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                      <Controller
                        name="description.he"
                        control={control}
                        render={({ field }) => (
                          <RichTextEditor
                            label={t('descriptionHe')}
                            placeholder={t('descriptionPlaceholder')}
                            value={field.value || ''}
                            onChange={field.onChange}
                            error={errors.description?.he?.message}
                            dir="rtl"
                            minHeight={200}
                          />
                        )}
                      />
                      <Controller
                        name="description.en"
                        control={control}
                        render={({ field }) => (
                          <RichTextEditor
                            label={t('descriptionEn')}
                            placeholder={t('descriptionPlaceholder')}
                            value={field.value || ''}
                            onChange={field.onChange}
                            error={errors.description?.en?.message}
                            dir="ltr"
                            minHeight={200}
                          />
                        )}
                      />
                    </SimpleGrid>
                  </Stack>
                </Paper>

                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                  <TextInput
                    label={t('slug')}
                    placeholder={t('slugPlaceholder')}
                    value={slugValue}
                    onChange={handleSlugChange}
                    error={errors.slug?.message}
                    required
                    description={t('slugDescription')}
                  />
                  <Controller
                    name="order"
                    control={control}
                    render={({ field }) => (
                      <NumberInput
                        label={t('order')}
                        placeholder={t('orderPlaceholder')}
                        {...field}
                        error={errors.order?.message}
                        min={0}
                        description={t('orderDescription')}
                      />
                    )}
                  />
                </SimpleGrid>

                {/* Images Section - Note: Images can be added after creation */}
                <Paper p="md" withBorder>
                  <Text fw={500} size="sm" mb="xs">
                    {t('images') || 'Images'}
                  </Text>
                  <Text size="xs" c="dimmed" mb="md">
                    {t('imagesNote') || 'Images can be added after creating the category'}
                  </Text>
                  <Controller
                    name="images"
                    control={control}
                    render={({ field }) => (
                      <ImageUpload
                        value={[]}
                        onChange={() => {}}
                        entityType="category"
                        entityId=""
                        maxImages={20}
                        multiple
                        disabled
                        error={errors.images?.message}
                      />
                    )}
                  />
                </Paper>
              </FormSection>
            </Stack>
          </MoodBCard>

          {/* Submit Buttons */}
          <Group justify="flex-end">
            <Button
              variant="subtle"
              onClick={() => router.push(`/${locale}/admin/categories`)}
            >
              {tCommon('cancel')}
            </Button>
            <Button
              type="submit"
              color="brand"
              variant="filled"
              loading={createMutation.isPending}
            >
              {t('submit')}
            </Button>
          </Group>
        </Stack>
      </form>
    </Container>
  )
}

