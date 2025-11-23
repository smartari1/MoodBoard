/**
 * Room Categories Table Component
 * Manages CRUD operations for room categories (Private, Public, Commercial, etc.)
 */

'use client'

import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { MoodBCard } from '@/components/ui/Card'
import { MoodBTable, MoodBTableBody, MoodBTableCell, MoodBTableHead, MoodBTableHeader, MoodBTableRow } from '@/components/ui/Table'
import { useDeleteRoomCategory, useRoomCategories, useUpdateRoomCategory } from '@/hooks/useRoomCategories'
import { ActionIcon, Badge, Button, Drawer, Group, Menu, Switch, Text, TextInput } from '@mantine/core'
import { IconDots, IconEdit, IconPlus, IconSearch, IconTrash, IconCheck, IconX } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import { RoomCategoryForm } from './RoomCategoryForm'

export function RoomCategoriesTable() {
  const t = useTranslations('admin.styleSystem.roomCategories')
  const tCommon = useTranslations('common')
  const params = useParams()
  const locale = params.locale as string

  const [includeInactive, setIncludeInactive] = useState(false)
  const { data: categoriesData, isLoading, error } = useRoomCategories({ includeInactive })
  const deleteMutation = useDeleteRoomCategory()
  const updateMutation = useUpdateRoomCategory()

  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<any>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const categories = categoriesData?.data || []

  const handleCreate = () => {
    setSelectedCategory(null)
    setIsDrawerOpen(true)
  }

  const handleEdit = (category: any) => {
    setSelectedCategory(category)
    setIsDrawerOpen(true)
  }

  const handleFormSuccess = () => {
    setIsDrawerOpen(false)
    setSelectedCategory(null)
  }

  const handleDelete = async () => {
    if (!deleteCategoryId) return

    setIsDeleting(true)
    try {
      await deleteMutation.mutateAsync(deleteCategoryId)
      setDeleteCategoryId(null)
    } catch (error: any) {
      console.error('Delete error:', error)
      alert(error.message || 'Failed to delete category')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleToggleActive = async (categoryId: string, currentActive: boolean) => {
    try {
      await updateMutation.mutateAsync({
        id: categoryId,
        data: { active: !currentActive },
      })
    } catch (error: any) {
      console.error('Toggle active error:', error)
      alert(error.message || 'Failed to update category status')
    }
  }

  const filteredCategories = categories.filter((category) => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      category.name.he.toLowerCase().includes(searchLower) ||
      category.name.en.toLowerCase().includes(searchLower) ||
      category.slug.toLowerCase().includes(searchLower)
    )
  })

  if (isLoading) {
    return <LoadingState message={t('loading')} />
  }

  if (error) {
    return <ErrorState message={t('error')} />
  }

  return (
    <>
      <MoodBCard>
        <div className="space-y-4">
          {/* Header Actions */}
          <Group justify="space-between">
            <TextInput
              placeholder={t('search')}
              leftSection={<IconSearch size={16} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 300 }}
            />
            <Group gap="sm">
              <Switch
                label={t('showInactive')}
                checked={includeInactive}
                onChange={(e) => setIncludeInactive(e.currentTarget.checked)}
              />
              <Button leftSection={<IconPlus size={16} />} onClick={handleCreate} color="brand">
                {t('create')}
              </Button>
            </Group>
          </Group>

          {/* Table */}
          {filteredCategories.length === 0 ? (
            <EmptyState
              title={search ? t('noResults') : t('empty')}
              description={search ? t('tryDifferentSearch') : t('emptyDescription')}
              action={
                !search ? (
                  <Button leftSection={<IconPlus size={16} />} onClick={handleCreate} color="brand">
                    {t('create')}
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <MoodBTable>
              <MoodBTableHead>
                <MoodBTableRow>
                  <MoodBTableHeader>{t('name')}</MoodBTableHeader>
                  <MoodBTableHeader>{t('slug')}</MoodBTableHeader>
                  <MoodBTableHeader>{t('roomTypes')}</MoodBTableHeader>
                  <MoodBTableHeader>{t('order')}</MoodBTableHeader>
                  <MoodBTableHeader>{t('status')}</MoodBTableHeader>
                  <MoodBTableHeader className="text-right">{t('actions')}</MoodBTableHeader>
                </MoodBTableRow>
              </MoodBTableHead>
              <MoodBTableBody>
                {filteredCategories.map((category) => (
                  <MoodBTableRow key={category.id} className={!category.active ? 'opacity-50' : ''}>
                    <MoodBTableCell>
                      <div>
                        <Text fw={500}>{locale === 'he' ? category.name.he : category.name.en}</Text>
                        {category.description && (
                          <Text size="sm" c="dimmed">
                            {locale === 'he' ? category.description.he : category.description.en}
                          </Text>
                        )}
                      </div>
                    </MoodBTableCell>
                    <MoodBTableCell>
                      <Badge variant="light" color="gray">
                        {category.slug}
                      </Badge>
                    </MoodBTableCell>
                    <MoodBTableCell>
                      <Badge variant="light" color="blue">
                        {category._count?.roomTypes || 0} {t('rooms')}
                      </Badge>
                    </MoodBTableCell>
                    <MoodBTableCell>
                      <Text size="sm">{category.order}</Text>
                    </MoodBTableCell>
                    <MoodBTableCell>
                      {category.active ? (
                        <Badge variant="light" color="green" leftSection={<IconCheck size={12} />}>
                          {t('active')}
                        </Badge>
                      ) : (
                        <Badge variant="light" color="red" leftSection={<IconX size={12} />}>
                          {t('inactive')}
                        </Badge>
                      )}
                    </MoodBTableCell>
                    <MoodBTableCell className="text-right">
                      <Menu position="bottom-end">
                        <Menu.Target>
                          <ActionIcon variant="subtle" color="gray">
                            <IconDots size={16} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item
                            leftSection={<IconEdit size={16} />}
                            onClick={() => handleEdit(category)}
                          >
                            {tCommon('edit')}
                          </Menu.Item>
                          <Menu.Item
                            leftSection={category.active ? <IconX size={16} /> : <IconCheck size={16} />}
                            onClick={() => handleToggleActive(category.id, category.active)}
                          >
                            {category.active ? t('deactivate') : t('activate')}
                          </Menu.Item>
                          <Menu.Divider />
                          <Menu.Item
                            leftSection={<IconTrash size={16} />}
                            color="red"
                            onClick={() => setDeleteCategoryId(category.id)}
                            disabled={category._count?.roomTypes && category._count.roomTypes > 0}
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
          )}
        </div>
      </MoodBCard>

      {/* Create/Edit Drawer */}
      <Drawer
        opened={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={selectedCategory ? t('editCategory') : t('createCategory')}
        position="right"
        size="lg"
      >
        <RoomCategoryForm
          category={selectedCategory}
          onSuccess={handleFormSuccess}
          onCancel={() => setIsDrawerOpen(false)}
        />
      </Drawer>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteCategoryId}
        onClose={() => setDeleteCategoryId(null)}
        onConfirm={handleDelete}
        title={t('deleteConfirmTitle')}
        message={t('deleteConfirmMessage')}
        confirmText={tCommon('delete')}
        cancelText={tCommon('cancel')}
        loading={isDeleting}
        confirmColor="red"
      />
    </>
  )
}
