'use client'

import { Container, Title, Text, Card, Group, Stack, SimpleGrid, Paper, Badge, Loader, ActionIcon } from '@mantine/core'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/hooks/use-auth'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { useProjects } from '@/hooks/useProjects'
import { IconFolder, IconUsers, IconPalette, IconCoins, IconTrendingUp, IconCalendar, IconCheck, IconArrowRight } from '@tabler/icons-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
// FIX: Replaced barrel import with direct imports to improve compilation speed
// Barrel imports force compilation of ALL components (including heavy RichTextEditor, ImageUpload)
// Direct imports only compile what's needed
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import type { MouseEvent } from 'react'

export default function DashboardPage() {
  const t = useTranslations('common')
  const tNav = useTranslations('navigation')
  const tDashboard = useTranslations('dashboard')
  const { user, organization } = useAuth()
  const pathname = usePathname()
  const locale = pathname?.split('/')[1] || 'he'

  // Fetch dashboard statistics
  const { data: statsData, isLoading: statsLoading, error: statsError } = useDashboardStats()

  // Fetch recent projects (last 5)
  const { data: projectsData, isLoading: projectsLoading } = useProjects({
    page: 1,
    limit: 5,
  })

  const quickActions = [
    {
      title: tNav('projects'),
      description: 'Manage your design projects',
      icon: IconFolder,
      href: `/${locale}/projects`,
      color: '#df2538',
    },
    {
      title: tNav('clients'),
      description: 'Manage your clients',
      icon: IconUsers,
      href: `/${locale}/clients`,
      color: '#df2538',
    },
    {
      title: tNav('styles'),
      description: 'Browse style library',
      icon: IconPalette,
      href: `/${locale}/styles`,
      color: '#df2538',
    },
  ]

  // Format budget value
  const formatBudget = (amount: number, currencySymbol: string) => {
    if (amount === 0) return `${currencySymbol}0`
    // Format large numbers with commas
    const formatted = new Intl.NumberFormat('he-IL', {
      maximumFractionDigits: 0,
    }).format(amount)
    return `${currencySymbol}${formatted}`
  }

  // Status badge colors
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

  const stats = statsData?.stats
    ? [
        {
          label: tDashboard('stats.totalProjects'),
          value: statsData.stats.totalProjects.toString(),
          icon: IconFolder,
        },
        {
          label: tDashboard('stats.activeProjects'),
          value: statsData.stats.activeProjects.toString(),
          icon: IconCheck,
        },
        {
          label: tDashboard('stats.totalClients'),
          value: statsData.stats.totalClients.toString(),
          icon: IconUsers,
        },
        {
          label: tDashboard('stats.totalBudget'),
          value: formatBudget(statsData.stats.totalBudget, statsData.stats.currencySymbol),
          icon: IconCoins,
        },
      ]
    : [
        {
          label: tDashboard('stats.totalProjects'),
          value: '0',
          icon: IconFolder,
        },
        {
          label: tDashboard('stats.activeProjects'),
          value: '0',
          icon: IconCheck,
        },
        {
          label: tDashboard('stats.totalClients'),
          value: '0',
          icon: IconUsers,
        },
        {
          label: tDashboard('stats.totalBudget'),
          value: '₪0',
          icon: IconCoins,
        },
      ]

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Welcome Section */}
        <div>
          <Title order={1} c="brand" mb="sm" size="h2">
            {tDashboard('welcomeBack')}, {user?.firstName || user?.email}
          </Title>
          {organization && (
            <Text c="dimmed" size="lg">
              {organization.name}
            </Text>
          )}
        </div>

        {/* Stats Grid */}
        {statsLoading ? (
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
            {[1, 2, 3, 4].map((i) => (
              <Paper key={i} p="md" radius="md" withBorder style={{ backgroundColor: '#ffffff' }}>
                <Group justify="space-between">
                  <div style={{ flex: 1 }}>
                    <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb="xs">
                      {t('loading')}
                    </Text>
                    <Loader size="sm" />
                  </div>
                </Group>
              </Paper>
            ))}
          </SimpleGrid>
        ) : statsError ? (
          <ErrorState message={t('error')} />
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
            {stats.map((stat, index) => {
              const Icon = stat.icon
              return (
                <Paper
                  key={index}
                  p="md"
                  radius="md"
                  withBorder
                  style={{ backgroundColor: '#ffffff' }}
                >
                  <Group justify="space-between">
                    <div>
                      <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                        {stat.label}
                      </Text>
                      <Text size="xl" fw={700} mt="xs">
                        {stat.value}
                      </Text>
                    </div>
                    <Icon size={32} color="#df2538" />
                  </Group>
                </Paper>
              )
            })}
          </SimpleGrid>
        )}

        {/* Quick Actions */}
        <div>
          <Title order={3} mb="md">
            {tDashboard('quickActions')}
          </Title>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
            {quickActions.map((action, index) => {
              const Icon = action.icon
              return (
                <Card
                  key={index}
                  component={Link}
                  href={action.href}
                  shadow="sm"
                  padding="lg"
                  radius="md"
                  withBorder
                  style={{
                    cursor: 'pointer',
                    textDecoration: 'none',
                    backgroundColor: '#ffffff',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                  }}
                  onMouseEnter={(e: MouseEvent<HTMLAnchorElement>) => {
                    e.currentTarget.style.transform = 'translateY(-4px)'
                    e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)'
                  }}
                  onMouseLeave={(e: MouseEvent<HTMLAnchorElement>) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <Stack gap="md" align="center">
                    <div
                      style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '16px',
                        backgroundColor: '#fef4f5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon size={32} color={action.color} />
                    </div>
                    <Title order={4} ta="center">
                      {action.title}
                    </Title>
                    <Text c="dimmed" size="sm" ta="center">
                      {action.description}
                    </Text>
                  </Stack>
                </Card>
              )
            })}
          </SimpleGrid>
        </div>

        {/* Recent Projects */}
        <Paper p="xl" radius="md" withBorder style={{ backgroundColor: '#ffffff' }}>
          <Group justify="space-between" mb="md">
            <Title order={3}>{tDashboard('recentProjects')}</Title>
            {projectsData && projectsData.pagination.total > 5 && (
              <ActionIcon
                component={Link}
                href={`/${locale}/projects`}
                variant="subtle"
                color="brand"
              >
                <IconArrowRight size={20} />
              </ActionIcon>
            )}
          </Group>

          {projectsLoading ? (
            <LoadingState />
          ) : !projectsData || projectsData.data.length === 0 ? (
            <Stack align="center" gap="md" py="xl">
              <Text c="dimmed" ta="center">
                {t('noData')}
              </Text>
              <Card
                component={Link}
                href={`/${locale}/projects`}
                padding="md"
                radius="md"
                withBorder
                style={{
                  cursor: 'pointer',
                  textDecoration: 'none',
                  backgroundColor: '#fef4f5',
                  borderColor: '#df2538',
                }}
              >
                <Group gap="xs">
                  <IconFolder size={20} color="#df2538" />
                  <Text fw={500} c="brand">
                    {tNav('projects')}
                  </Text>
                </Group>
              </Card>
            </Stack>
          ) : (
            <Stack gap="sm">
              {projectsData.data.map((project) => (
                <Card
                  key={project.id}
                  component={Link}
                  href={`/${locale}/projects/${project.id}`}
                  padding="md"
                  radius="md"
                  withBorder
                  style={{
                    cursor: 'pointer',
                    textDecoration: 'none',
                    backgroundColor: '#ffffff',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                  }}
                  onMouseEnter={(e: MouseEvent<HTMLAnchorElement>) => {
                    e.currentTarget.style.transform = 'translateX(-4px)'
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                  onMouseLeave={(e: MouseEvent<HTMLAnchorElement>) => {
                    e.currentTarget.style.transform = 'translateX(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <Group justify="space-between">
                    <div style={{ flex: 1 }}>
                      <Group gap="sm" mb="xs">
                        <Text fw={600} size="md">
                          {project.name}
                        </Text>
                        <Badge
                          color={getStatusColor(project.status)}
                          variant="light"
                          size="sm"
                        >
                          {project.status}
                        </Badge>
                      </Group>
                      {project.client && (
                        <Text size="sm" c="dimmed">
                          {project.client.name}
                        </Text>
                      )}
                      {project.rooms && project.rooms.length > 0 && (
                        <Text size="xs" c="dimmed" mt="xs">
                          {project.rooms.length} {project.rooms.length === 1 ? t('room') : t('rooms')}
                        </Text>
                      )}
                    </div>
                    <IconArrowRight size={20} color="#df2538" />
                  </Group>
                </Card>
              ))}
              {projectsData.pagination.total > 5 && (
                <Group justify="center" mt="md">
                  <Text
                    component={Link}
                    href={`/${locale}/projects`}
                    size="sm"
                    c="brand"
                    style={{ textDecoration: 'none' }}
                  >
                    {t('viewAll')} ({projectsData.pagination.total})
                  </Text>
                </Group>
              )}
            </Stack>
          )}
        </Paper>
      </Stack>
    </Container>
  )
}

