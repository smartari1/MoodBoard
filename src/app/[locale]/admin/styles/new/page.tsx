/**
 * Admin Style Create Page
 * Create new global style with full form
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import { Container, Title, Stack, Group, ActionIcon, Text, Button, Alert, Tabs, ScrollArea, Paper, Badge } from '@mantine/core'
import { useTranslations } from 'next-intl'
import { useParams, useRouter } from 'next/navigation'
import { useForm, Controller, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { IconArrowLeft, IconAlertCircle, IconPlus, IconX, IconPalette, IconBox, IconHome } from '@tabler/icons-react'
import { MoodBButton, MoodBCard, FormSection, ImageUpload } from '@/components/ui'
import { createStyleSchema, type CreateStyle } from '@/lib/validations/style'
import { useCreateAdminStyle, useUpdateAdminStyle } from '@/hooks/useStyles'
import { useCategories, useSubCategories } from '@/hooks/useCategories'
import { useColors } from '@/hooks/useColors'
import { useMaterials } from '@/hooks/useMaterials'
import { ROOM_TYPES } from '@/lib/validations/room'
import { useImageUpload } from '@/hooks/useImageUpload'
import {
  TextInput,
  Select,
  MultiSelect,
  SimpleGrid,
} from '@mantine/core'

export default function AdminStyleNewPage() {
  const t = useTranslations('admin.styles.create')
  const tCommon = useTranslations('common')
  const tRoomTypes = useTranslations('projects.form.roomTypes')
  const params = useParams()
  const router = useRouter()
  const locale = params.locale as string

  const createMutation = useCreateAdminStyle()
  const updateMutation = useUpdateAdminStyle()
  const { uploadImage } = useImageUpload()
  const [activeTab, setActiveTab] = useState<string | null>('basic')
  const [pendingStyleFiles, setPendingStyleFiles] = useState<File[]>([])
  const [pendingRoomProfileFiles, setPendingRoomProfileFiles] = useState<Record<number, File[]>>({})

  // Fetch categories and sub-categories
  const { data: categoriesData } = useCategories()
  const categories = categoriesData?.data || []
  
  // Fetch colors
  const { data: colorsData } = useColors({ limit: 100 })
  const colors = colorsData?.data || []

  // Fetch materials (using max limit of 100, pagination can be added later if needed)
  const { data: materialsData } = useMaterials({ limit: 100 })
  const materials = materialsData?.data || []

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<CreateStyle>({
    // @ts-expect-error - zodResolver type issue with nested schemas
    resolver: zodResolver(createStyleSchema),
    defaultValues: {
      name: {
        he: '',
        en: '',
      },
      categoryId: '',
      subCategoryId: '',
      slug: '',
      colorId: '',
      materialSet: {
        defaults: [],
        alternatives: [],
      },
      images: [],
      roomProfiles: [],
      metadata: {
        tags: [],
      },
    },
  })

  const categoryId = watch('categoryId')
  const subCategoryId = watch('subCategoryId')
  const roomProfiles = watch('roomProfiles')

  // Fetch sub-categories when category is selected
  const { data: subCategoriesData } = useSubCategories(categoryId || undefined)
  const subCategories = subCategoriesData?.data || []

  // Category options
  const categoryOptions = useMemo(() => {
    return categories.map((cat) => ({
      value: cat.id,
      label: locale === 'he' ? cat.name.he : cat.name.en,
    }))
  }, [categories, locale])

  // Sub-category options
  const subCategoryOptions = useMemo(() => {
    return subCategories.map((subCat) => ({
      value: subCat.id,
      label: locale === 'he' ? subCat.name.he : subCat.name.en,
    }))
  }, [subCategories, locale])

  // Color options
  const colorOptions = useMemo(() => {
    return colors.map((color) => ({
      value: color.id,
      label: `${locale === 'he' ? color.name.he : color.name.en} (${color.hex})`,
      color: color.hex,
    }))
  }, [colors, locale])

  // Material options
  const materialOptions = useMemo(() => {
    return materials.map((material) => ({
      value: material.id,
      label: `${locale === 'he' ? material.name.he : material.name.en}${material.sku ? ` (${material.sku})` : ''}`,
    }))
  }, [materials, locale])

  // Room type options
  const roomTypeOptions = useMemo(() => {
    return ROOM_TYPES.map((type) => ({
      value: type,
      label: tRoomTypes(type),
    }))
  }, [tRoomTypes])

  // Reset sub-category when category changes
  useEffect(() => {
    if (categoryId) {
      setValue('subCategoryId', '')
    }
  }, [categoryId, setValue])

  // Clean up invalid blob URLs on mount (e.g., after page refresh)
  useEffect(() => {
    const cleanBlobUrls = (urls: string[] | undefined): string[] => {
      if (!urls) return []
      return urls.filter((url) => {
        if (url.startsWith('blob:')) {
          // Blob URLs become invalid after page refresh, so remove them
          // They'll be recreated from pending files if needed
          return false
        }
        return true
      })
    }

    // Clean style images
    const currentImages = watch('images') || []
    const cleanedImages = cleanBlobUrls(currentImages)
    if (cleanedImages.length !== currentImages.length) {
      setValue('images', cleanedImages)
    }

    // Clean room profile images
    const currentRoomProfiles = watch('roomProfiles') || []
    const cleanedRoomProfiles = currentRoomProfiles.map((profile) => ({
      ...profile,
      images: cleanBlobUrls(profile.images),
    }))
    if (JSON.stringify(cleanedRoomProfiles) !== JSON.stringify(currentRoomProfiles)) {
      setValue('roomProfiles', cleanedRoomProfiles)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run on mount

  const {
    fields: defaultMaterialFields,
    append: appendDefaultMaterial,
    remove: removeDefaultMaterial,
  } = useFieldArray({
    control,
    name: 'materialSet.defaults',
  })

  const {
    fields: roomProfileFields,
    append: appendRoomProfile,
    remove: removeRoomProfile,
  } = useFieldArray({
    control,
    name: 'roomProfiles',
  })

  // Get available room types (not already added)
  const availableRoomTypes = useMemo(() => {
    const usedTypes = new Set(roomProfiles?.map((rp) => rp.roomType) || [])
    return roomTypeOptions.filter((opt) => !usedTypes.has(opt.value))
  }, [roomTypeOptions, roomProfiles])

  const onSubmit = async (data: CreateStyle) => {
    try {
      // Create style first
      const createdStyle = await createMutation.mutateAsync(data)
      
      // Upload pending style images
      const uploadedStyleImages: string[] = []
      for (const file of pendingStyleFiles) {
        try {
          const url = await uploadImage({
            file,
            entityType: 'style',
            entityId: createdStyle.id,
          })
          uploadedStyleImages.push(url)
        } catch (err) {
          console.error('Failed to upload style image:', err)
        }
      }
      
      // Upload pending room profile images
      const updatedRoomProfiles = [...(data.roomProfiles || [])]
      for (let i = 0; i < updatedRoomProfiles.length; i++) {
        const roomFiles = pendingRoomProfileFiles[i] || []
        const uploadedRoomImages: string[] = []
        
        for (const file of roomFiles) {
          try {
            const url = await uploadImage({
              file,
              entityType: 'style',
              entityId: createdStyle.id,
              roomType: updatedRoomProfiles[i].roomType,
            })
            uploadedRoomImages.push(url)
          } catch (err) {
            console.error('Failed to upload room profile image:', err)
          }
        }
        
        if (uploadedRoomImages.length > 0) {
          updatedRoomProfiles[i] = {
            ...updatedRoomProfiles[i],
            images: [...(updatedRoomProfiles[i].images || []), ...uploadedRoomImages],
          }
        }
      }
      
      // Update style with uploaded images if any
      if (uploadedStyleImages.length > 0 || updatedRoomProfiles.some(rp => rp.images && rp.images.length > 0)) {
        await updateMutation.mutateAsync({
          id: createdStyle.id,
          data: {
            images: [...(data.images || []), ...uploadedStyleImages],
            roomProfiles: updatedRoomProfiles,
          },
        })
      }
      
      // Redirect to detail page
      router.push(`/${locale}/admin/styles/${createdStyle.id}`)
    } catch (error) {
      console.error('Error creating style:', error)
    }
  }

  const handleAddRoomProfile = () => {
    if (availableRoomTypes.length > 0) {
      appendRoomProfile({
        roomType: availableRoomTypes[0].value,
        materials: [],
      })
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
              onClick={() => router.push(`/${locale}/admin/styles`)}
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
                : 'Failed to create style'}
            </Alert>
          )}

          {/* Form Tabs */}
          <Tabs value={activeTab} onChange={setActiveTab}>
            <Tabs.List>
              <Tabs.Tab value="basic" leftSection={<IconPalette size={16} />}>
                {t('basicInfo')}
              </Tabs.Tab>
              <Tabs.Tab value="color" leftSection={<IconPalette size={16} />}>
                {t('color')}
              </Tabs.Tab>
              <Tabs.Tab value="materials" leftSection={<IconBox size={16} />}>
                {t('materials')}
              </Tabs.Tab>
              <Tabs.Tab value="rooms" leftSection={<IconHome size={16} />}>
                {t('rooms')}
              </Tabs.Tab>
            </Tabs.List>

            {/* Basic Info Tab */}
            <Tabs.Panel value="basic" pt="lg">
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
                          label={t('category')}
                          placeholder={t('categoryPlaceholder')}
                          data={categoryOptions}
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
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
                          label={t('subCategory')}
                          placeholder={t('subCategoryPlaceholder')}
                          data={subCategoryOptions}
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
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

                    {/* Style Images */}
                    <Paper p="md" withBorder>
                      <Text fw={500} size="sm" mb="md">
                        {t('images') || 'Images'}
                      </Text>
                      <Controller
                        name="images"
                        control={control}
                        render={({ field }) => {
                          // Filter out invalid blob URLs
                          const validImages = (field.value || []).filter((url: string) => {
                            if (url.startsWith('blob:')) {
                              try {
                                return url.includes('blob:http')
                              } catch {
                                return false
                              }
                            }
                            return true
                          })

                          return (
                            <ImageUpload
                              value={validImages}
                              onChange={(images) => {
                                // Filter out any invalid blob URLs before updating
                                const filteredImages = images.filter((url: string) => {
                                  if (url.startsWith('blob:')) {
                                    try {
                                      return url.includes('blob:http')
                                    } catch {
                                      return false
                                    }
                                  }
                                  return true
                                })
                                field.onChange(filteredImages)
                                setValue('images', filteredImages)
                              }}
                              onPendingFilesChange={(files) => {
                                setPendingStyleFiles(files)
                              }}
                              entityType="style"
                              entityId="" // Empty during creation - will upload after creation
                              maxImages={20}
                              multiple
                              error={errors.images?.message}
                            />
                          )
                        }}
                      />
                    </Paper>
                  </FormSection>
                </Stack>
              </MoodBCard>
            </Tabs.Panel>

            {/* Color Tab */}
            <Tabs.Panel value="color" pt="lg">
              <MoodBCard>
                <Stack gap="md">
                  <FormSection title={t('selectColor')}>
                    <Controller
                      name="colorId"
                      control={control}
                      render={({ field }) => (
                        <Select
                          label={t('color')}
                          placeholder={t('colorPlaceholder')}
                          data={colorOptions}
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          error={errors.colorId?.message}
                          required
                          searchable
                          renderOption={({ option }) => (
                            <Group gap="xs">
                              <div
                                style={{
                                  width: 20,
                                  height: 20,
                                  backgroundColor: option.color,
                                  borderRadius: 4,
                                  border: '1px solid #ddd',
                                }}
                              />
                              <Text>{option.label}</Text>
                            </Group>
                          )}
                        />
                      )}
                    />
                    {watch('colorId') && (
                      <Paper p="sm" withBorder>
                        <Group gap="xs">
                          <Text size="sm" fw={500}>{t('selectedColor')}:</Text>
                          {(() => {
                            const selectedColor = colors.find((c) => c.id === watch('colorId'))
                            return selectedColor ? (
                              <Group gap="xs">
                                <div
                                  style={{
                                    width: 24,
                                    height: 24,
                                    backgroundColor: selectedColor.hex,
                                    borderRadius: 4,
                                    border: '1px solid #ddd',
                                  }}
                                />
                                <Text size="sm">
                                  {locale === 'he' ? selectedColor.name.he : selectedColor.name.en}
                                </Text>
                                <Badge size="sm" variant="light">{selectedColor.hex}</Badge>
                              </Group>
                            ) : null
                          })()}
                        </Group>
                      </Paper>
                    )}
                  </FormSection>
                </Stack>
              </MoodBCard>
            </Tabs.Panel>

            {/* Materials Tab */}
            <Tabs.Panel value="materials" pt="lg">
              <ScrollArea h={600}>
                <Stack gap="md">
                  {/* General Materials */}
                  <MoodBCard>
                    <Group justify="space-between" mb="md">
                      <div>
                        <Text fw={500}>{t('generalMaterials')}</Text>
                        <Text size="sm" c="dimmed">{t('generalMaterialsDescription')}</Text>
                      </div>
                      <Button
                        size="xs"
                        variant="light"
                        leftSection={<IconPlus size={14} />}
                        onClick={() => appendDefaultMaterial({ materialId: '', usageArea: '' })}
                      >
                        {t('addDefaultMaterial')}
                      </Button>
                    </Group>
                    <Stack gap="sm">
                      {defaultMaterialFields.length === 0 ? (
                        <Text size="sm" c="dimmed" ta="center" py="md">
                          {t('noGeneralMaterials')}
                        </Text>
                      ) : (
                        defaultMaterialFields.map((field, index) => (
                          <Group key={field.id} align="flex-start">
                            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm" style={{ flex: 1 }}>
                              <Controller
                                name={`materialSet.defaults.${index}.materialId`}
                                control={control}
                                render={({ field: materialField }) => (
                                  <Select
                                    placeholder={t('materialId')}
                                    data={materialOptions}
                                    value={materialField.value}
                                    onChange={materialField.onChange}
                                    onBlur={materialField.onBlur}
                                    error={errors.materialSet?.defaults?.[index]?.materialId?.message}
                                    searchable
                                    required
                                  />
                                )}
                              />
                              <TextInput
                                placeholder={t('usageArea')}
                                {...register(`materialSet.defaults.${index}.usageArea`)}
                                error={errors.materialSet?.defaults?.[index]?.usageArea?.message}
                              />
                              <TextInput
                                placeholder={t('finish')}
                                {...register(`materialSet.defaults.${index}.defaultFinish`)}
                              />
                            </SimpleGrid>
                            <ActionIcon
                              color="red"
                              variant="subtle"
                              onClick={() => removeDefaultMaterial(index)}
                            >
                              <IconX size={16} />
                            </ActionIcon>
                          </Group>
                        ))
                      )}
                    </Stack>
                  </MoodBCard>
                </Stack>
              </ScrollArea>
            </Tabs.Panel>

            {/* Rooms Tab */}
            <Tabs.Panel value="rooms" pt="lg">
              <ScrollArea h={600}>
                <Stack gap="md">
                  <MoodBCard>
                    <Group justify="space-between" mb="md">
                      <div>
                        <Text fw={500}>{t('roomProfiles')}</Text>
                        <Text size="sm" c="dimmed">{t('roomProfilesDescription')}</Text>
                      </div>
                      <Button
                        size="xs"
                        variant="light"
                        leftSection={<IconPlus size={14} />}
                        onClick={handleAddRoomProfile}
                        disabled={availableRoomTypes.length === 0}
                      >
                        {t('addRoomProfile')}
                      </Button>
                    </Group>

                    {roomProfileFields.length === 0 ? (
                      <Text size="sm" c="dimmed" ta="center" py="md">
                        {t('noRoomProfiles')}
                      </Text>
                    ) : (
                      <Stack gap="md">
                        {roomProfileFields.map((field, index) => {
                          const roomProfile = roomProfiles?.[index]
                          const roomMaterials = roomProfile?.materials || []
                          
                          return (
                            <Paper key={field.id} p="md" withBorder>
                              <Stack gap="sm">
                                <Group justify="space-between">
                                  <Text fw={500}>
                                    {tRoomTypes(roomProfile?.roomType || '')}
                                  </Text>
                                  <ActionIcon
                                    color="red"
                                    variant="subtle"
                                    onClick={() => removeRoomProfile(index)}
                                  >
                                    <IconX size={16} />
                                  </ActionIcon>
                                </Group>

                                <Controller
                                  name={`roomProfiles.${index}.roomType`}
                                  control={control}
                                  render={({ field: roomTypeField }) => (
                                    <Select
                                      label={t('roomType')}
                                      data={roomTypeOptions.filter(
                                        (opt) => opt.value === roomProfile?.roomType || !roomProfiles?.some((rp, i) => i !== index && rp.roomType === opt.value)
                                      )}
                                      value={roomTypeField.value}
                                      onChange={roomTypeField.onChange}
                                      onBlur={roomTypeField.onBlur}
                                      error={errors.roomProfiles?.[index]?.roomType?.message}
                                    />
                                  )}
                                />

                                <div>
                                  <Text size="sm" fw={500} mb="xs">
                                    {t('roomSpecificMaterials')}
                                  </Text>
                                  <Text size="xs" c="dimmed" mb="sm">
                                    {t('roomSpecificMaterialsDescription')}
                                  </Text>
                                  <Controller
                                    name={`roomProfiles.${index}.materials`}
                                    control={control}
                                    render={({ field }) => (
                                      <MultiSelect
                                        placeholder={t('materialId')}
                                        data={materialOptions}
                                        value={field.value || []}
                                        onChange={field.onChange}
                                        onBlur={field.onBlur}
                                        error={errors.roomProfiles?.[index]?.materials?.message}
                                        searchable
                                        clearable
                                      />
                                    )}
                                  />
                                </div>

                                {/* Room Profile Images */}
                                <Paper p="md" withBorder>
                                  <Text fw={500} size="sm" mb="md">
                                    {t('images') || 'Images'} ({tRoomTypes(roomProfile?.roomType || '')})
                                  </Text>
                                  <Controller
                                    name={`roomProfiles.${index}.images`}
                                    control={control}
                                    render={({ field }) => {
                                      // Filter out invalid blob URLs
                                      const validImages = (field.value || []).filter((url: string) => {
                                        if (url.startsWith('blob:')) {
                                          // Check if blob URL is still valid by trying to create a test object
                                          try {
                                            // If it's a blob URL, it should be from our pending files
                                            // We'll validate it when rendering, but filter obviously invalid ones here
                                            return true
                                          } catch {
                                            return false
                                          }
                                        }
                                        return true
                                      })

                                      return (
                                        <ImageUpload
                                          value={validImages}
                                          onChange={(images) => {
                                            // Filter out any invalid blob URLs before updating
                                            const filteredImages = images.filter((url: string) => {
                                              if (url.startsWith('blob:')) {
                                                try {
                                                  // Basic validation - if it's a blob URL, make sure it's valid format
                                                  return url.includes('blob:http')
                                                } catch {
                                                  return false
                                                }
                                              }
                                              return true
                                            })
                                            field.onChange(filteredImages)
                                            const updatedProfiles = [...(roomProfiles || [])]
                                            updatedProfiles[index] = {
                                              ...updatedProfiles[index],
                                              images: filteredImages,
                                            }
                                            setValue('roomProfiles', updatedProfiles)
                                          }}
                                          onPendingFilesChange={(files) => {
                                            setPendingRoomProfileFiles(prev => ({
                                              ...prev,
                                              [index]: files,
                                            }))
                                          }}
                                          entityType="style"
                                          entityId="" // Empty during creation - will upload after creation
                                          roomType={roomProfile?.roomType}
                                          maxImages={20}
                                          multiple
                                          error={errors.roomProfiles?.[index]?.images?.message}
                                        />
                                      )
                                    }}
                                  />
                                </Paper>
                              </Stack>
                            </Paper>
                          )
                        })}
                      </Stack>
                    )}
                  </MoodBCard>
                </Stack>
              </ScrollArea>
            </Tabs.Panel>
          </Tabs>

          {/* Submit Buttons */}
          <Group justify="flex-end">
            <Button
              variant="subtle"
              onClick={() => router.push(`/${locale}/admin/styles`)}
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
