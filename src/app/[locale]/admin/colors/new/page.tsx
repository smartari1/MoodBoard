/**
 * Admin Color Create Page
 * Create new color with professional color picker
 */

'use client'

import { Container, Title, Stack, Group, ActionIcon, Text, Button, Alert, Textarea, Input, TextInput, Select, SimpleGrid, Paper } from '@mantine/core'
import { useTranslations } from 'next-intl'
import { useParams, useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { IconArrowLeft, IconAlertCircle, IconColorPicker } from '@tabler/icons-react'
// FIX: Replaced barrel import with direct imports to improve compilation speed
// Barrel imports force compilation of ALL components (including heavy RichTextEditor, ImageUpload)
// Direct imports only compile what's needed
import { MoodBButton } from '@/components/ui/Button'
import { MoodBCard } from '@/components/ui/Card'
import { FormSection } from '@/components/ui/Form/FormSection'
import { createColorSchema, type CreateColor } from '@/lib/validations/color'
import { useCreateColor } from '@/hooks/useColors'
import { useMemo } from 'react'

export default function AdminColorNewPage() {
  const t = useTranslations('admin.colors.create')
  const tCommon = useTranslations('common')
  const tCategories = useTranslations('admin.colors.categories')
  const tRoles = useTranslations('admin.colors.roles')
  const params = useParams()
  const router = useRouter()
  const locale = params.locale as string

  const createMutation = useCreateColor()

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<CreateColor>({
    // @ts-expect-error - zodResolver type issue with nested schemas
    resolver: zodResolver(createColorSchema),
    defaultValues: {
      name: {
        he: '',
        en: '',
      },
      description: {
        he: '',
        en: '',
      },
      hex: '#ffffff',
      pantone: '',
      category: 'neutral',
      role: undefined,
    },
  })

  const category = watch('category')
  const hexValue = watch('hex')
  const descriptionHe = watch('description.he')
  const descriptionEn = watch('description.en')

  const categoryOptions = [
    { value: 'neutral', label: tCategories('neutral') },
    { value: 'accent', label: tCategories('accent') },
    { value: 'semantic', label: tCategories('semantic') },
  ]

  const roleOptions = [
    { value: 'primary', label: tRoles('primary') },
    { value: 'secondary', label: tRoles('secondary') },
    { value: 'success', label: tRoles('success') },
    { value: 'warning', label: tRoles('warning') },
    { value: 'error', label: tRoles('error') },
  ]

  // Normalize hex value to ensure it's valid
  const normalizedHex = useMemo(() => {
    if (!hexValue) return '#ffffff'
    const hex = hexValue.trim()
    if (hex.startsWith('#')) {
      return hex.length === 7 ? hex : '#ffffff'
    }
    return `#${hex}`.slice(0, 7)
  }, [hexValue])

  const handleColorPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHex = e.target.value.toUpperCase()
    setValue('hex', newHex, { shouldValidate: true })
  }

  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.trim().toUpperCase()
    
    // Allow partial input while typing
    if (!value.startsWith('#')) {
      value = `#${value}`
    }
    
    // Limit to 7 characters (#RRGGBB)
    if (value.length <= 7) {
      setValue('hex', value, { shouldValidate: false })
    }
  }

  const handleHexInputBlur = () => {
    // Validate and normalize on blur
    const hex = normalizedHex
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      setValue('hex', hex, { shouldValidate: true })
    } else {
      setValue('hex', '#ffffff', { shouldValidate: true })
    }
  }

  const onSubmit = async (data: CreateColor) => {
    try {
      // Clean up empty description
      const submitData = {
        ...data,
        description: data.description?.he || data.description?.en 
          ? data.description 
          : undefined,
      }
      await createMutation.mutateAsync(submitData)
      router.push(`/${locale}/admin/colors`)
    } catch (error) {
      console.error('Error creating color:', error)
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
              onClick={() => router.push(`/${locale}/admin/colors`)}
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

                {/* Description Section */}
                <Paper p="md" withBorder style={{ backgroundColor: '#fafafa' }}>
                  <Stack gap="md">
                    <Group gap="xs">
                      <IconColorPicker size={18} style={{ color: '#df2538' }} />
                      <Text fw={500} size="sm">
                        {t('description')}
                      </Text>
                    </Group>
                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                      <Textarea
                        label={t('descriptionHe')}
                        placeholder={t('descriptionPlaceholder')}
                        {...register('description.he')}
                        error={errors.description?.he?.message}
                        minRows={3}
                        description={descriptionHe ? `${descriptionHe.length} ${t('characters')}` : undefined}
                      />
                      <Textarea
                        label={t('descriptionEn')}
                        placeholder={t('descriptionPlaceholder')}
                        {...register('description.en')}
                        error={errors.description?.en?.message}
                        minRows={3}
                        description={descriptionEn ? `${descriptionEn.length} ${t('characters')}` : undefined}
                      />
                    </SimpleGrid>
                  </Stack>
                </Paper>

                {/* Color Picker Section */}
                <Paper p="md" withBorder style={{ backgroundColor: '#fafafa' }}>
                  <Stack gap="md">
                    <Group gap="xs">
                      <IconColorPicker size={18} style={{ color: '#df2538' }} />
                      <Text fw={500} size="sm">
                        {t('hex')}
                      </Text>
                    </Group>
                    <Group align="flex-end" gap="md" wrap="nowrap">
                      {/* Color Picker Input */}
                      <Input.Wrapper label={t('pickColor')} required>
                        <Group gap="xs" align="center">
                          <input
                            id="color-picker"
                            type="color"
                            value={normalizedHex}
                            onChange={handleColorPickerChange}
                            style={{
                              width: '100px',
                              height: '100px',
                              border: '2px solid #ddd',
                              borderRadius: 8,
                              cursor: 'pointer',
                              padding: 0,
                              backgroundColor: normalizedHex,
                              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                            }}
                            aria-label={t('pickColor')}
                          />
                        </Group>
                      </Input.Wrapper>

                      {/* Hex Input */}
                      <div style={{ flex: 1 }}>
                        <Controller
                          name="hex"
                          control={control}
                          render={({ field }) => (
                            <TextInput
                              label={t('hex')}
                              placeholder={t('hexPlaceholder')}
                              value={field.value}
                              onChange={handleHexInputChange}
                              onBlur={(e) => {
                                handleHexInputBlur()
                                field.onBlur()
                              }}
                              error={errors.hex?.message}
                              required
                              styles={{
                                input: {
                                  fontFamily: 'monospace',
                                  fontSize: '16px',
                                  fontWeight: 600,
                                  textTransform: 'uppercase',
                                },
                              }}
                            />
                          )}
                        />
                      </div>

                      {/* Color Preview */}
                      <Paper
                        p="md"
                        withBorder
                        style={{
                          minWidth: 140,
                          backgroundColor: '#fff',
                        }}
                      >
                        <Stack gap="xs" align="center">
                          <Text size="xs" fw={500} c="dimmed" mb={4}>
                            {t('preview')}
                          </Text>
                          <div
                            style={{
                              width: 80,
                              height: 80,
                              backgroundColor: normalizedHex,
                              border: '2px solid #ddd',
                              borderRadius: 8,
                              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                              transition: 'all 0.2s ease',
                            }}
                          />
                          <Text size="xs" c="dimmed" ff="monospace" fw={600}>
                            {normalizedHex.toUpperCase()}
                          </Text>
                          <Text size="xs" c="dimmed">
                            RGB: {(() => {
                              try {
                                if (normalizedHex.length === 7 && /^#[0-9A-Fa-f]{6}$/.test(normalizedHex)) {
                                  const r = parseInt(normalizedHex.slice(1, 3), 16)
                                  const g = parseInt(normalizedHex.slice(3, 5), 16)
                                  const b = parseInt(normalizedHex.slice(5, 7), 16)
                                  return `${r}, ${g}, ${b}`
                                }
                                return '—'
                              } catch {
                                return '—'
                              }
                            })()}
                          </Text>
                        </Stack>
                      </Paper>
                    </Group>
                  </Stack>
                </Paper>

                <TextInput
                  label={t('pantone')}
                  placeholder={t('pantonePlaceholder')}
                  {...register('pantone')}
                  error={errors.pantone?.message}
                />

                <Controller
                  name="category"
                  control={control}
                  render={({ field }) => (
                    <Select
                      label={t('category')}
                      placeholder={t('categoryPlaceholder')}
                      data={categoryOptions}
                      {...field}
                      error={errors.category?.message}
                      required
                      description={t('categoryDescription')}
                    />
                  )}
                />

                {category === 'semantic' && (
                  <Controller
                    name="role"
                    control={control}
                    render={({ field }) => (
                      <Select
                        label={t('role')}
                        placeholder={t('rolePlaceholder')}
                        data={roleOptions}
                        {...field}
                        error={errors.role?.message}
                      />
                    )}
                  />
                )}
              </FormSection>
            </Stack>
          </MoodBCard>

          {/* Submit Buttons */}
          <Group justify="flex-end">
            <Button
              variant="subtle"
              onClick={() => router.push(`/${locale}/admin/colors`)}
            >
              {t('cancel')}
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
