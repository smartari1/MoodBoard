/**
 * User-Facing Styles Library Page
 * Browse available styles (global + approved public + personal)
 */

'use client'

import { useState } from 'react'
import { Container, Title, Group, Stack, TextInput, Select, Pagination, ActionIcon, Menu, Text, Button, Badge, SimpleGrid, Image, Card } from '@mantine/core'
import { useTranslations } from 'next-intl'
import { useRouter, useParams } from 'next/navigation'
import { IconPlus, IconSearch, IconDots, IconEdit, IconTrash, IconEye, IconTag, IconPhoto } from '@tabler/icons-react'
// FIX: Replaced barrel import with direct imports to improve compilation speed
// Barrel imports force compilation of ALL components (including heavy RichTextEditor, ImageUpload)
// Direct imports only compile what's needed
import { MoodBCard } from '@/components/ui/Card'
import { MoodBBadge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useStyles, useDeleteStyle } from '@/hooks/useStyles'
import { useCategories, useSubCategories } from '@/hooks/useCategories'
import Link from 'next/link'

export default function StylesPage() {
  const t = useTranslations('styles.user')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const params = useParams()
  const locale = params.locale as string

  // Filters
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [subCategoryId, setSubCategoryId] = useState<string | null>(null)
  const [scope, setScope] = useState<'all' | 'global' | 'public' | 'personal'>('all')
  const [page, setPage] = useState(1)

  // Delete confirmation
  const [deleteStyleId, setDeleteStyleId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Fetch categories and sub-categories
  const { data: categoriesData } = useCategories()
  const { data: subCategoriesData } = useSubCategories(categoryId || undefined)

  // Fetch styles
  const { data, isLoading, error } = useStyles({
    search,
    categoryId: categoryId || undefined,
    subCategoryId: subCategoryId || undefined,
    scope,
    page,
    limit: 20,
  })

  // Delete mutation
  const deleteMutation = useDeleteStyle()

  const handleDelete = async () => {
    if (!deleteStyleId) return

    setIsDeleting(true)
    try {
      await deleteMutation.mutateAsync(deleteStyleId)
      setDeleteStyleId(null)
    } catch (error) {
      console.error('Delete error:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  // Category options
  const categoryOptions = [
    { value: '', label: t('filterByCategory') },
    ...(categoriesData?.data.map((cat) => ({
      value: cat.id,
      label: `${cat.name.he} (${cat.name.en})`,
    })) || []),
  ]

  // Sub-category options (filtered by selected category)
  const subCategoryOptions = [
    { value: '', label: t('filterBySubCategory') },
    ...(subCategoriesData?.data.map((subCat) => ({
      value: subCat.id,
      label: `${subCat.name.he} (${subCat.name.en})`,
    })) || []),
  ]

  // Scope options
  const scopeOptions = [
    { value: 'all', label: t('scope.all') },
    { value: 'global', label: t('scope.global') },
    { value: 'public', label: t('scope.public') },
    { value: 'personal', label: t('scope.personal') },
  ]

  // Reset sub-category when category changes
  const handleCategoryChange = (value: string | null) => {
    setCategoryId(value)
    setSubCategoryId(null)
    setPage(1)
  }

  // Check if user can edit/delete style (only personal styles)
  const canEditStyle = (style: any) => {
    return style.organizationId !== null // Not a global style
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between">
          <Title order={1}>{t('title')}</Title>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => router.push(`/${locale}/styles/new`)}
            color="brand"
            variant="filled"
          >
            {t('createStyle')}
          </Button>
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
              onChange={handleCategoryChange}
              clearable
              style={{ width: 180 }}
            />
            <Select
              placeholder={t('filterBySubCategory')}
              data={subCategoryOptions}
              value={subCategoryId}
              onChange={(value) => {
                setSubCategoryId(value)
                setPage(1)
              }}
              clearable
              disabled={!categoryId}
              style={{ width: 180 }}
            />
            <Select
              placeholder={t('filterByScope')}
              data={scopeOptions}
              value={scope}
              onChange={(value) => {
                setScope(value as any)
                setPage(1)
              }}
              style={{ width: 150 }}
            />
          </Group>
        </MoodBCard>

        {/* Styles Grid */}
        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={tCommon('error')} />
        ) : !data || data.data.length === 0 ? (
          <EmptyState
            title={t('noStyles')}
            description={t('noStylesDescription')}
            action={{
              label: t('createStyle'),
              onClick: () => router.push(`/${locale}/styles/new`),
            }}
          />
        ) : (
          <>
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="lg">
              {data.data.map((style) => {
                const metadata = style.metadata as any
                const isGlobal = style.organizationId === null
                const isPublic = metadata.isPublic && metadata.approvalStatus === 'approved'
                const isPersonal = !isGlobal && !isPublic
                // Get first image from multiple sources (in priority order):
                // 1. StyleImage relation (Phase 2 categorized images)
                // 2. Composite image URL
                // 3. Anchor image URL
                // 4. Gallery items (legacy embedded images)
                // 5. Room profile views
                const firstImage =
                  (style.images as any)?.[0]?.url ||
                  (style as any).compositeImageUrl ||
                  (style as any).anchorImageUrl ||
                  (style.gallery as any)?.[0]?.url ||
                  (style.roomProfiles as any)?.[0]?.views?.[0]?.url

                return (
                  <Card
                    key={style.id}
                    shadow="sm"
                    padding="lg"
                    radius="md"
                    withBorder
                    style={{
                      cursor: 'pointer',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      backgroundColor: '#f7f7ed',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)'
                      e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = ''
                    }}
                    onClick={() => router.push(`/${locale}/styles/${style.id}`)}
                  >
                    {/* Image */}
                    <Card.Section>
                      {firstImage ? (
                        <Image
                          src={firstImage}
                          height={200}
                          alt={style.name.he}
                          fit="cover"
                        />
                      ) : (
                        <div
                          style={{
                            height: 200,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#e0e0d8',
                          }}
                        >
                          <IconPhoto size={48} color="#999" />
                        </div>
                      )}
                    </Card.Section>

                    {/* Content */}
                    <Stack gap="xs" mt="md">
                      {/* Title */}
                      <Group justify="space-between" align="flex-start">
                        <div style={{ flex: 1 }}>
                          <Text fw={600} size="lg" lineClamp={1}>
                            {style.name.he}
                          </Text>
                          <Text size="sm" c="dimmed" lineClamp={1}>
                            {style.name.en}
                          </Text>
                        </div>
                        <Menu shadow="md" width={200} onClick={(e) => e.stopPropagation()}>
                          <Menu.Target>
                            <ActionIcon variant="subtle" color="brand">
                              <IconDots size={16} />
                            </ActionIcon>
                          </Menu.Target>
                          <Menu.Dropdown>
                            <Menu.Item
                              leftSection={<IconEye size={16} />}
                              component={Link}
                              href={`/${locale}/styles/${style.id}`}
                            >
                              {tCommon('view')}
                            </Menu.Item>
                            {canEditStyle(style) && (
                              <>
                                <Menu.Item
                                  leftSection={<IconEdit size={16} />}
                                  component={Link}
                                  href={`/${locale}/styles/${style.id}/edit`}
                                >
                                  {tCommon('edit')}
                                </Menu.Item>
                                <Menu.Divider />
                                <Menu.Item
                                  leftSection={<IconTrash size={16} />}
                                  color="red"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setDeleteStyleId(style.id)
                                  }}
                                >
                                  {tCommon('delete')}
                                </Menu.Item>
                              </>
                            )}
                          </Menu.Dropdown>
                        </Menu>
                      </Group>

                      {/* Category & Sub-Category */}
                      <Group gap="xs">
                        {style.category && (
                          <MoodBBadge color="brand" variant="light" size="sm">
                            {style.category.name.he}
                          </MoodBBadge>
                        )}
                        {style.subCategory && (
                          <MoodBBadge color="blue" variant="light" size="sm">
                            {style.subCategory.name.he}
                          </MoodBBadge>
                        )}
                      </Group>

                      {/* Scope Badge */}
                      {isGlobal ? (
                        <MoodBBadge color="violet" variant="light" size="sm">
                          {t('scope.global')}
                        </MoodBBadge>
                      ) : isPublic ? (
                        <MoodBBadge color="green" variant="light" size="sm">
                          {t('scope.public')}
                        </MoodBBadge>
                      ) : (
                        <MoodBBadge color="orange" variant="light" size="sm">
                          {t('scope.personal')}
                        </MoodBBadge>
                      )}

                      {/* Tags */}
                      {metadata.tags && metadata.tags.length > 0 && (
                        <Group gap={4}>
                          {metadata.tags.slice(0, 2).map((tag: string) => (
                            <Badge key={tag} size="xs" variant="dot" leftSection={<IconTag size={10} />}>
                              {tag}
                            </Badge>
                          ))}
                          {metadata.tags.length > 2 && (
                            <Badge size="xs" variant="light">
                              +{metadata.tags.length - 2}
                            </Badge>
                          )}
                        </Group>
                      )}
                    </Stack>
                  </Card>
                )
              })}
            </SimpleGrid>

            {/* Pagination */}
            {data.pagination.totalPages > 1 && (
              <Group justify="center" mt="xl">
                <Pagination
                  value={page}
                  onChange={setPage}
                  total={data.pagination.totalPages}
                />
              </Group>
            )}
          </>
        )}

        {/* Delete Confirmation */}
        <ConfirmDialog
          opened={!!deleteStyleId}
          onClose={() => setDeleteStyleId(null)}
          onConfirm={handleDelete}
          title={t('deleteStyle')}
          message={t('deleteStyleMessage')}
          confirmLabel={tCommon('delete')}
          cancelLabel={tCommon('cancel')}
          loading={isDeleting}
          danger={true}
        />
      </Stack>
    </Container>
  )
}

