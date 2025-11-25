import { Container, Skeleton, Stack, Group, Paper } from '@mantine/core'

/**
 * Dashboard Loading State
 * Shown during route transitions within the dashboard
 */
export default function DashboardLoading() {
  return (
    <Container size="xl" py="md">
      <Stack gap="lg">
        {/* Page Header Skeleton */}
        <Group justify="space-between" align="center">
          <Skeleton height={32} width={200} radius="sm" />
          <Skeleton height={36} width={120} radius="sm" />
        </Group>

        {/* Stats Cards Skeleton */}
        <Group grow>
          {[1, 2, 3, 4].map((i) => (
            <Paper key={i} p="md" radius="md" withBorder>
              <Stack gap="xs">
                <Skeleton height={14} width="60%" radius="sm" />
                <Skeleton height={28} width="40%" radius="sm" />
              </Stack>
            </Paper>
          ))}
        </Group>

        {/* Content Area Skeleton */}
        <Paper p="md" radius="md" withBorder>
          <Stack gap="md">
            <Group justify="space-between">
              <Skeleton height={24} width={150} radius="sm" />
              <Group gap="xs">
                <Skeleton height={32} width={100} radius="sm" />
                <Skeleton height={32} width={100} radius="sm" />
              </Group>
            </Group>

            {/* Table/List Skeleton */}
            <Stack gap="sm">
              {[1, 2, 3, 4, 5].map((i) => (
                <Group key={i} gap="md" wrap="nowrap">
                  <Skeleton height={40} width={40} radius="sm" />
                  <Stack gap={4} style={{ flex: 1 }}>
                    <Skeleton height={16} width="70%" radius="sm" />
                    <Skeleton height={12} width="40%" radius="sm" />
                  </Stack>
                  <Skeleton height={24} width={80} radius="sm" />
                </Group>
              ))}
            </Stack>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  )
}
