/**
 * Admin Organizations Management Page
 * Manage platform organizations
 */

'use client'

import { useState, useEffect } from 'react'
import { Container, Title, Group, Stack, TextInput, Button, Text, SimpleGrid, Select, Alert, ActionIcon, Menu } from '@mantine/core'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import { IconSearch, IconPlus, IconAlertCircle, IconDots, IconEdit, IconTrash } from '@tabler/icons-react'
import { MoodBCard, MoodBTable, MoodBTableHead, MoodBTableBody, MoodBTableRow, MoodBTableHeader, MoodBTableCell, EmptyState, LoadingState, ErrorState, MoodBModal, FormSection, ConfirmDialog } from '@/components/ui'
import { useOrganizations, useCreateOrganization, useUpdateOrganization, useDeleteOrganization, useOrganization } from '@/hooks/useOrganizations'
import { CreateOrganization, UpdateOrganization } from '@/lib/validations/organization'
import { zodResolver } from '@hookform/resolvers/zod'
import { createOrganizationSchema, updateOrganizationSchema } from '@/lib/validations/organization'
import { useForm, Controller } from 'react-hook-form'

export default function AdminOrganizationsPage() {
  const t = useTranslations('admin.organizations')
  const tCommon = useTranslations('common')
  const params = useParams()
  const locale = params.locale as string

  const [search, setSearch] = useState('')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteOrgId, setDeleteOrgId] = useState<string | null>(null)
  const [editingOrgId, setEditingOrgId] = useState<string | null>(null)

  const { data, isLoading, error } = useOrganizations()
  const createMutation = useCreateOrganization()
  const updateMutation = useUpdateOrganization()
  const deleteMutation = useDeleteOrganization()
  const { data: editingOrgData } = useOrganization(editingOrgId)

  // Create form
  const createForm = useForm<CreateOrganization>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: {
      name: '',
      slug: '',
      settings: {
        locale: 'he',
        currency: 'ILS',
        units: 'metric',
        brand: {
          primaryColor: '#df2538',
          backgroundColor: '#f7f7ed',
        },
      },
    },
  })

  // Edit form
  const editForm = useForm<UpdateOrganization>({
    resolver: zodResolver(updateOrganizationSchema),
    defaultValues: {
      name: '',
      slug: '',
      settings: {
        locale: 'he',
        currency: 'ILS',
        units: 'metric',
        brand: {
          primaryColor: '#df2538',
          backgroundColor: '#f7f7ed',
        },
      },
    },
  })

  // Watch name to auto-generate slug for create form
  const createNameValue = createForm.watch('name')
  
  // Watch name to auto-generate slug for edit form
  const editNameValue = editForm.watch('name')

  // Filter organizations by search
  const filteredOrganizations = data?.data?.filter((org) =>
    org.name.toLowerCase().includes(search.toLowerCase()) ||
    org.slug.toLowerCase().includes(search.toLowerCase())
  ) || []

  const onSubmitCreate = async (formData: CreateOrganization) => {
    try {
      await createMutation.mutateAsync(formData)
      createForm.reset()
      setCreateModalOpen(false)
    } catch (error) {
      console.error('Error creating organization:', error)
    }
  }

  const onSubmitEdit = async (formData: UpdateOrganization) => {
    if (!editingOrgId) return
    
    try {
      await updateMutation.mutateAsync({ id: editingOrgId, data: formData })
      editForm.reset()
      setEditModalOpen(false)
      setEditingOrgId(null)
    } catch (error) {
      console.error('Error updating organization:', error)
    }
  }

  const handleCancelCreate = () => {
    createForm.reset()
    setCreateModalOpen(false)
  }

  const handleCancelEdit = () => {
    editForm.reset()
    setEditModalOpen(false)
    setEditingOrgId(null)
  }

  const handleEdit = (orgId: string) => {
    setEditingOrgId(orgId)
    setEditModalOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteOrgId) return
    
    try {
      await deleteMutation.mutateAsync(deleteOrgId)
      setDeleteOrgId(null)
    } catch (error) {
      console.error('Error deleting organization:', error)
    }
  }

  // Load organization data into edit form when editing
  useEffect(() => {
    if (editingOrgData?.data && editModalOpen) {
      const org = editingOrgData.data
      editForm.reset({
        name: org.name,
        slug: org.slug,
        settings: org.settings || {
          locale: 'he',
          currency: 'ILS',
          units: 'metric',
          brand: {
            primaryColor: '#df2538',
            backgroundColor: '#f7f7ed',
          },
        },
      })
    }
  }, [editingOrgData, editModalOpen, editForm])

  // Auto-generate slug from name for create form
  useEffect(() => {
    if (createNameValue) {
      const slug = createNameValue
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
      createForm.setValue('slug', slug)
    }
  }, [createNameValue, createForm])

  // Auto-generate slug from name for edit form (only if slug is empty or matches old name)
  useEffect(() => {
    if (editNameValue && editingOrgData?.data) {
      const currentSlug = editForm.getValues('slug')
      const oldName = editingOrgData.data.name
      
      // Only auto-generate if slug matches the old name's slug or is empty
      const oldSlug = oldName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
      
      if (!currentSlug || currentSlug === oldSlug) {
        const newSlug = editNameValue
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
        editForm.setValue('slug', newSlug)
      }
    }
  }, [editNameValue, editingOrgData, editForm])

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        {/* Header */}
        <div>
          <Group justify="space-between" align="flex-start">
            <div>
              <Title order={1} c="brand" mb="sm">
                {t('title')}
              </Title>
              <Text c="dimmed" size="lg">
                {t('description')}
              </Text>
            </div>
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => setCreateModalOpen(true)}
              color="brand"
            >
              {t('createNew')}
            </Button>
          </Group>
        </div>

        {/* Filters */}
        <MoodBCard>
          <TextInput
            placeholder={t('searchPlaceholder')}
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </MoodBCard>

        {/* Table */}
        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={tCommon('error')} />
        ) : !filteredOrganizations || filteredOrganizations.length === 0 ? (
          <EmptyState
            title={t('noOrganizations')}
            description={t('noOrganizationsDescription')}
          />
        ) : (
          <MoodBCard>
            <MoodBTable>
              <MoodBTableHead>
                <MoodBTableRow>
                  <MoodBTableHeader>{t('table.name')}</MoodBTableHeader>
                  <MoodBTableHeader>{t('table.slug')}</MoodBTableHeader>
                  <MoodBTableHeader>{t('table.createdAt')}</MoodBTableHeader>
                  <MoodBTableHeader>{t('table.updatedAt')}</MoodBTableHeader>
                  <MoodBTableHeader style={{ width: 50 }}>{t('table.actions')}</MoodBTableHeader>
                </MoodBTableRow>
              </MoodBTableHead>
              <MoodBTableBody>
                {filteredOrganizations.map((org) => (
                  <MoodBTableRow key={org.id}>
                    <MoodBTableCell>
                      <Text fw={500} size="sm">
                        {org.name}
                      </Text>
                    </MoodBTableCell>
                    <MoodBTableCell>
                      <Text size="sm" c="dimmed" ff="monospace">
                        {org.slug}
                      </Text>
                    </MoodBTableCell>
                    <MoodBTableCell>
                      <Text size="sm">
                        {org.createdAt
                          ? new Date(org.createdAt).toLocaleDateString(locale)
                          : '-'}
                      </Text>
                    </MoodBTableCell>
                    <MoodBTableCell>
                      <Text size="sm">
                        {org.updatedAt
                          ? new Date(org.updatedAt).toLocaleDateString(locale)
                          : '-'}
                      </Text>
                    </MoodBTableCell>
                    <MoodBTableCell>
                      <Menu shadow="md" width={200}>
                        <Menu.Target>
                          <ActionIcon variant="subtle" color="brand">
                            <IconDots size={16} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item
                            leftSection={<IconEdit size={16} />}
                            onClick={() => handleEdit(org.id)}
                          >
                            {tCommon('edit')}
                          </Menu.Item>
                          <Menu.Divider />
                          <Menu.Item
                            leftSection={<IconTrash size={16} />}
                            color="red"
                            onClick={() => setDeleteOrgId(org.id)}
                          >
                            {tCommon('delete')}
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    </MoodBTableCell>
                  </MoodBTableRow>
                ))}
              </MoodBTableBody>
            </MoodBTable>
          </MoodBCard>
        )}

        {/* Create Organization Modal */}
        <MoodBModal
          opened={createModalOpen}
          onClose={handleCancelCreate}
          title={t('createNew')}
          size="lg"
        >
          <form onSubmit={createForm.handleSubmit(onSubmitCreate)}>
            <Stack gap="lg">
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

              {/* Validation Errors */}
              {Object.keys(createForm.formState.errors).length > 0 && (
                <Alert
                  icon={<IconAlertCircle size={16} />}
                  title={t('validationErrors')}
                  color="red"
                >
                  <ul style={{ margin: 0, paddingInlineStart: '1.5rem' }}>
                    {createForm.formState.errors.name && <li>Name: {createForm.formState.errors.name.message}</li>}
                    {createForm.formState.errors.slug && <li>Slug: {createForm.formState.errors.slug.message}</li>}
                  </ul>
                </Alert>
              )}

              {/* Basic Information */}
              <FormSection title={t('basicInfo')}>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                  <TextInput
                    label={t('name')}
                    placeholder={t('namePlaceholder')}
                    {...createForm.register('name')}
                    error={createForm.formState.errors.name?.message}
                    required
                  />
                  <TextInput
                    label={t('slug')}
                    placeholder={t('slugPlaceholder')}
                    {...createForm.register('slug')}
                    error={createForm.formState.errors.slug?.message}
                    required
                  />
                </SimpleGrid>
              </FormSection>

              {/* Settings */}
              <FormSection title={t('settings')}>
                <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                  <Controller
                    name="settings.locale"
                    control={createForm.control}
                    render={({ field }) => (
                      <Select
                        label={t('locale')}
                        data={[
                          { value: 'he', label: 'עברית (Hebrew)' },
                          { value: 'en', label: 'English' },
                          { value: 'ar', label: 'العربية (Arabic)' },
                        ]}
                        {...field}
                      />
                    )}
                  />
                  <Controller
                    name="settings.currency"
                    control={createForm.control}
                    render={({ field }) => (
                      <Select
                        label={t('currency')}
                        data={[
                          { value: 'ILS', label: 'ILS (₪)' },
                          { value: 'USD', label: 'USD ($)' },
                          { value: 'EUR', label: 'EUR (€)' },
                        ]}
                        {...field}
                      />
                    )}
                  />
                  <Controller
                    name="settings.units"
                    control={createForm.control}
                    render={({ field }) => (
                      <Select
                        label={t('units')}
                        data={[
                          { value: 'metric', label: t('metric') },
                          { value: 'imperial', label: t('imperial') },
                        ]}
                        {...field}
                      />
                    )}
                  />
                </SimpleGrid>
              </FormSection>

              {/* Actions */}
              <Group justify="flex-end">
                <Button variant="subtle" onClick={handleCancelCreate}>
                  {tCommon('cancel')}
                </Button>
                <Button
                  type="submit"
                  color="brand"
                  loading={createMutation.isPending || createForm.formState.isSubmitting}
                  disabled={createMutation.isPending || createForm.formState.isSubmitting}
                >
                  {t('create')}
                </Button>
              </Group>
            </Stack>
          </form>
        </MoodBModal>

        {/* Edit Organization Modal */}
        <MoodBModal
          opened={editModalOpen}
          onClose={handleCancelEdit}
          title={t('editOrganization')}
          size="lg"
        >
          {editingOrgData?.data ? (
            <form onSubmit={editForm.handleSubmit(onSubmitEdit)}>
              <Stack gap="lg">
                {/* Error Alert */}
                {updateMutation.isError && (
                  <Alert
                    icon={<IconAlertCircle size={16} />}
                    title={tCommon('error')}
                    color="red"
                  >
                    {updateMutation.error instanceof Error
                      ? updateMutation.error.message
                      : t('updateErrorMessage')}
                  </Alert>
                )}

                {/* Validation Errors */}
                {Object.keys(editForm.formState.errors).length > 0 && (
                  <Alert
                    icon={<IconAlertCircle size={16} />}
                    title={t('validationErrors')}
                    color="red"
                  >
                    <ul style={{ margin: 0, paddingInlineStart: '1.5rem' }}>
                      {editForm.formState.errors.name && <li>Name: {editForm.formState.errors.name.message}</li>}
                      {editForm.formState.errors.slug && <li>Slug: {editForm.formState.errors.slug.message}</li>}
                    </ul>
                  </Alert>
                )}

                {/* Basic Information */}
                <FormSection title={t('basicInfo')}>
                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                    <TextInput
                      label={t('name')}
                      placeholder={t('namePlaceholder')}
                      {...editForm.register('name')}
                      error={editForm.formState.errors.name?.message}
                    />
                    <TextInput
                      label={t('slug')}
                      placeholder={t('slugPlaceholder')}
                      {...editForm.register('slug')}
                      error={editForm.formState.errors.slug?.message}
                    />
                  </SimpleGrid>
                </FormSection>

                {/* Settings */}
                <FormSection title={t('settings')}>
                  <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                    <Controller
                      name="settings.locale"
                      control={editForm.control}
                      render={({ field }) => (
                        <Select
                          label={t('locale')}
                          data={[
                            { value: 'he', label: 'עברית (Hebrew)' },
                            { value: 'en', label: 'English' },
                            { value: 'ar', label: 'العربية (Arabic)' },
                          ]}
                          {...field}
                        />
                      )}
                    />
                    <Controller
                      name="settings.currency"
                      control={editForm.control}
                      render={({ field }) => (
                        <Select
                          label={t('currency')}
                          data={[
                            { value: 'ILS', label: 'ILS (₪)' },
                            { value: 'USD', label: 'USD ($)' },
                            { value: 'EUR', label: 'EUR (€)' },
                          ]}
                          {...field}
                        />
                      )}
                    />
                    <Controller
                      name="settings.units"
                      control={editForm.control}
                      render={({ field }) => (
                        <Select
                          label={t('units')}
                          data={[
                            { value: 'metric', label: t('metric') },
                            { value: 'imperial', label: t('imperial') },
                          ]}
                          {...field}
                        />
                      )}
                    />
                  </SimpleGrid>
                </FormSection>

                {/* Actions */}
                <Group justify="flex-end">
                  <Button variant="subtle" onClick={handleCancelEdit}>
                    {tCommon('cancel')}
                  </Button>
                  <Button
                    type="submit"
                    color="brand"
                    loading={updateMutation.isPending || editForm.formState.isSubmitting}
                    disabled={updateMutation.isPending || editForm.formState.isSubmitting}
                  >
                    {tCommon('save')}
                  </Button>
                </Group>
              </Stack>
            </form>
          ) : (
            <LoadingState />
          )}
        </MoodBModal>

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          opened={!!deleteOrgId}
          onClose={() => setDeleteOrgId(null)}
          onConfirm={handleDelete}
          title={t('deleteOrganization')}
          message={t('deleteOrganizationMessage')}
          confirmLabel={tCommon('delete')}
          cancelLabel={tCommon('cancel')}
          loading={deleteMutation.isPending}
          danger
        />
      </Stack>
    </Container>
  )
}

