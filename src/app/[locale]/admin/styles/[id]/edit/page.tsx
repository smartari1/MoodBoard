/**
 * Admin Style Edit Page
 * Edit global style and manage approaches
 */

'use client'

import { ApproachForm } from '@/components/features/style-engine/ApproachForm'
import { StyleForm } from '@/components/features/style-engine/StyleForm'
import { ErrorState, LoadingState, MoodBModal } from '@/components/ui'
import {
  useAdminApproaches,
  useAdminStyle,
  useCreateApproach,
  useDeleteApproach,
  useUpdateAdminStyle,
  useUpdateApproach,
} from '@/hooks/useStyles'
import type { CreateApproach, UpdateApproach } from '@/lib/validations/approach'
import type { UpdateStyle } from '@/lib/validations/style'
import { ActionIcon, Badge, Button, Container, Group, Paper, Stack, Tabs, Text, Title } from '@mantine/core'
import { IconEdit, IconTrash } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'

export default function AdminStyleEditPage() {
  const t = useTranslations('admin.styles.edit')
  const tApproach = useTranslations('admin.approaches.manage')
  const tCommon = useTranslations('common')

  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()

  const locale = params.locale as string
  const styleId = params.id as string

  const { data: style, isLoading, error } = useAdminStyle(styleId)
  const updateStyleMutation = useUpdateAdminStyle()

  const {
    data: approaches,
    isLoading: approachesLoading,
    error: approachesError,
  } = useAdminApproaches(styleId)
  const createApproachMutation = useCreateApproach(styleId)
  const updateApproachMutation = useUpdateApproach(styleId)
  const deleteApproachMutation = useDeleteApproach(styleId)

  const initialTab = searchParams.get('tab') ?? 'style'
  const [activeTab, setActiveTab] = useState<string>(initialTab)

  const [approachModalOpen, setApproachModalOpen] = useState(false)
  const [selectedApproach, setSelectedApproach] = useState<any | null>(null)

  useEffect(() => {
    setActiveTab(initialTab)
  }, [initialTab])

  useEffect(() => {
    const approachIdParam = searchParams.get('approachId')
    if (approachIdParam && approaches) {
      const target = approaches.find((item) => item.id === approachIdParam)
      if (target) {
        setSelectedApproach(target)
        setApproachModalOpen(true)
      }
    }
  }, [searchParams, approaches])

  const handleTabChange = (value: string | null) => {
    if (!value) return
    setActiveTab(value)
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'style') {
      params.delete('tab')
    } else {
      params.set('tab', value)
    }
    params.delete('approachId')
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  const closeApproachModal = () => {
    setApproachModalOpen(false)
    setSelectedApproach(null)
    const params = new URLSearchParams(searchParams.toString())
    params.delete('approachId')
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  const handleStyleSubmit = async (data: UpdateStyle) => {
    await updateStyleMutation.mutateAsync({ id: styleId, data })
    router.push(`/${locale}/admin/styles/${styleId}`)
  }

  const handleApproachSubmit = async (data: CreateApproach | UpdateApproach) => {
    if (selectedApproach) {
      await updateApproachMutation.mutateAsync({ id: selectedApproach.id, data })
    } else {
      await createApproachMutation.mutateAsync(data as CreateApproach)
    }
    closeApproachModal()
  }

  const handleApproachDelete = async (approach: any) => {
    const confirmed = window.confirm(
      tApproach('confirmDelete', { name: approach.name?.he || approach.slug })
    )
    if (!confirmed) return
    await deleteApproachMutation.mutateAsync(approach.id)
  }

  const handleCancel = () => {
    router.push(`/${locale}/admin/styles/${styleId}`)
  }

  const approachesSorted = useMemo(
    () => (approaches ? [...approaches].sort((a, b) => a.order - b.order) : []),
    [approaches]
  )

  if (isLoading) {
    return (
      <Container size="xl" py="xl">
        <LoadingState />
      </Container>
    )
  }

  if (error || !style) {
    return (
      <Container size="xl" py="xl">
        <ErrorState message={tCommon('error')} />
      </Container>
    )
  }

  return (
    <Container size="xl" py="xl">
      <Tabs value={activeTab} onChange={handleTabChange}>
        <Tabs.List>
          <Tabs.Tab value="style">{t('styleTab')}</Tabs.Tab>
          <Tabs.Tab value="approaches">{t('approachesTab')}</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="style" pt="xl">
          <StyleForm
            key={styleId}
            mode="edit"
            locale={locale}
            initialData={style}
            onSubmit={handleStyleSubmit}
            onCancel={handleCancel}
            isSubmitting={updateStyleMutation.isPending}
            error={updateStyleMutation.error}
          />
        </Tabs.Panel>

        <Tabs.Panel value="approaches" pt="xl">
          <Stack gap="lg">
            <Group justify="space-between">
              <div>
                <Title order={2}>{tApproach('title')}</Title>
                <Text size="sm" c="dimmed">
                  {tApproach('subtitle')}
                </Text>
              </div>
              <Button
                color="brand"
                onClick={() => {
                  setSelectedApproach(null)
                  setApproachModalOpen(true)
                }}
              >
                {tApproach('create')}
              </Button>
            </Group>

            {approachesLoading ? (
              <LoadingState />
            ) : approachesError ? (
              <ErrorState message={tCommon('error')} />
            ) : approachesSorted.length === 0 ? (
              <Paper p="xl" radius="md" withBorder>
                <Stack align="center" gap="xs">
                  <Text fw={500}>{tApproach('emptyTitle')}</Text>
                  <Text size="sm" c="dimmed">
                    {tApproach('emptyDescription')}
                  </Text>
                </Stack>
              </Paper>
            ) : (
              <Stack gap="md">
                {approachesSorted.map((approach) => (
                  <Paper key={approach.id} p="md" withBorder radius="md">
                    <Stack gap="sm">
                      <Group justify="space-between" align="flex-start">
                        <div>
                          <Title order={4}>{approach.name?.he}</Title>
                          <Text size="sm" c="dimmed">
                            {approach.name?.en}
                          </Text>
                          <Group gap="xs" mt="xs">
                            <Badge variant="light">{tApproach('orderBadge', { order: approach.order })}</Badge>
                            {approach.metadata?.isDefault && (
                              <Badge color="green" variant="light">
                                {tApproach('defaultBadge')}
                              </Badge>
                            )}
                            <Badge variant="outline">{approach.slug}</Badge>
                          </Group>
                        </div>
                        <Group gap="xs">
                          <Button
                            variant="subtle"
                            size="xs"
                            leftSection={<IconEdit size={14} />}
                            onClick={() => {
                              setSelectedApproach(approach)
                              setApproachModalOpen(true)
                            }}
                          >
                            {tCommon('edit')}
                          </Button>
                          <ActionIcon
                            color="red"
                            variant="light"
                            onClick={() => handleApproachDelete(approach)}
                            loading={deleteApproachMutation.isPending && deleteApproachMutation.variables === approach.id}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Group>
                      </Group>

                      <Group gap="lg">
                        <Text size="sm" c="dimmed">
                          {tApproach('stats.images', { count: approach.images?.length ?? 0 })}
                        </Text>
                        <Text size="sm" c="dimmed">
                          {tApproach('stats.materials', { count: approach.materialSet?.defaults?.length ?? 0 })}
                        </Text>
                        <Text size="sm" c="dimmed">
                          {tApproach('stats.rooms', { count: approach.roomProfiles?.length ?? 0 })}
                        </Text>
                      </Group>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            )}
          </Stack>
        </Tabs.Panel>
      </Tabs>

      <MoodBModal
        opened={approachModalOpen}
        onClose={closeApproachModal}
        size="xl"
        title={
          selectedApproach ? tApproach('editTitle', { name: selectedApproach.name?.he }) : tApproach('createTitle')
        }
      >
        <ApproachForm
          key={selectedApproach?.id || 'new'}
          mode={selectedApproach ? 'edit' : 'create'}
          locale={locale}
          styleId={styleId}
          initialData={selectedApproach || undefined}
          onSubmit={handleApproachSubmit}
          onCancel={closeApproachModal}
          isSubmitting={createApproachMutation.isPending || updateApproachMutation.isPending}
          error={(createApproachMutation.error as Error) || (updateApproachMutation.error as Error) || null}
        />
      </MoodBModal>
    </Container>
  )
}
