'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Drawer,
  Stack,
  TextInput,
  Select,
  Button,
  Collapse,
  Textarea,
  SimpleGrid,
  NumberInput,
  Alert,
} from '@mantine/core'
import { IconChevronDown, IconChevronUp, IconInfoCircle } from '@tabler/icons-react'
import { createRoomSchema, ROOM_TYPES, DIMENSION_UNITS, type CreateRoom } from '@/lib/validations/room'
// FIX: Replaced barrel import with direct imports to improve compilation speed
// Barrel imports force compilation of ALL components (including heavy RichTextEditor, ImageUpload)
// Direct imports only compile what's needed
import { FormSection } from '@/components/ui/Form/FormSection'
import { useAddRoom, useUpdateRoom } from '@/hooks/useRooms'

interface RoomFormDrawerProps {
  projectId: string
  opened: boolean
  onClose: () => void
  onSuccess: () => void
  room?: any // For edit mode
}

export function RoomFormDrawer({
  projectId,
  opened,
  onClose,
  onSuccess,
  room,
}: RoomFormDrawerProps) {
  const t = useTranslations('projects.form')
  const tCommon = useTranslations('common')

  const [showDimensions, setShowDimensions] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const isEditMode = !!room

  // Mutations
  const addRoomMutation = useAddRoom(projectId)
  const updateRoomMutation = useUpdateRoom(projectId)

  // Form setup
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateRoom>({
    resolver: zodResolver(createRoomSchema),
    defaultValues: {
      name: '',
      type: 'living',
      dimensions: undefined,
      notes: '',
    },
  })

  // Load room data for edit mode
  useEffect(() => {
    if (room && opened) {
      reset({
        name: room.name || '',
        type: room.type || 'living',
        dimensions: room.dimensions || undefined,
        notes: room.notes || '',
      })
      setShowDimensions(!!room.dimensions)
    } else if (!opened) {
      // Reset form when drawer closes
      reset({
        name: '',
        type: 'living',
        dimensions: undefined,
        notes: '',
      })
      setShowDimensions(false)
      setSubmitError(null)
    }
  }, [room, opened, reset])

  // Handle form submission
  const onSubmit = async (data: CreateRoom) => {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      if (isEditMode) {
        await updateRoomMutation.mutateAsync({
          roomId: room.id,
          data: {
            ...data,
            id: room.id,
          },
        })
      } else {
        await addRoomMutation.mutateAsync(data)
      }

      onSuccess()
      onClose()
    } catch (error: any) {
      setSubmitError(error.message || (isEditMode ? 'Failed to update room' : 'Failed to add room'))
    } finally {
      setIsSubmitting(false)
    }
  }

  // Room type options
  const roomTypeOptions = ROOM_TYPES.map((type) => ({
    value: type,
    label: t(`roomTypes.${type}`),
  }))

  // Unit options
  const unitOptions = DIMENSION_UNITS.map((unit) => ({
    value: unit,
    label: unit,
  }))

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title={isEditMode ? t('editRoom') : t('addRoom')}
      position="right"
      size="lg"
      padding="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack gap="md">
          {/* Error Alert */}
          {submitError && (
            <Alert icon={<IconInfoCircle size={16} />} color="red" title="Error">
              {submitError}
            </Alert>
          )}

          {/* Room Info Section */}
          <FormSection title={t('roomInfo')}>
            <Stack gap="md">
              {/* Room Name */}
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <TextInput
                    {...field}
                    label={t('roomName')}
                    placeholder={t('roomNamePlaceholder')}
                    required
                    error={errors.name?.message}
                  />
                )}
              />

              {/* Room Type */}
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    label={t('roomType')}
                    placeholder={t('roomTypePlaceholder')}
                    data={roomTypeOptions}
                    required
                    error={errors.type?.message}
                  />
                )}
              />

              {/* Notes */}
              <Controller
                name="notes"
                control={control}
                render={({ field }) => (
                  <Textarea
                    {...field}
                    value={field.value || ''}
                    label={t('notes')}
                    placeholder={t('notesPlaceholder')}
                    rows={3}
                    error={errors.notes?.message}
                  />
                )}
              />
            </Stack>
          </FormSection>

          {/* Dimensions Section (Collapsible) */}
          <Button
            variant="subtle"
            onClick={() => setShowDimensions(!showDimensions)}
            rightSection={showDimensions ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
            fullWidth
          >
            {t('roomDimensions')} ({tCommon('optional')})
          </Button>

          <Collapse in={showDimensions}>
            <FormSection>
              <Stack gap="md">
                <SimpleGrid cols={3}>
                  {/* Length */}
                  <Controller
                    name="dimensions.length"
                    control={control}
                    render={({ field }) => (
                      <NumberInput
                        {...field}
                        label={t('length')}
                        placeholder="0"
                        min={0}
                        step={0.1}
                        error={errors.dimensions?.length?.message}
                      />
                    )}
                  />

                  {/* Width */}
                  <Controller
                    name="dimensions.width"
                    control={control}
                    render={({ field }) => (
                      <NumberInput
                        {...field}
                        label={t('width')}
                        placeholder="0"
                        min={0}
                        step={0.1}
                        error={errors.dimensions?.width?.message}
                      />
                    )}
                  />

                  {/* Height */}
                  <Controller
                    name="dimensions.height"
                    control={control}
                    render={({ field }) => (
                      <NumberInput
                        {...field}
                        label={t('height')}
                        placeholder="0"
                        min={0}
                        step={0.1}
                        error={errors.dimensions?.height?.message}
                      />
                    )}
                  />
                </SimpleGrid>

                {/* Unit */}
                <Controller
                  name="dimensions.unit"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      label={t('unit')}
                      placeholder={t('unitPlaceholder')}
                      data={unitOptions}
                      error={errors.dimensions?.unit?.message}
                    />
                  )}
                />
              </Stack>
            </FormSection>
          </Collapse>

          {/* Form Actions */}
          <Stack gap="sm" mt="md">
            <Button type="submit" loading={isSubmitting} fullWidth>
              {isEditMode ? tCommon('save') : t('addRoom')}
            </Button>
            <Button variant="light" onClick={onClose} fullWidth disabled={isSubmitting}>
              {tCommon('cancel')}
            </Button>
          </Stack>
        </Stack>
      </form>
    </Drawer>
  )
}
