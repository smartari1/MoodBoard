'use client'

import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  Container,
  Title,
  Group,
  Button,
  Stack,
  Tabs,
  Text,
  Grid,
  ActionIcon,
  Divider,
  Paper,
  SimpleGrid,
  Box,
} from '@mantine/core'
import {
  IconArrowLeft,
  IconEdit,
  IconTrash,
  IconUser,
  IconClock,
  IconMail,
  IconPhone,
  IconHome,
  IconUsers,
  IconCalendar,
  IconCurrencyDollar,
  IconBuilding,
  IconFileText,
  IconPalette,
} from '@tabler/icons-react'
// FIX: Replaced barrel import with direct imports to improve compilation speed
// Barrel imports force compilation of ALL components (including heavy RichTextEditor, ImageUpload)
// Direct imports only compile what's needed
import { MoodBCard } from '@/components/ui/Card'
import { MoodBBadge } from '@/components/ui/Badge'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useProject, useDeleteProject } from '@/hooks/useProjects'
import { useDeleteRoom } from '@/hooks/useRooms'
import { ProjectFormDrawer } from '@/components/features/projects'
import { RoomFormDrawer } from '@/components/features/rooms'
import { useState } from 'react'

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const t = useTranslations('projects')
  const tCommon = useTranslations('common')

  const projectId = params.id as string
  const locale = params.locale as string

  // Fetch project data
  const { data: project, isLoading, error, refetch } = useProject(projectId)

  // Edit drawer
  const [drawerOpened, setDrawerOpened] = useState(false)

  // Delete confirmation
  const [deleteOpened, setDeleteOpened] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const deleteMutation = useDeleteProject()

  // Room management
  const [roomDrawerOpened, setRoomDrawerOpened] = useState(false)
  const [editingRoom, setEditingRoom] = useState<any>(null)
  const [deleteRoomId, setDeleteRoomId] = useState<string | null>(null)
  const [isDeletingRoom, setIsDeletingRoom] = useState(false)
  const deleteRoomMutation = useDeleteRoom(projectId)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteMutation.mutateAsync(projectId)
      router.push(`/${locale}/projects`)
    } catch (error) {
      console.error('Delete error:', error)
      // TODO: Show error notification
    } finally {
      setIsDeleting(false)
    }
  }

  const handleEdit = () => {
    setDrawerOpened(true)
  }

  const handleFormSuccess = () => {
    refetch()
    setDrawerOpened(false)
  }

  // Room handlers
  const handleAddRoom = () => {
    setEditingRoom(null)
    setRoomDrawerOpened(true)
  }

  const handleEditRoom = (room: any) => {
    setEditingRoom(room)
    setRoomDrawerOpened(true)
  }

  const handleRoomFormSuccess = () => {
    refetch()
    setRoomDrawerOpened(false)
    setEditingRoom(null)
  }

  const handleDeleteRoom = async () => {
    if (!deleteRoomId) return

    setIsDeletingRoom(true)
    try {
      await deleteRoomMutation.mutateAsync(deleteRoomId)
      setDeleteRoomId(null)
      refetch()
    } catch (error) {
      console.error('Delete room error:', error)
      // TODO: Show error notification
    } finally {
      setIsDeletingRoom(false)
    }
  }

  // Get status color
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'gray',
      active: 'blue',
      review: 'yellow',
      approved: 'green',
      completed: 'teal',
      archived: 'gray',
    }
    return colors[status] || 'gray'
  }

  if (isLoading) {
    return (
      <Container size="xl" py="xl">
        <LoadingState />
      </Container>
    )
  }

  if (error || !project) {
    return (
      <Container size="xl" py="xl">
        <ErrorState
          message={t('messages.loadError')}
          onRetry={refetch}
        />
      </Container>
    )
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between">
          <Group>
            <ActionIcon
              variant="subtle"
              size="lg"
              onClick={() => router.push(`/${locale}/projects`)}
            >
              <IconArrowLeft size={20} />
            </ActionIcon>
            <div>
              <Group gap="sm">
                <Title order={1}>{project.name}</Title>
                <MoodBBadge color={getStatusColor(project.status)}>
                  {t(`status.${project.status}`)}
                </MoodBBadge>
              </Group>
              {project.client && (
                <Text size="sm" c="dimmed">
                  {project.client.name}
                </Text>
              )}
            </div>
          </Group>
          <Group>
            <Button
              variant="light"
              leftSection={<IconEdit size={16} />}
              onClick={handleEdit}
            >
              {t('editProject')}
            </Button>
            <Button
              variant="light"
              color="red"
              leftSection={<IconTrash size={16} />}
              onClick={() => setDeleteOpened(true)}
            >
              {t('deleteProject')}
            </Button>
          </Group>
        </Group>

        {/* Main Content */}
        <Grid>
          {/* Left Column - Project Info */}
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Stack gap="md">
              {/* Basic Info Card */}
              <MoodBCard>
                <Stack gap="md">
                  <Group gap="xs">
                    <IconBuilding size={20} />
                    <Text fw={600}>{t('projectDetails')}</Text>
                  </Group>
                  <Divider />

                  {/* Client */}
                  {project.client && (
                    <Box>
                      <Group gap="xs" mb={4}>
                        <IconUser size={16} />
                        <Text size="xs" c="dimmed">{t('form.client')}</Text>
                      </Group>
                      <Text size="sm" fw={500}>{project.client.name}</Text>
                      {project.client.contact.email && (
                        <Group gap={4} mt={2}>
                          <IconMail size={12} />
                          <Text size="xs" c="dimmed">{project.client.contact.email}</Text>
                        </Group>
                      )}
                      {project.client.contact.phone && (
                        <Group gap={4} mt={2}>
                          <IconPhone size={12} />
                          <Text size="xs" c="dimmed">{project.client.contact.phone}</Text>
                        </Group>
                      )}
                    </Box>
                  )}

                  <Divider />

                  {/* Status */}
                  <Box>
                    <Text size="xs" c="dimmed" mb={4}>{t('form.status')}</Text>
                    <MoodBBadge color={getStatusColor(project.status)}>
                      {t(`status.${project.status}`)}
                    </MoodBBadge>
                  </Box>

                  {/* Dates */}
                  <Group gap="xs">
                    <IconClock size={16} />
                    <div>
                      <Text size="xs" c="dimmed">{t('table.createdAt')}</Text>
                      <Text size="sm">
                        {new Date(project.metadata.createdAt).toLocaleDateString()}
                      </Text>
                    </div>
                  </Group>

                  {/* Counts */}
                  <Divider />
                  <SimpleGrid cols={2}>
                    <Box>
                      <Text size="xs" c="dimmed">{t('table.rooms')}</Text>
                      <Text size="lg" fw={600}>
                        {project.rooms?.length || 0}
                      </Text>
                    </Box>
                    <Box>
                      <Text size="xs" c="dimmed">{t('table.team')}</Text>
                      <Text size="lg" fw={600}>
                        {project._count?.team || 0}
                      </Text>
                    </Box>
                  </SimpleGrid>
                </Stack>
              </MoodBCard>

              {/* Quick Actions Card */}
              <MoodBCard>
                <Stack gap="md">
                  <Text fw={600}>{t('details.quickActions')}</Text>
                  <Divider />
                  <Button
                    fullWidth
                    variant="light"
                    leftSection={<IconPalette size={18} />}
                    onClick={() => router.push(`/${locale}/projects/${projectId}/style`)}
                  >
                    {t('details.designStyle')}
                  </Button>
                </Stack>
              </MoodBCard>
            </Stack>
          </Grid.Col>

          {/* Right Column - Tabs */}
          <Grid.Col span={{ base: 12, md: 8 }}>
            <Tabs defaultValue="overview">
              <Tabs.List>
                <Tabs.Tab value="overview" leftSection={<IconHome size={16} />}>
                  {t('details.overview')}
                </Tabs.Tab>
                <Tabs.Tab value="rooms" leftSection={<IconBuilding size={16} />}>
                  {t('details.rooms')} ({project.rooms?.length || 0})
                </Tabs.Tab>
                <Tabs.Tab
                  value="style"
                  leftSection={<IconPalette size={16} />}
                  onClick={() => router.push(`/${locale}/projects/${projectId}/style`)}
                >
                  {t('details.style')}
                </Tabs.Tab>
                <Tabs.Tab value="budget" leftSection={<IconCurrencyDollar size={16} />}>
                  {t('details.budget')}
                </Tabs.Tab>
                <Tabs.Tab value="timeline" leftSection={<IconCalendar size={16} />}>
                  {t('details.timeline')}
                </Tabs.Tab>
                <Tabs.Tab value="team" leftSection={<IconUsers size={16} />}>
                  {t('details.team')} ({project._count?.team || 0})
                </Tabs.Tab>
              </Tabs.List>

              {/* Overview Tab */}
              <Tabs.Panel value="overview" pt="md">
                <Stack gap="md">
                  <MoodBCard>
                    <Stack gap="md">
                      <Text fw={600}>{t('details.overview')}</Text>
                      <Divider />

                      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                        <Box>
                          <Text size="xs" c="dimmed" mb={4}>{t('form.name')}</Text>
                          <Text size="sm" fw={500}>{project.name}</Text>
                        </Box>

                        <Box>
                          <Text size="xs" c="dimmed" mb={4}>{t('form.slug')}</Text>
                          <Text size="sm" c="dimmed">{project.slug}</Text>
                        </Box>

                        <Box>
                          <Text size="xs" c="dimmed" mb={4}>{t('form.status')}</Text>
                          <MoodBBadge color={getStatusColor(project.status)}>
                            {t(`status.${project.status}`)}
                          </MoodBBadge>
                        </Box>

                        {project.client && (
                          <Box>
                            <Text size="xs" c="dimmed" mb={4}>{t('form.client')}</Text>
                            <Text size="sm" fw={500}>{project.client.name}</Text>
                          </Box>
                        )}
                      </SimpleGrid>

                      {project.budget && (
                        <>
                          <Divider />
                          <Box>
                            <Text size="xs" c="dimmed" mb={8}>{t('form.budget')}</Text>
                            <Group gap="md">
                              <Box>
                                <Text size="xs" c="dimmed">{t('form.budgetMin')}</Text>
                                <Text size="sm" fw={500}>
                                  {project.budget.currency} {project.budget.target.min.toLocaleString()}
                                </Text>
                              </Box>
                              <Text c="dimmed">-</Text>
                              <Box>
                                <Text size="xs" c="dimmed">{t('form.budgetMax')}</Text>
                                <Text size="sm" fw={500}>
                                  {project.budget.currency} {project.budget.target.max.toLocaleString()}
                                </Text>
                              </Box>
                            </Group>
                          </Box>
                        </>
                      )}

                      {project.timeline?.startDate && (
                        <>
                          <Divider />
                          <Box>
                            <Text size="xs" c="dimmed" mb={8}>{t('form.timeline')}</Text>
                            <Group gap="md">
                              <Box>
                                <Text size="xs" c="dimmed">{t('form.startDate')}</Text>
                                <Text size="sm" fw={500}>
                                  {new Date(project.timeline.startDate).toLocaleDateString()}
                                </Text>
                              </Box>
                              {project.timeline.endDate && (
                                <>
                                  <Text c="dimmed">→</Text>
                                  <Box>
                                    <Text size="xs" c="dimmed">{t('form.endDate')}</Text>
                                    <Text size="sm" fw={500}>
                                      {new Date(project.timeline.endDate).toLocaleDateString()}
                                    </Text>
                                  </Box>
                                </>
                              )}
                            </Group>
                          </Box>
                        </>
                      )}
                    </Stack>
                  </MoodBCard>
                </Stack>
              </Tabs.Panel>

              {/* Rooms Tab */}
              <Tabs.Panel value="rooms" pt="md">
                <Stack gap="md">
                  {/* Add Room Button */}
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      {project.rooms?.length || 0} {t('details.rooms')}
                    </Text>
                    <Button
                      size="sm"
                      variant="light"
                      onClick={handleAddRoom}
                      leftSection={<IconBuilding size={16} />}
                    >
                      {t('form.addRoom')}
                    </Button>
                  </Group>

                  <MoodBCard>
                    {!project.rooms || project.rooms.length === 0 ? (
                      <Paper p="xl" style={{ textAlign: 'center' }}>
                        <IconBuilding size={48} opacity={0.3} style={{ margin: '0 auto' }} />
                        <Text mt="md" c="dimmed">
                          {t('details.noRooms')}
                        </Text>
                        <Text size="sm" c="dimmed" mt="xs">
                          {t('details.clickAddRoomToStart')}
                        </Text>
                      </Paper>
                    ) : (
                      <Stack gap="md">
                        {project.rooms.map((room: any) => (
                          <Paper key={room.id} p="md" withBorder>
                            <Group justify="space-between" wrap="nowrap">
                              <div style={{ flex: 1 }}>
                                <Group gap="xs" mb={4}>
                                  <Text fw={600}>{room.name}</Text>
                                  <MoodBBadge size="sm">{t(`roomTypes.${room.type}`)}</MoodBBadge>
                                </Group>
                                {room.dimensions && (
                                  <Text size="sm" c="dimmed">
                                    {room.dimensions.length} × {room.dimensions.width} × {room.dimensions.height} {room.dimensions.unit}
                                  </Text>
                                )}
                                {room.notes && (
                                  <Text size="sm" c="dimmed" mt={4}>
                                    {room.notes}
                                  </Text>
                                )}
                              </div>
                              <Group gap="xs">
                                <ActionIcon
                                  variant="subtle"
                                  color="gray"
                                  onClick={() => handleEditRoom(room)}
                                >
                                  <IconEdit size={16} />
                                </ActionIcon>
                                <ActionIcon
                                  variant="subtle"
                                  color="red"
                                  onClick={() => setDeleteRoomId(room.id)}
                                >
                                  <IconTrash size={16} />
                                </ActionIcon>
                              </Group>
                            </Group>
                          </Paper>
                        ))}
                      </Stack>
                    )}
                  </MoodBCard>
                </Stack>
              </Tabs.Panel>

              {/* Budget Tab */}
              <Tabs.Panel value="budget" pt="md">
                <MoodBCard>
                  {!project.budget ? (
                    <Paper p="xl" style={{ textAlign: 'center' }}>
                      <IconCurrencyDollar size={48} opacity={0.3} style={{ margin: '0 auto' }} />
                      <Text mt="md" c="dimmed">
                        {t('details.noBudget')}
                      </Text>
                      <Text size="sm" c="dimmed" mt="xs">
                        {t('details.budgetManagementComingSoon')}
                      </Text>
                      <Button mt="md" variant="light" disabled>
                        {t('details.setBudget')}
                      </Button>
                    </Paper>
                  ) : (
                    <Stack gap="lg">
                      <div>
                        <Text fw={600} mb="md">{t('form.budget')}</Text>
                        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
                          <Paper p="md" withBorder>
                            <Text size="xs" c="dimmed" mb={4}>{t('form.budgetMin')}</Text>
                            <Text size="xl" fw={700}>
                              {project.budget.currency} {project.budget.target.min.toLocaleString()}
                            </Text>
                          </Paper>
                          <Paper p="md" withBorder>
                            <Text size="xs" c="dimmed" mb={4}>{t('form.budgetMax')}</Text>
                            <Text size="xl" fw={700}>
                              {project.budget.currency} {project.budget.target.max.toLocaleString()}
                            </Text>
                          </Paper>
                        </SimpleGrid>
                      </div>

                      <Divider />

                      <div>
                        <Text size="sm" c="dimmed" ta="center">
                          {t('details.budgetBreakdownComingSoon')}
                        </Text>
                      </div>
                    </Stack>
                  )}
                </MoodBCard>
              </Tabs.Panel>

              {/* Timeline Tab */}
              <Tabs.Panel value="timeline" pt="md">
                <MoodBCard>
                  {!project.timeline?.startDate ? (
                    <Paper p="xl" style={{ textAlign: 'center' }}>
                      <IconCalendar size={48} opacity={0.3} style={{ margin: '0 auto' }} />
                      <Text mt="md" c="dimmed">
                        {t('details.noTimeline')}
                      </Text>
                      <Text size="sm" c="dimmed" mt="xs">
                        {t('details.timelineManagementComingSoon')}
                      </Text>
                      <Button mt="md" variant="light" disabled>
                        {t('details.setTimeline')}
                      </Button>
                    </Paper>
                  ) : (
                    <Stack gap="lg">
                      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
                        <Paper p="md" withBorder>
                          <Group gap="xs" mb={8}>
                            <IconCalendar size={16} />
                            <Text size="xs" c="dimmed">{t('form.startDate')}</Text>
                          </Group>
                          <Text size="lg" fw={600}>
                            {new Date(project.timeline.startDate).toLocaleDateString()}
                          </Text>
                        </Paper>

                        {project.timeline.endDate && (
                          <Paper p="md" withBorder>
                            <Group gap="xs" mb={8}>
                              <IconCalendar size={16} />
                              <Text size="xs" c="dimmed">{t('form.endDate')}</Text>
                            </Group>
                            <Text size="lg" fw={600}>
                              {new Date(project.timeline.endDate).toLocaleDateString()}
                            </Text>
                          </Paper>
                        )}
                      </SimpleGrid>

                      <Divider />

                      <div>
                        <Text size="sm" c="dimmed" ta="center">
                          {t('details.milestonesComingSoon')}
                        </Text>
                      </div>
                    </Stack>
                  )}
                </MoodBCard>
              </Tabs.Panel>

              {/* Team Tab */}
              <Tabs.Panel value="team" pt="md">
                <MoodBCard>
                  {!project._count?.team || project._count.team === 0 ? (
                    <Paper p="xl" style={{ textAlign: 'center' }}>
                      <IconUsers size={48} opacity={0.3} style={{ margin: '0 auto' }} />
                      <Text mt="md" c="dimmed">
                        {t('details.noTeam')}
                      </Text>
                      <Text size="sm" c="dimmed" mt="xs">
                        {t('details.teamManagementComingSoon')}
                      </Text>
                      <Button mt="md" variant="light" disabled>
                        {t('details.addTeamMember')}
                      </Button>
                    </Paper>
                  ) : (
                    <Text c="dimmed" ta="center">
                      {t('details.teamListComingSoon')}
                    </Text>
                  )}
                </MoodBCard>
              </Tabs.Panel>
            </Tabs>
          </Grid.Col>
        </Grid>
      </Stack>

      {/* Edit Project Drawer */}
      <ProjectFormDrawer
        opened={drawerOpened}
        onClose={() => setDrawerOpened(false)}
        onSuccess={handleFormSuccess}
        project={project}
      />

      {/* Delete Project Confirmation Dialog */}
      <ConfirmDialog
        opened={deleteOpened}
        onClose={() => setDeleteOpened(false)}
        onConfirm={handleDelete}
        title={t('deleteConfirm.title')}
        message={t('deleteConfirm.message')}
        confirmLabel={t('deleteConfirm.confirm')}
        cancelLabel={t('deleteConfirm.cancel')}
        danger
        loading={isDeleting}
      />

      {/* Room Form Drawer */}
      <RoomFormDrawer
        projectId={projectId}
        opened={roomDrawerOpened}
        onClose={() => {
          setRoomDrawerOpened(false)
          setEditingRoom(null)
        }}
        onSuccess={handleRoomFormSuccess}
        room={editingRoom}
      />

      {/* Delete Room Confirmation Dialog */}
      <ConfirmDialog
        opened={!!deleteRoomId}
        onClose={() => setDeleteRoomId(null)}
        onConfirm={handleDeleteRoom}
        title={t('details.deleteRoomTitle')}
        message={t('details.deleteRoomMessage')}
        confirmLabel={tCommon('delete')}
        cancelLabel={tCommon('cancel')}
        danger
        loading={isDeletingRoom}
      />
    </Container>
  )
}
