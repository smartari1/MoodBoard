/**
 * Admin Categories Management Page
 * Manage style categories (create, edit, delete)
 */

'use client'

import { useState } from 'react'
import { Container, Title, Group, Stack, TextInput, Pagination, ActionIcon, Menu, Text, Button, Badge, Modal, Checkbox } from '@mantine/core'
import { useTranslations } from 'next-intl'
import { useRouter, useParams } from 'next/navigation'
import { IconPlus, IconSearch, IconDots, IconEdit, IconTrash, IconEye } from '@tabler/icons-react'
import { DetailedContentViewer } from '@/components/features/style-system/DetailedContentViewer'
// FIX: Replaced barrel import with direct imports to improve compilation speed
// Barrel imports force compilation of ALL components (including heavy RichTextEditor, ImageUpload)
// Direct imports only compile what's needed: 59.6s → expected < 5s
import { MoodBButton } from '@/components/ui/Button'
import { MoodBCard } from '@/components/ui/Card'
import { MoodBTable, MoodBTableHead, MoodBTableBody, MoodBTableRow, MoodBTableHeader, MoodBTableCell } from '@/components/ui/Table'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useCategories, useDeleteCategory } from '@/hooks/useCategories'
import Link from 'next/link'

export default function AdminCategoriesPage() {
  const t = useTranslations('admin.categories')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const params = useParams()
  const locale = params.locale as string

  // Filters
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  // Delete confirmation
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Detailed content viewer
  const [viewDetailsCategory, setViewDetailsCategory] = useState<any>(null)

  // Bulk delete
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  // Fetch categories
  const { data, isLoading, error } = useCategories(search)

  // Delete mutation
  const deleteMutation = useDeleteCategory()

  const handleDelete = async () => {
    if (!deleteCategoryId) return

    setIsDeleting(true)
    try {
      await deleteMutation.mutateAsync(deleteCategoryId)
      setDeleteCategoryId(null)
    } catch (error) {
      console.error('Delete error:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return

    setIsBulkDeleting(true)
    try {
      await Promise.all(selectedIds.map((id) => deleteMutation.mutateAsync(id)))
      setSelectedIds([])
    } catch (error) {
      console.error('Bulk delete error:', error)
    } finally {
      setIsBulkDeleting(false)
    }
  }

  const handleSelectAll = () => {
    if (selectedIds.length === data?.data.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(data?.data.map((cat) => cat.id) || [])
    }
  }

  const handleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((selectedId) => selectedId !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between">
          <Title order={1}>{t('title')}</Title>
          <Group>
            {selectedIds.length > 0 && (
              <Button
                leftSection={<IconTrash size={16} />}
                onClick={handleBulkDelete}
                color="red"
                variant="light"
                loading={isBulkDeleting}
              >
                {locale === 'he' ? `מחק ${selectedIds.length} נבחרים` : `Delete ${selectedIds.length} selected`}
              </Button>
            )}
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => router.push(`/${locale}/admin/categories/new`)}
              color="brand"
              variant="filled"
            >
              {t('createCategory')}
            </Button>
          </Group>
        </Group>

        {/* Filters */}
        <MoodBCard>
          <TextInput
            placeholder={t('searchPlaceholder')}
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </MoodBCard>

        {/* Table */}
        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={tCommon('error')} />
        ) : !data || data.data.length === 0 ? (
          <EmptyState
            title={t('noCategories')}
            description={t('noCategoriesDescription')}
            action={{
              label: t('createCategory'),
              onClick: () => router.push(`/${locale}/admin/categories/new`),
            }}
          />
        ) : (
          <>
            <MoodBCard>
              <MoodBTable>
                <MoodBTableHead>
                  <MoodBTableRow>
                    <MoodBTableHeader style={{ width: 40 }}>
                      <Checkbox
                        checked={selectedIds.length === data.data.length && data.data.length > 0}
                        indeterminate={selectedIds.length > 0 && selectedIds.length < data.data.length}
                        onChange={handleSelectAll}
                      />
                    </MoodBTableHeader>
                    <MoodBTableHeader>{t('table.name')}</MoodBTableHeader>
                    <MoodBTableHeader>{t('table.slug')}</MoodBTableHeader>
                    <MoodBTableHeader>{t('table.subCategories')}</MoodBTableHeader>
                    <MoodBTableHeader>{t('table.styles')}</MoodBTableHeader>
                    <MoodBTableHeader>{t('table.order')}</MoodBTableHeader>
                    <MoodBTableHeader>{t('table.createdAt')}</MoodBTableHeader>
                    <MoodBTableHeader style={{ width: 100 }}>{t('table.actions')}</MoodBTableHeader>
                  </MoodBTableRow>
                </MoodBTableHead>
                <MoodBTableBody>
                  {data.data.map((category) => (
                    <MoodBTableRow key={category.id}>
                      <MoodBTableCell>
                        <Checkbox checked={selectedIds.includes(category.id)} onChange={() => handleSelectOne(category.id)} />
                      </MoodBTableCell>
                      <MoodBTableCell>
                        <Stack gap={4}>
                          <Text fw={500}>{category.name.he}</Text>
                          <Text size="xs" c="dimmed">
                            {category.name.en}
                          </Text>
                        </Stack>
                      </MoodBTableCell>
                      <MoodBTableCell>
                        <Text size="sm" c="dimmed">
                          {category.slug}
                        </Text>
                      </MoodBTableCell>
                      <MoodBTableCell>
                        <Badge variant="light" color="brand">
                          {category._count?.subCategories || 0}
                        </Badge>
                      </MoodBTableCell>
                      <MoodBTableCell>
                        <Badge variant="light" color="blue">
                          {category._count?.styles || 0}
                        </Badge>
                      </MoodBTableCell>
                      <MoodBTableCell>
                        <Text size="sm">{category.order}</Text>
                      </MoodBTableCell>
                      <MoodBTableCell>
                        <Text size="sm">
                          {new Date(category.createdAt).toLocaleDateString(locale)}
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
                            {category.detailedContent && (
                              <>
                                <Menu.Item
                                  leftSection={<IconEye size={16} />}
                                  onClick={() => setViewDetailsCategory(category)}
                                >
                                  {locale === 'he' ? 'הצג פרטים מלאים' : 'View Full Details'}
                                </Menu.Item>
                                <Menu.Divider />
                              </>
                            )}
                            <Menu.Item
                              leftSection={<IconEye size={16} />}
                              component={Link}
                              href={`/${locale}/admin/categories/${category.id}`}
                            >
                              {tCommon('view')}
                            </Menu.Item>
                            <Menu.Item
                              leftSection={<IconEdit size={16} />}
                              component={Link}
                              href={`/${locale}/admin/categories/${category.id}/edit`}
                            >
                              {tCommon('edit')}
                            </Menu.Item>
                            <Menu.Divider />
                            <Menu.Item
                              leftSection={<IconTrash size={16} />}
                              color="red"
                              onClick={() => setDeleteCategoryId(category.id)}
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
          </>
        )}

        {/* Detailed Content Modal */}
        <Modal
          opened={!!viewDetailsCategory}
          onClose={() => setViewDetailsCategory(null)}
          title={
            viewDetailsCategory ? (
              <Text fw={600} size="lg">
                {viewDetailsCategory.name[locale as 'he' | 'en']}
              </Text>
            ) : null
          }
          size="xl"
          dir={locale === 'he' ? 'rtl' : 'ltr'}
        >
          {viewDetailsCategory?.detailedContent && (
            <DetailedContentViewer
              content={viewDetailsCategory.detailedContent}
              entityName={viewDetailsCategory.name}
              entityType="category"
            />
          )}
        </Modal>

        {/* Delete Confirmation */}
        <ConfirmDialog
          opened={!!deleteCategoryId}
          onClose={() => setDeleteCategoryId(null)}
          onConfirm={handleDelete}
          title={t('deleteCategory')}
          message={t('deleteCategoryMessage')}
          confirmLabel={tCommon('delete')}
          cancelLabel={tCommon('cancel')}
          loading={isDeleting}
          danger={true}
        />
      </Stack>
    </Container>
  )
}

