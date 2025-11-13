'use client'

// FIX: Replaced barrel import with direct imports to improve compilation speed
// Barrel imports force compilation of ALL components (including heavy RichTextEditor, ImageUpload)
// Direct imports only compile what's needed
import { FormSection } from '@/components/ui/Form/FormSection'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { MoodBCard } from '@/components/ui/Card'
import { useImageUpload } from '@/hooks/useImageUpload'
import { useMaterials } from '@/hooks/useMaterials'
import { ROOM_TYPES } from '@/lib/validations/room'
import {
  createApproachFormSchema,
  updateApproachSchema,
  type CreateApproach,
  type UpdateApproach,
} from '@/lib/validations/approach'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  ActionIcon,
  Alert,
  Button,
  Group,
  MultiSelect,
  NumberInput,
  Paper,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { IconAlertCircle, IconArrowLeft, IconBox, IconHome, IconPalette, IconPlus, IconX } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'

interface ApproachFormProps {
  mode: 'create' | 'edit'
  locale: string
  styleId: string
  initialData?: any
  onSubmit: (data: CreateApproach | UpdateApproach) => Promise<any>
  onCancel: () => void
  isSubmitting?: boolean
  error?: Error | null
  title?: string
}

const objectIdRegex = /^[0-9a-fA-F]{24}$/

const isValidObjectId = (value: unknown): value is string =>
  typeof value === 'string' && objectIdRegex.test(value)

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

export function ApproachForm({
  mode,
  locale,
  styleId,
  initialData,
  onSubmit,
  onCancel,
  isSubmitting: externalIsSubmitting,
  error: externalError,
  title,
}: ApproachFormProps) {
  const t = useTranslations('admin.approaches.form')
  const tCommon = useTranslations('common')
  const tRoomTypes = useTranslations('projects.form.roomTypes')

  const formRef = useRef<HTMLFormElement>(null)
  const [activeTab, setActiveTab] = useState<string | null>('basic')
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [pendingApproachImages, setPendingApproachImages] = useState<File[]>([])
  const [pendingRoomImages, setPendingRoomImages] = useState<Map<number, File[]>>(new Map())
  const approachSyncedRef = useRef<string | null>(null)

  const { uploadImage } = useImageUpload()
  const { data: materialsData } = useMaterials({ page: 1, limit: 200 })
  const materials = materialsData?.data || []

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting: formIsSubmitting },
    watch,
    setValue,
    reset,
  } = useForm<CreateApproach | UpdateApproach>({
    // @ts-expect-error shared resolver between create/update
    resolver: zodResolver(mode === 'create' ? createApproachFormSchema : updateApproachSchema),
    mode: 'onChange',
    defaultValues: {
      name: { he: '', en: '' },
      slug: '',
      order: 0,
      images: [],
      materialSet: {
        defaults: [],
        alternatives: [],
      },
      roomProfiles: [],
      metadata: {
        isDefault: false,
        tags: [],
      },
    },
  })

  const isSubmitting = externalIsSubmitting ?? formIsSubmitting
  const roomProfiles = watch('roomProfiles')

  useEffect(() => {
    if (mode === 'edit' && initialData?.id) {
      const normalizedImages = sanitizeImages(initialData.images)
      const normalizedMaterialSet = {
        defaults: Array.isArray(initialData.materialSet?.defaults)
          ? initialData.materialSet.defaults.filter((item: any) => isValidObjectId(item?.materialId))
          : [],
        alternatives: Array.isArray(initialData.materialSet?.alternatives)
          ? initialData.materialSet.alternatives
          : [],
      }
      const normalizedRoomProfiles = Array.isArray(initialData.roomProfiles)
        ? initialData.roomProfiles.map((profile: any) => ({
            roomType: profile.roomType || '',
            materials: Array.isArray(profile.materials)
              ? profile.materials.filter((id: string) => isValidObjectId(id))
              : [],
            images: sanitizeImages(profile.images),
            constraints: profile.constraints || null,
          }))
        : []

      reset(
        {
          name: initialData.name || { he: '', en: '' },
          slug: initialData.slug || '',
          order: initialData.order ?? 0,
          images: normalizedImages,
          materialSet: normalizedMaterialSet,
          roomProfiles: normalizedRoomProfiles,
          metadata: {
            isDefault: initialData.metadata?.isDefault ?? false,
            version: initialData.metadata?.version ?? '1.0.0',
            tags: initialData.metadata?.tags ?? [],
            usage: initialData.metadata?.usage ?? 0,
          },
        },
        { keepDefaultValues: false }
      )
    }
  }, [initialData, mode, reset])

  const {
    fields: roomProfileFields,
    append: appendRoomProfile,
    remove: removeRoomProfile,
    replace: replaceRoomProfiles,
  } = useFieldArray({
    control,
    name: 'roomProfiles',
  })

  useEffect(() => {
    if (mode === 'edit' && initialData?.id && Array.isArray(initialData.roomProfiles)) {
      const approachId = initialData.id
      if (approachSyncedRef.current === approachId) return

      const normalizedRoomProfiles = initialData.roomProfiles.map((profile: any) => ({
        roomType: profile.roomType || '',
        materials: Array.isArray(profile.materials)
          ? profile.materials.filter((id: string) => isValidObjectId(id))
          : [],
        images: sanitizeImages(profile.images),
        constraints: profile.constraints || null,
      }))

      replaceRoomProfiles(normalizedRoomProfiles)
      approachSyncedRef.current = approachId
    } else if (mode === 'create') {
      approachSyncedRef.current = null
    }
  }, [mode, initialData, replaceRoomProfiles])

  const materialOptions = useMemo(
    () =>
      materials.map((material) => ({
        value: material.id,
        label: `${locale === 'he' ? material.name.he : material.name.en}${material.sku ? ` (${material.sku})` : ''}`,
        material,
      })),
    [materials, locale]
  )

  const roomTypeOptions = useMemo(
    () =>
      ROOM_TYPES.map((type) => ({
        value: type,
        label: tRoomTypes(type),
      })),
    [tRoomTypes]
  )

  const availableRoomTypes = useMemo(() => {
    const usedTypes = new Set(roomProfiles?.map((rp) => rp.roomType) || [])
    return roomTypeOptions.filter((opt) => !usedTypes.has(opt.value))
  }, [roomProfiles, roomTypeOptions])

  useEffect(() => {
    const messages: string[] = []
    if (errors.name?.he?.message) messages.push(errors.name.he.message)
    if (errors.name?.en?.message) messages.push(errors.name.en.message)
    if (errors.slug?.message) messages.push(errors.slug.message)
    if (errors.images?.message) messages.push(errors.images.message)

    if (errors.materialSet?.defaults?.message) messages.push(errors.materialSet.defaults.message)
    if (errors.roomProfiles && Array.isArray(errors.roomProfiles)) {
      errors.roomProfiles.forEach((roomError, index) => {
        if (roomError?.roomType?.message) {
          messages.push(`${t('roomProfiles')} ${index + 1}: ${roomError.roomType.message}`)
        }
      })
    }

    setValidationErrors(messages)
  }, [errors, t])

  const handleAddRoomProfile = () => {
    if (availableRoomTypes.length === 0) return
    const nextType = availableRoomTypes[0].value
    appendRoomProfile({
      roomType: nextType,
      materials: [],
      images: [],
    })
  }

  const handleFormSubmit = async (data: CreateApproach | UpdateApproach) => {
    const payload: CreateApproach | UpdateApproach = {
      ...data,
      images: mode === 'edit' ? data.images : sanitizeImages(data.images),
      materialSet: data.materialSet
        ? {
            defaults: Array.isArray(data.materialSet.defaults)
              ? data.materialSet.defaults.filter((item: any) => isValidObjectId(item?.materialId))
              : [],
            alternatives: Array.isArray(data.materialSet.alternatives)
              ? data.materialSet.alternatives.map((group: any) => ({
                  usageArea: group.usageArea,
                  alternatives: (group.alternatives || []).filter((id: string) => isValidObjectId(id)),
                }))
              : [],
          }
        : undefined,
      roomProfiles: Array.isArray(data.roomProfiles)
        ? data.roomProfiles.map((profile) => ({
            roomType: profile.roomType,
            materials: (profile.materials || []).filter((id: string) => isValidObjectId(id)),
            images: mode === 'edit' ? profile.images : sanitizeImages(profile.images),
            constraints: profile.constraints || null,
          }))
        : [],
    }

    const result = await onSubmit(payload)

    if (mode === 'create' && result && typeof result === 'object' && 'id' in result) {
      const approachId = (result as any).id as string
      const uploadedImages: string[] = []
      const uploadedRoomImages = new Map<number, string[]>()

      if (pendingApproachImages.length > 0) {
        for (const file of pendingApproachImages) {
          try {
            const url = await uploadImage({
              file,
              entityType: 'approach',
              entityId: approachId,
            })
            uploadedImages.push(url)
          } catch (err) {
            console.error('Failed to upload approach image', err)
          }
        }
      }

      for (const [index, files] of pendingRoomImages.entries()) {
        if (files.length === 0) continue
        const roomProfile = data.roomProfiles?.[index]
        const urls: string[] = []
        for (const file of files) {
          try {
            const url = await uploadImage({
              file,
              entityType: 'approach',
              entityId: approachId,
              roomType: roomProfile?.roomType,
            })
            urls.push(url)
          } catch (err) {
            console.error('Failed to upload room image', err)
          }
        }
        if (urls.length > 0) {
          uploadedRoomImages.set(index, urls)
        }
      }

      if (uploadedImages.length > 0 || uploadedRoomImages.size > 0) {
        const updatedRoomProfiles = (data.roomProfiles || []).map((profile: any, index: number) => {
          const currentImages = Array.isArray(profile.images) ? sanitizeImages(profile.images) : []
          const newImages = uploadedRoomImages.get(index) || []
          return {
            roomType: profile.roomType,
            materials: profile.materials || [],
            images: [...currentImages, ...newImages],
            constraints: profile.constraints || null,
          }
        })

        await fetch(`/api/admin/styles/${styleId}/approaches/${approachId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            images: [...(payload.images || []), ...uploadedImages],
            roomProfiles: updatedRoomProfiles,
          }),
        })
      }
    }
  }

  const onError = () => {
    setTimeout(() => {
      const firstErrorField = formRef.current?.querySelector(
        '[data-invalid="true"], .mantine-Input-error, .mantine-Select-error, [aria-invalid="true"]'
      )
      if (firstErrorField instanceof HTMLElement) {
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 50)
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit(handleFormSubmit, onError)}>
      <Stack gap="lg">
        <Group gap="md" align="center">
          <ActionIcon variant="subtle" onClick={onCancel}>
            <IconArrowLeft size={20} />
          </ActionIcon>
          <Title order={1} c="brand" style={{ flex: 1 }}>
            {title || (mode === 'create' ? t('title') : `${t('titleEdit')} - ${initialData?.name?.he || ''}`)}
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
            {externalError instanceof Error ? externalError.message : t('submitError')}
          </Alert>
        )}

        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="basic" leftSection={<IconPalette size={16} />}>
              {t('basicTab')}
            </Tabs.Tab>
            <Tabs.Tab value="materials" leftSection={<IconBox size={16} />}>
              {t('materialsTab')}
            </Tabs.Tab>
            <Tabs.Tab value="rooms" leftSection={<IconHome size={16} />}>
              {t('roomsTab')}
            </Tabs.Tab>
          </Tabs.List>

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

                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                    <TextInput
                      label={t('slug')}
                      placeholder="approach-slug"
                      {...register('slug')}
                      error={errors.slug?.message}
                      required
                    />
                    <Controller
                      name="order"
                      control={control}
                      render={({ field }) => (
                        <NumberInput
                          label={t('order')}
                          value={field.value as number}
                          onChange={(value) => field.onChange(value ?? 0)}
                          min={0}
                        />
                      )}
                    />
                  </SimpleGrid>

                  <Paper p="md" withBorder>
                    <Text fw={500} size="sm" mb="xs">
                      {t('images')}
                    </Text>
                    <Controller
                      name="images"
                      control={control}
                      render={({ field }) => (
                        <ImageUpload
                          value={field.value || []}
                          onChange={(images) => field.onChange(images)}
                          onPendingFilesChange={(files) => {
                            if (mode === 'create') {
                              setPendingApproachImages(files)
                            }
                          }}
                          entityType="approach"
                          entityId={mode === 'edit' ? initialData?.id || '' : ''}
                          maxImages={20}
                          multiple
                          error={errors.images?.message}
                        />
                      )}
                    />
                  </Paper>
                </FormSection>
              </Stack>
            </MoodBCard>
          </Tabs.Panel>

          <Tabs.Panel value="materials" pt="lg">
            <MoodBCard>
              <Stack gap="md">
                <FormSection title={t('generalMaterials')}>
                  <Text size="sm" c="dimmed" mb="sm">
                    {t('generalMaterialsDescription')}
                  </Text>
                  <Controller
                    name="materialSet.defaults"
                    control={control}
                    render={({ field: { value, onChange }, fieldState: { error } }) => (
                      <MultiSelect
                        label={t('materials')}
                        placeholder={t('selectMaterials')}
                        data={materialOptions}
                        value={
                          Array.isArray(value)
                            ? value.map((item: any) => (typeof item === 'string' ? item : item?.materialId)).filter(Boolean)
                            : []
                        }
                        onChange={(ids) =>
                          onChange(
                            ids.map((id) => ({
                              materialId: id,
                            }))
                          )
                        }
                        searchable
                        clearable
                        maxDropdownHeight={300}
                        error={error?.message}
                        renderOption={({ option }) => {
                          const materialOption = option as {
                            value: string
                            label: string
                            material?: any
                          }
                          const material = materialOption.material
                          if (!material) return <Text size="sm">{option.label}</Text>

                          return (
                            <Group gap="xs" wrap="nowrap">
                              <div style={{ flex: 1 }}>
                                <Text size="sm" fw={500}>
                                  {locale === 'he' ? material.name.he : material.name.en}
                                </Text>
                                <Text size="xs" c="dimmed" ff="monospace">
                                  {material.sku}
                                </Text>
                              </div>
                            </Group>
                          )
                        }}
                      />
                    )}
                  />
                </FormSection>
              </Stack>
            </MoodBCard>
          </Tabs.Panel>

          <Tabs.Panel value="rooms" pt="lg">
            <ScrollArea h={600}>
              <Stack gap="md">
                <MoodBCard>
                  <Group justify="space-between" mb="md">
                    <div>
                      <Text fw={500}>{t('roomProfiles')}</Text>
                      <Text size="sm" c="dimmed">
                        {t('roomProfilesDescription')}
                      </Text>
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

                        return (
                          <Paper key={field.id} p="md" withBorder>
                            <Stack gap="sm">
                              <Group justify="space-between">
                                <Text fw={500}>{tRoomTypes(roomProfile?.roomType || '')}</Text>
                                <ActionIcon color="red" variant="subtle" onClick={() => removeRoomProfile(index)}>
                                  <IconX size={16} />
                                </ActionIcon>
                              </Group>

                              <Controller
                                name={`roomProfiles.${index}.roomType`}
                                control={control}
                                render={({ field }) => (
                                  <Select
                                    {...field}
                                    label={t('roomType')}
                                    data={roomTypeOptions.filter(
                                      (opt) =>
                                        opt.value === roomProfile?.roomType ||
                                        !roomProfiles?.some((rp, i) => i !== index && rp.roomType === opt.value)
                                    )}
                                    error={errors.roomProfiles?.[index]?.roomType?.message}
                                  />
                                )}
                              />

                              <Controller
                                name={`roomProfiles.${index}.materials`}
                                control={control}
                                render={({ field }) => (
                                  <MultiSelect
                                    placeholder={t('selectMaterials')}
                                    data={materialOptions}
                                    value={field.value || []}
                                    onChange={field.onChange}
                                    onBlur={field.onBlur}
                                    error={errors.roomProfiles?.[index]?.materials?.message}
                                    searchable
                                    clearable
                                    renderOption={({ option }) => {
                                      const materialOption = option as {
                                        value: string
                                        label: string
                                        material?: any
                                      }
                                      const material = materialOption.material
                                      if (!material) return <Text size="sm">{option.label}</Text>

                                      return (
                                        <Group gap="xs" wrap="nowrap">
                                          <div style={{ flex: 1 }}>
                                            <Text size="sm" fw={500}>
                                              {locale === 'he' ? material.name.he : material.name.en}
                                            </Text>
                                            <Text size="xs" c="dimmed" ff="monospace">
                                              {material.sku}
                                            </Text>
                                          </div>
                                        </Group>
                                      )
                                    }}
                                  />
                                )}
                              />

                              <Paper p="md" withBorder>
                                <Text fw={500} size="sm" mb="xs">
                                  {t('images')} ({tRoomTypes(roomProfile?.roomType || '')})
                                </Text>
                                <Controller
                                  name={`roomProfiles.${index}.images`}
                                  control={control}
                                  render={({ field }) => (
                                    <ImageUpload
                                      value={field.value || []}
                                      onChange={(images) => field.onChange(images)}
                                      onPendingFilesChange={(files) => {
                                        if (mode === 'create') {
                                          setPendingRoomImages((prev) => {
                                            const next = new Map(prev)
                                            next.set(index, files)
                                            return next
                                          })
                                        }
                                      }}
                                      entityType="approach"
                                      entityId={mode === 'edit' ? initialData?.id || '' : ''}
                                      roomType={roomProfile?.roomType}
                                      maxImages={20}
                                      multiple
                                      error={errors.roomProfiles?.[index]?.images?.message}
                                    />
                                  )}
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
      </Stack>
    </form>
  )
}

