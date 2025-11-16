/**
 * Admin SubCategories Management Page
 * Manage style sub-categories (create, edit, delete)
 */

'use client'

import { useState } from 'react'
import { Container, Title, Group, Stack, TextInput, Select, Pagination, ActionIcon, Menu, Text, Button, Badge, Modal, Checkbox } from '@mantine/core'
import { useTranslations } from 'next-intl'
import { useRouter, useParams } from 'next/navigation'
import { IconPlus, IconSearch, IconDots, IconEdit, IconTrash, IconEye } from '@tabler/icons-react'
import { DetailedContentViewer } from '@/components/features/style-system/DetailedContentViewer'
// FIX: Replaced barrel import with direct imports to improve compilation speed
// Barrel imports force compilation of ALL components (including heavy RichTextEditor, ImageUpload)
// Direct imports only compile what's needed
import { MoodBButton } from '@/components/ui/Button'
import { MoodBCard } from '@/components/ui/Card'
import { MoodBTable, MoodBTableHead, MoodBTableBody, MoodBTableRow, MoodBTableHeader, MoodBTableCell } from '@/components/ui/Table'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useSubCategories, useDeleteSubCategory, useCategories } from '@/hooks/useCategories'
import Link from 'next/link'

export default function AdminSubCategoriesPage() {
  const t = useTranslations('admin.subCategories')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const params = useParams()
  const locale = params.locale as string

  // Filters
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  // Delete confirmation
  const [deleteSubCategoryId, setDeleteSubCategoryId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Detailed content viewer
  const [viewDetailsSubCategory, setViewDetailsSubCategory] = useState<any>(null)

  // Bulk delete
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  // Fetch categories for filter
  const { data: categoriesData } = useCategories()

  // Fetch sub-categories
  const { data, isLoading, error } = useSubCategories(categoryId || undefined, search)

  // Delete mutation
  const deleteMutation = useDeleteSubCategory()

  const handleDelete = async () => {
    if (!deleteSubCategoryId) return

    setIsDeleting(true)
    try {
      await deleteMutation.mutateAsync(deleteSubCategoryId)
      setDeleteSubCategoryId(null)
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
      setSelectedIds(data?.data.map((sc) => sc.id) || [])
    }
  }

  const handleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((selectedId) => selectedId !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  // Category options for filter
  const categoryOptions = categoriesData?.data.map((cat) => ({
    value: cat.id,
    label: `${cat.name.he} (${cat.name.en})`,
  })) || []

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
              onClick={() => router.push(`/${locale}/admin/sub-categories/new`)}
              color="brand"
              variant="filled"
            >
              {t('createSubCategory')}
            </Button>
          </Group>
        </Group>

        {/* Filters */}
        <MoodBCard>
          <Group>
            <TextInput
              placeholder={t('searchPlaceholder')}
              leftSection={<IconSearch size={16} />}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              style={{ flex: 1 }}
            />
            <Select
              placeholder={t('filterByCategory')}
              data={categoryOptions}
              value={categoryId}
              onChange={setCategoryId}
              clearable
              style={{ width: 250 }}
            />
          </Group>
        </MoodBCard>

        {/* Table */}
        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={tCommon('error')} />
        ) : !data || data.data.length === 0 ? (
          <EmptyState
            title={t('noSubCategories')}
            description={t('noSubCategoriesDescription')}
            action={{
              label: t('createSubCategory'),
              onClick: () => router.push(`/${locale}/admin/sub-categories/new`),
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
                    <MoodBTableHeader>{t('table.category')}</MoodBTableHeader>
                    <MoodBTableHeader>{t('table.name')}</MoodBTableHeader>
                    <MoodBTableHeader>{t('table.slug')}</MoodBTableHeader>
                    <MoodBTableHeader>{t('table.styles')}</MoodBTableHeader>
                    <MoodBTableHeader>{t('table.order')}</MoodBTableHeader>
                    <MoodBTableHeader>{t('table.createdAt')}</MoodBTableHeader>
                    <MoodBTableHeader style={{ width: 100 }}>{t('table.actions')}</MoodBTableHeader>
                  </MoodBTableRow>
                </MoodBTableHead>
                <MoodBTableBody>
                  {data.data.map((subCategory) => (
                    <MoodBTableRow key={subCategory.id}>
                      <MoodBTableCell>
                        <Checkbox
                          checked={selectedIds.includes(subCategory.id)}
                          onChange={() => handleSelectOne(subCategory.id)}
                        />
                      </MoodBTableCell>
                      <MoodBTableCell>
                        {subCategory.category && (
                          <Badge variant="light" color="brand">
                            {subCategory.category.name.he}
                          </Badge>
                        )}
                      </MoodBTableCell>
                      <MoodBTableCell>
                        <Stack gap={4}>
                          <Text fw={500}>{subCategory.name.he}</Text>
                          <Text size="xs" c="dimmed">
                            {subCategory.name.en}
                          </Text>
                        </Stack>
                      </MoodBTableCell>
                      <MoodBTableCell>
                        <Text size="sm" c="dimmed">
                          {subCategory.slug}
                        </Text>
                      </MoodBTableCell>
                      <MoodBTableCell>
                        <Badge variant="light" color="blue">
                          {subCategory._count?.styles || 0}
                        </Badge>
                      </MoodBTableCell>
                      <MoodBTableCell>
                        <Text size="sm">{subCategory.order}</Text>
                      </MoodBTableCell>
                      <MoodBTableCell>
                        <Text size="sm">
                          {new Date(subCategory.createdAt).toLocaleDateString(locale)}
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
                            {subCategory.detailedContent && (
                              <>
                                <Menu.Item
                                  leftSection={<IconEye size={16} />}
                                  onClick={() => setViewDetailsSubCategory(subCategory)}
                                >
                                  {locale === 'he' ? 'הצג פרטים מלאים' : 'View Full Details'}
                                </Menu.Item>
                                <Menu.Divider />
                              </>
                            )}
                            <Menu.Item
                              leftSection={<IconEye size={16} />}
                              component={Link}
                              href={`/${locale}/admin/sub-categories/${subCategory.id}`}
                            >
                              {tCommon('view')}
                            </Menu.Item>
                            <Menu.Item
                              leftSection={<IconEdit size={16} />}
                              component={Link}
                              href={`/${locale}/admin/sub-categories/${subCategory.id}/edit`}
                            >
                              {tCommon('edit')}
                            </Menu.Item>
                            <Menu.Divider />
                            <Menu.Item
                              leftSection={<IconTrash size={16} />}
                              color="red"
                              onClick={() => setDeleteSubCategoryId(subCategory.id)}
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
          opened={!!viewDetailsSubCategory}
          onClose={() => setViewDetailsSubCategory(null)}
          title={
            viewDetailsSubCategory ? (
              <Text fw={600} size="lg">
                {viewDetailsSubCategory.name[locale as 'he' | 'en']}
              </Text>
            ) : null
          }
          size="xl"
          dir={locale === 'he' ? 'rtl' : 'ltr'}
        >
          {viewDetailsSubCategory?.detailedContent && (
            <DetailedContentViewer
              content={viewDetailsSubCategory.detailedContent}
              entityName={viewDetailsSubCategory.name}
              entityType="subcategory"
            />
          )}
        </Modal>

        {/* Delete Confirmation */}
        <ConfirmDialog
          opened={!!deleteSubCategoryId}
          onClose={() => setDeleteSubCategoryId(null)}
          onConfirm={handleDelete}
          title={t('deleteSubCategory')}
          message={t('deleteSubCategoryMessage')}
          confirmLabel={tCommon('delete')}
          cancelLabel={tCommon('cancel')}
          loading={isDeleting}
          danger={true}
        />
      </Stack>
    </Container>
  )
}

