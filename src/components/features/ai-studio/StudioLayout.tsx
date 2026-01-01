'use client'

import { Box, Container, Grid, Paper, Stack, Title, Text, Group, ThemeIcon } from '@mantine/core'
import { IconSparkles } from '@tabler/icons-react'
import { CreditBalance } from '@/components/ui/CreditBalance'

interface StudioLayoutProps {
  children: React.ReactNode
  preview: React.ReactNode
  title?: string
  subtitle?: string
}

/**
 * StudioLayout - Two-column layout for AI Studio
 * Left column: Form/controls
 * Right column: Preview/summary
 */
export function StudioLayout({ children, preview, title, subtitle }: StudioLayoutProps) {
  return (
    <Stack gap={0} style={{ minHeight: '100vh' }}>
      {/* Header */}
      <Box
        py="md"
        px="lg"
        style={{
          borderBottom: '1px solid var(--mantine-color-gray-2)',
          backgroundColor: 'white',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <Container size="xl" px={0}>
          <Group justify="space-between" align="center">
            <Group gap="md">
              <ThemeIcon
                size={48}
                radius="xl"
                variant="gradient"
                gradient={{ from: 'teal', to: 'cyan', deg: 135 }}
              >
                <IconSparkles size={24} />
              </ThemeIcon>
              <Stack gap={2}>
                <Title order={2} size="h3">
                  {title || 'AI Style Studio'}
                </Title>
                {subtitle && (
                  <Text size="sm" c="dimmed">
                    {subtitle}
                  </Text>
                )}
              </Stack>
            </Group>
            <CreditBalance />
          </Group>
        </Container>
      </Box>

      {/* Main Content - Two Columns */}
      <Container size="xl" py="xl" style={{ flex: 1 }}>
        <Grid gutter="xl">
          {/* Left Column - Controls */}
          <Grid.Col span={{ base: 12, md: 7, lg: 6 }}>
            <Stack gap="xl">{children}</Stack>
          </Grid.Col>

          {/* Right Column - Preview */}
          <Grid.Col span={{ base: 12, md: 5, lg: 6 }}>
            <Box
              style={{
                position: 'sticky',
                top: 100,
              }}
            >
              <Paper
                p="xl"
                radius="lg"
                shadow="sm"
                style={{
                  backgroundColor: 'var(--mantine-color-gray-0)',
                  border: '1px solid var(--mantine-color-gray-2)',
                }}
              >
                {preview}
              </Paper>
            </Box>
          </Grid.Col>
        </Grid>
      </Container>
    </Stack>
  )
}
