'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Drawer,
  Stack,
  TextInput,
  Textarea,
  MultiSelect,
  Button,
  Group,
  Divider,
  Collapse,
  Text,
  NumberInput,
} from '@mantine/core'
import { IconChevronDown, IconChevronUp } from '@tabler/icons-react'
import { createClientSchema, type CreateClientInput } from '@/lib/validations/client'
import { PREDEFINED_TAGS } from '@/lib/validations/client'
// FIX: Replaced barrel import with direct imports to improve compilation speed
// Barrel imports force compilation of ALL components (including heavy RichTextEditor, ImageUpload)
// Direct imports only compile what's needed
import { FormSection } from '@/components/ui/Form/FormSection'

interface ClientFormDrawerProps {
  opened: boolean
  onClose: () => void
  onSuccess: () => void
  editData?: any // For edit mode
}

export function ClientFormDrawer({
  opened,
  onClose,
  onSuccess,
  editData,
}: ClientFormDrawerProps) {
  const t = useTranslations('clients.form')
  const tCommon = useTranslations('common')
  const tTags = useTranslations('clients.tags')
  const tClients = useTranslations('clients')
  
  const [showPreferences, setShowPreferences] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // React Hook Form with Zod validation
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateClientInput>({
    resolver: zodResolver(createClientSchema),
    defaultValues: editData || {
      name: '',
      contact: {
        email: '',
        phone: '',
        address: '',
        city: '',
        country: '',
      },
      tags: [],
      preferences: {
        budgetRange: {
          min: 0,
          max: 0,
        },
        specialNeeds: '',
      },
    },
  })

  // Reset form when editData changes
  useEffect(() => {
    if (editData && opened) {
      // Reset form with edit data
      reset({
        name: editData.name || '',
        contact: {
          email: editData.contact?.email || '',
          phone: editData.contact?.phone || '',
          address: editData.contact?.address || '',
          city: editData.contact?.city || '',
          country: editData.contact?.country || '',
        },
        tags: editData.tags || [],
        preferences: {
          budgetRange: {
            min: editData.preferences?.budgetRange?.min || 0,
            max: editData.preferences?.budgetRange?.max || 0,
          },
          specialNeeds: editData.preferences?.specialNeeds || '',
        },
      })
    } else if (!editData && opened) {
      // Reset to empty form for create
      reset({
        name: '',
        contact: {
          email: '',
          phone: '',
          address: '',
          city: '',
          country: '',
        },
        tags: [],
        preferences: {
          budgetRange: {
            min: 0,
            max: 0,
          },
          specialNeeds: '',
        },
      })
    }
  }, [editData, opened, reset])

  // Tag options (predefined + custom)
  const tagOptions = PREDEFINED_TAGS.map((tag) => ({
    value: tag,
    label: tTags(tag),
  }))

  const onSubmit = async (data: CreateClientInput) => {
    setIsSubmitting(true)
    try {
      const url = editData
        ? `/api/clients/${editData.id}`
        : '/api/clients'
      
      const method = editData ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Failed to save client')
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
      name: '',
      contact: {
        email: '',
        phone: '',
        address: '',
        city: '',
        country: '',
      },
      tags: [],
      preferences: {
        budgetRange: {
          min: 0,
          max: 0,
        },
        specialNeeds: '',
      },
    })
    onClose()
  }

  return (
    <Drawer
      opened={opened}
      onClose={handleClose}
      title={editData ? tClients('editClient') : tClients('addClient')}
      position="right"
      size="lg"
      padding="md"
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack gap="lg">
          {/* Basic Info */}
          <FormSection>
            <TextInput
              label={t('name')}
              placeholder={t('namePlaceholder')}
              required
              error={errors.name?.message}
              {...register('name')}
            />

            <TextInput
              label={t('email')}
              placeholder={t('emailPlaceholder')}
              type="email"
              required
              error={errors.contact?.email?.message}
              {...register('contact.email')}
            />

            <TextInput
              label={t('phone')}
              placeholder={t('phonePlaceholder')}
              error={errors.contact?.phone?.message}
              {...register('contact.phone')}
            />
          </FormSection>

          <Divider />

          {/* Address (Optional) */}
          <FormSection>
            <TextInput
              label={t('address')}
              placeholder={t('addressPlaceholder')}
              {...register('contact.address')}
            />

            <Group grow>
              <TextInput
                label={t('city')}
                placeholder={t('cityPlaceholder')}
                {...register('contact.city')}
              />

              <TextInput
                label={t('country')}
                placeholder={t('countryPlaceholder')}
                {...register('contact.country')}
              />
            </Group>
          </FormSection>

          <Divider />

          {/* Tags */}
          <FormSection>
            <Controller
              name="tags"
              control={control}
              render={({ field }) => (
                <MultiSelect
                  label={t('tags')}
                  placeholder={t('tagsPlaceholder')}
                  data={tagOptions}
                  value={field.value}
                  onChange={field.onChange}
                  searchable
                  creatable
                  getCreateLabel={(query) => `+ ${query}`}
                />
              )}
            />
          </FormSection>

          <Divider />

          {/* Preferences (Collapsible) */}
          <FormSection>
            <Group
              justify="space-between"
              style={{ cursor: 'pointer' }}
              onClick={() => setShowPreferences(!showPreferences)}
            >
              <Text fw={500}>{t('preferences')}</Text>
              {showPreferences ? (
                <IconChevronUp size={16} />
              ) : (
                <IconChevronDown size={16} />
              )}
            </Group>

            <Collapse in={showPreferences}>
              <Stack gap="md" mt="md">
                <Text size="sm" fw={500}>
                  {t('budgetRange')}
                </Text>
                <Group grow>
                  <Controller
                    name="preferences.budgetRange.min"
                    control={control}
                    render={({ field }) => (
                      <NumberInput
                        label={t('budgetMin')}
                        min={0}
                        value={field.value}
                        onChange={field.onChange}
                        thousandSeparator=","
                      />
                    )}
                  />

                  <Controller
                    name="preferences.budgetRange.max"
                    control={control}
                    render={({ field }) => (
                      <NumberInput
                        label={t('budgetMax')}
                        min={0}
                        value={field.value}
                        onChange={field.onChange}
                        thousandSeparator=","
                      />
                    )}
                  />
                </Group>

                <Textarea
                  label={t('specialNeeds')}
                  placeholder={t('specialNeedsPlaceholder')}
                  minRows={3}
                  {...register('preferences.specialNeeds')}
                />
              </Stack>
            </Collapse>
          </FormSection>

          {/* Actions */}
          <Group justify="flex-end" mt="xl">
            <Button variant="subtle" onClick={handleClose} disabled={isSubmitting}>
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
