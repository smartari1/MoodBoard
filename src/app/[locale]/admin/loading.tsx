import { Container, Skeleton, Stack, Group, Paper, SimpleGrid } from '@mantine/core'

/**
 * Admin Loading State
 * Shown during route transitions within the admin panel
 */
export default function AdminLoading() {
  return (
    <Container size="xl" py="md">
      <Stack gap="lg">
        {/* Page Header Skeleton */}
        <Group justify="space-between" align="center">
          <Stack gap={4}>
            <Skeleton height={28} width={180} radius="sm" />
            <Skeleton height={14} width={280} radius="sm" />
          </Stack>
          <Group gap="xs">
            <Skeleton height={36} width={100} radius="sm" />
            <Skeleton height={36} width={120} radius="sm" />
          </Group>
        </Group>

        {/* Filters/Search Bar Skeleton */}
        <Paper p="md" radius="md" withBorder>
          <Group gap="md">
            <Skeleton height={36} style={{ flex: 1 }} radius="sm" />
            <Skeleton height={36} width={150} radius="sm" />
            <Skeleton height={36} width={100} radius="sm" />
          </Group>
        </Paper>

        {/* Data Table Skeleton */}
        <Paper p="md" radius="md" withBorder>
          <Stack gap="md">
            {/* Table Header */}
            <Group gap="md" wrap="nowrap" pb="sm" style={{ borderBottom: '1px solid var(--mantine-color-gray-3)' }}>
              <Skeleton height={16} width={40} radius="sm" />
              <Skeleton height={16} width={200} radius="sm" />
              <Skeleton height={16} width={150} radius="sm" />
              <Skeleton height={16} width={100} radius="sm" />
              <Skeleton height={16} width={80} radius="sm" />
            </Group>

            {/* Table Rows */}
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Group key={i} gap="md" wrap="nowrap" py="xs">
                <Skeleton height={20} width={40} radius="sm" />
                <Group gap="sm" style={{ flex: 1 }}>
                  <Skeleton height={40} width={40} radius="sm" />
                  <Stack gap={4} style={{ flex: 1 }}>
                    <Skeleton height={14} width="60%" radius="sm" />
                    <Skeleton height={10} width="30%" radius="sm" />
                  </Stack>
                </Group>
                <Skeleton height={14} width={120} radius="sm" />
                <Skeleton height={22} width={70} radius="xl" />
                <Group gap="xs">
                  <Skeleton height={28} width={28} radius="sm" />
                  <Skeleton height={28} width={28} radius="sm" />
                </Group>
              </Group>
            ))}

            {/* Pagination Skeleton */}
            <Group justify="space-between" pt="md">
              <Skeleton height={14} width={150} radius="sm" />
              <Group gap="xs">
                <Skeleton height={32} width={32} radius="sm" />
                <Skeleton height={32} width={32} radius="sm" />
                <Skeleton height={32} width={32} radius="sm" />
                <Skeleton height={32} width={32} radius="sm" />
              </Group>
            </Group>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  )
}
