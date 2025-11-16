/**
 * Room Types Table Component
 * Manages CRUD operations for room types
 */

'use client'

// FIX: Replaced barrel import with direct imports to improve compilation speed
// Barrel imports force compilation of ALL components (including heavy RichTextEditor, ImageUpload)
// Direct imports only compile what's needed
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { MoodBCard } from '@/components/ui/Card'
import { MoodBTable, MoodBTableBody, MoodBTableCell, MoodBTableHead, MoodBTableHeader, MoodBTableRow } from '@/components/ui/Table'
import { useDeleteRoomType, useRoomTypes } from '@/hooks/useRoomTypes'
import { ActionIcon, Button, Container, Drawer, Group, Menu, Modal, Stack, Text, TextInput, Checkbox } from '@mantine/core'
import { IconDots, IconEdit, IconEye, IconPlus, IconSearch, IconTrash } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { RoomTypeForm } from './RoomTypeForm'
import { DetailedContentViewer } from './DetailedContentViewer'

export function RoomTypesTable() {
  const t = useTranslations('admin.styleSystem.roomTypes')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const params = useParams()
  const locale = params.locale as string

  const { data: roomTypes, isLoading, error } = useRoomTypes()
  const deleteMutation = useDeleteRoomType()

  const [search, setSearch] = useState('')
  const [selectedRoomType, setSelectedRoomType] = useState<any>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [deleteRoomTypeId, setDeleteRoomTypeId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [viewDetailsRoomType, setViewDetailsRoomType] = useState<any>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  const handleCreate = () => {
    setSelectedRoomType(null)
    setIsDrawerOpen(true)
  }

  const handleEdit = (roomType: any) => {
    setSelectedRoomType(roomType)
    setIsDrawerOpen(true)
  }

  const handleFormSuccess = () => {
    setIsDrawerOpen(false)
    setSelectedRoomType(null)
  }

  const handleDelete = async () => {
    if (!deleteRoomTypeId) return

    setIsDeleting(true)
    try {
      await deleteMutation.mutateAsync(deleteRoomTypeId)
      setDeleteRoomTypeId(null)
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
    if (selectedIds.length === filteredRoomTypes?.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredRoomTypes?.map((rt) => rt.id) || [])
    }
  }

  const handleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((selectedId) => selectedId !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  const filteredRoomTypes = roomTypes?.filter((roomType) => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      roomType.name.he.toLowerCase().includes(searchLower) ||
      roomType.name.en.toLowerCase().includes(searchLower) ||
      roomType.slug.toLowerCase().includes(searchLower)
    )
  })

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between">
          <div>
            <Text size="xl" fw={700}>
              {t('title')}
            </Text>
            <Text size="sm" c="dimmed">
              {t('description')}
            </Text>
          </div>
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
            <Button leftSection={<IconPlus size={16} />} onClick={handleCreate} color="brand" variant="filled">
              {t('create')}
            </Button>
          </Group>
        </Group>

        {/* Search */}
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
        ) : !filteredRoomTypes || filteredRoomTypes.length === 0 ? (
          <EmptyState
            title={t('empty')}
            description={t('emptyDescription')}
            action={{
              label: t('create'),
              onClick: handleCreate,
            }}
          />
        ) : (
          <MoodBCard>
            <MoodBTable>
              <MoodBTableHead>
                <MoodBTableRow>
                  <MoodBTableHeader style={{ width: 40 }}>
                    <Checkbox
                      checked={selectedIds.length === filteredRoomTypes?.length && filteredRoomTypes.length > 0}
                      indeterminate={selectedIds.length > 0 && selectedIds.length < (filteredRoomTypes?.length || 0)}
                      onChange={handleSelectAll}
                    />
                  </MoodBTableHeader>
                  <MoodBTableHeader>{t('table.order')}</MoodBTableHeader>
                  <MoodBTableHeader>{t('table.icon')}</MoodBTableHeader>
                  <MoodBTableHeader>{t('table.name')}</MoodBTableHeader>
                  <MoodBTableHeader>{t('table.slug')}</MoodBTableHeader>
                  <MoodBTableHeader>{t('table.description')}</MoodBTableHeader>
                  <MoodBTableHeader style={{ width: 100 }}>{t('table.actions')}</MoodBTableHeader>
                </MoodBTableRow>
              </MoodBTableHead>
              <MoodBTableBody>
                {filteredRoomTypes.map((roomType) => (
                  <MoodBTableRow key={roomType.id}>
                    <MoodBTableCell>
                      <Checkbox checked={selectedIds.includes(roomType.id)} onChange={() => handleSelectOne(roomType.id)} />
                    </MoodBTableCell>
                    <MoodBTableCell>
                      <Text size="sm">{roomType.order}</Text>
                    </MoodBTableCell>
                    <MoodBTableCell>
                      {roomType.icon ? <Text size="xl">{roomType.icon}</Text> : <Text c="dimmed">-</Text>}
                    </MoodBTableCell>
                    <MoodBTableCell>
                      <Stack gap={4}>
                        <Text fw={500}>{roomType.name.he}</Text>
                        <Text size="xs" c="dimmed">
                          {roomType.name.en}
                        </Text>
                      </Stack>
                    </MoodBTableCell>
                    <MoodBTableCell>
                      <Text size="sm" c="dimmed">
                        {roomType.slug}
                      </Text>
                    </MoodBTableCell>
                    <MoodBTableCell>
                      {roomType.description ? (
                        <Stack gap={4}>
                          <Text size="sm">{roomType.description.he}</Text>
                          <Text size="xs" c="dimmed">
                            {roomType.description.en}
                          </Text>
                        </Stack>
                      ) : (
                        <Text size="sm" c="dimmed">
                          -
                        </Text>
                      )}
                    </MoodBTableCell>
                    <MoodBTableCell>
                      <Menu shadow="md" width={200}>
                        <Menu.Target>
                          <ActionIcon variant="subtle" color="brand">
                            <IconDots size={16} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          {roomType.detailedContent && (
                            <>
                              <Menu.Item
                                leftSection={<IconEye size={16} />}
                                onClick={() => setViewDetailsRoomType(roomType)}
                              >
                                {locale === 'he' ? 'הצג פרטים מלאים' : 'View Full Details'}
                              </Menu.Item>
                              <Menu.Divider />
                            </>
                          )}
                          <Menu.Item leftSection={<IconEdit size={16} />} onClick={() => handleEdit(roomType)}>
                            {tCommon('edit')}
                          </Menu.Item>
                          <Menu.Divider />
                          <Menu.Item
                            leftSection={<IconTrash size={16} />}
                            color="red"
                            onClick={() => setDeleteRoomTypeId(roomType.id)}
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

        {/* Form Drawer */}
        <Drawer
          opened={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          title={selectedRoomType ? t('editTitle') : t('createTitle')}
          position="right"
          size="lg"
        >
          <RoomTypeForm roomType={selectedRoomType} onSuccess={handleFormSuccess} />
        </Drawer>

        {/* Delete Confirmation */}
        <ConfirmDialog
          opened={!!deleteRoomTypeId}
          onClose={() => setDeleteRoomTypeId(null)}
          onConfirm={handleDelete}
          title={t('deleteTitle')}
          message={t('deleteMessage')}
          confirmLabel={tCommon('delete')}
          cancelLabel={tCommon('cancel')}
          loading={isDeleting}
          danger={true}
        />

        {/* Detailed Content Modal */}
        <Modal
          opened={!!viewDetailsRoomType}
          onClose={() => setViewDetailsRoomType(null)}
          title={
            viewDetailsRoomType ? (
              <Text fw={600} size="lg">
                {viewDetailsRoomType.name[locale as 'he' | 'en']}
              </Text>
            ) : null
          }
          size="xl"
          dir={locale === 'he' ? 'rtl' : 'ltr'}
        >
          {viewDetailsRoomType?.detailedContent && (
            <DetailedContentViewer
              content={viewDetailsRoomType.detailedContent}
              entityName={viewDetailsRoomType.name}
              entityType="roomType"
            />
          )}
        </Modal>
      </Stack>
    </Container>
  )
}
