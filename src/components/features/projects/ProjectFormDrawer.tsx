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
  Group,
  Divider,
  Collapse,
  Text,
  NumberInput,
  Alert,
} from '@mantine/core'
import { IconChevronDown, IconChevronUp, IconInfoCircle } from '@tabler/icons-react'
import { createProjectSchema, type CreateProject } from '@/lib/validations/project'
// FIX: Replaced barrel import with direct imports to improve compilation speed
// Barrel imports force compilation of ALL components (including heavy RichTextEditor, ImageUpload)
// Direct imports only compile what's needed
import { FormSection } from '@/components/ui/Form/FormSection'
import { useClients } from '@/hooks/useClients'
import { useCreateProject, useUpdateProject } from '@/hooks/useProjects'

interface ProjectFormDrawerProps {
  opened: boolean
  onClose: () => void
  onSuccess: () => void
  project?: any // For edit mode
}

export function ProjectFormDrawer({
  opened,
  onClose,
  onSuccess,
  project,
}: ProjectFormDrawerProps) {
  const t = useTranslations('projects.form')
  const tStatus = useTranslations('projects.status')
  const tCommon = useTranslations('common')
  const tProjects = useTranslations('projects')

  const [showBudget, setShowBudget] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Fetch clients for dropdown
  const { data: clientsData } = useClients({ limit: 100 })

  // Mutations
  const createMutation = useCreateProject()
  const updateMutation = useUpdateProject()

  // React Hook Form with Zod validation
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<CreateProject>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: project || {
      name: '',
      clientId: '',
      status: 'draft',
      budget: {
        currency: 'ILS',
        target: {
          min: 0,
          max: 0,
        },
      },
    },
  })

  // Reset form when project changes
  useEffect(() => {
    if (project && opened) {
      reset({
        name: project.name || '',
        clientId: project.clientId || '',
        status: project.status || 'draft',
        budget: project.budget || {
          currency: 'ILS',
          target: {
            min: 0,
            max: 0,
          },
        },
      })
      setShowBudget(!!project.budget)
    } else if (!project && opened) {
      reset({
        name: '',
        clientId: '',
        status: 'draft',
        budget: {
          currency: 'ILS',
          target: {
            min: 0,
            max: 0,
          },
        },
      })
      setShowBudget(false)
    }
  }, [project, opened, reset])

  const onSubmit = async (data: CreateProject) => {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      if (project) {
        // Update existing project
        await updateMutation.mutateAsync({
          id: project.id,
          data,
        })
      } else {
        // Create new project
        await createMutation.mutateAsync(data)
      }

      onSuccess()
      reset()
    } catch (error: any) {
      console.error('Submit error:', error)
      setSubmitError(error.message || 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Client options for dropdown
  const clientOptions = clientsData?.data.map(client => ({
    value: client.id,
    label: client.name,
  })) || []

  // Status options
  const statusOptions = [
    { value: 'draft', label: tStatus('draft') },
    { value: 'active', label: tStatus('active') },
    { value: 'review', label: tStatus('review') },
    { value: 'approved', label: tStatus('approved') },
    { value: 'completed', label: tStatus('completed') },
    { value: 'archived', label: tStatus('archived') },
  ]

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title={project ? tProjects('editProject') : tProjects('createProject')}
      position="left"
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack gap="md">
          {/* Project Info Section */}
          <FormSection title={t('projectInfo')}>
            <Stack gap="sm">
              {/* Project Name */}
              <TextInput
                label={t('name')}
                placeholder={t('namePlaceholder')}
                required
                error={errors.name?.message}
                {...register('name')}
              />

              {/* Client Selection */}
              <Controller
                name="clientId"
                control={control}
                render={({ field }) => (
                  <Select
                    label={t('client')}
                    placeholder={t('clientPlaceholder')}
                    data={clientOptions}
                    required
                    error={errors.clientId?.message}
                    searchable
                    clearable
                    nothingFoundMessage={tCommon('noData')}
                    maxDropdownHeight={200}
                    disabled={!!project} // Don't allow changing client on edit
                    {...field}
                  />
                )}
              />

              {/* Status */}
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select
                    label={t('status')}
                    placeholder={t('statusPlaceholder')}
                    data={statusOptions}
                    required
                    error={errors.status?.message}
                    {...field}
                  />
                )}
              />
            </Stack>
          </FormSection>

          <Divider />

          {/* Budget Section (Collapsible) */}
          <div>
            <Button
              variant="subtle"
              rightSection={showBudget ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
              onClick={() => setShowBudget(!showBudget)}
              fullWidth
              style={{ justifyContent: 'space-between' }}
            >
              {t('budget')}
            </Button>
            <Collapse in={showBudget}>
              <Stack gap="sm" mt="sm">
                <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
                  <Text size="sm">{t('budgetMin')}</Text>
                </Alert>

                <Controller
                  name="budget.target.min"
                  control={control}
                  render={({ field }) => (
                    <NumberInput
                      label={t('budgetMin')}
                      placeholder="0"
                      min={0}
                      {...field}
                    />
                  )}
                />

                <Controller
                  name="budget.target.max"
                  control={control}
                  render={({ field }) => (
                    <NumberInput
                      label={t('budgetMax')}
                      placeholder="0"
                      min={0}
                      {...field}
                    />
                  )}
                />

                <Controller
                  name="budget.currency"
                  control={control}
                  render={({ field }) => (
                    <Select
                      label={t('budgetCurrency')}
                      data={[
                        { value: 'ILS', label: 'ILS (₪)' },
                        { value: 'USD', label: 'USD ($)' },
                        { value: 'EUR', label: 'EUR (€)' },
                      ]}
                      {...field}
                    />
                  )}
                />
              </Stack>
            </Collapse>
          </div>

          {/* Error Message */}
          {submitError && (
            <Alert color="red" variant="filled">
              {submitError}
            </Alert>
          )}

          {/* Action Buttons */}
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={onClose}>
              {tCommon('cancel')}
            </Button>
            <Button type="submit" loading={isSubmitting} color="#df2538">
              {project ? tCommon('save') : tCommon('create')}
            </Button>
          </Group>
        </Stack>
      </form>
    </Drawer>
  )
}
