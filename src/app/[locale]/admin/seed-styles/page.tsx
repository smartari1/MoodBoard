'use client'

/**
 * Admin Page: AI-Powered Style Seeding
 *
 * Two modes:
 * 1. Bulk Generation: AI-powered generation with filters (default)
 * 2. Manual Generation: Precise control over sub-category, approach, color, and rooms
 */

import { useState } from 'react'
import { Container, Title, Text, Stack, Group, Tabs, Paper, Divider } from '@mantine/core'
import { IconRobot, IconEdit, IconHistory } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'
import ManualGenerationTab from '@/components/admin/seed-styles/ManualGenerationTab'
import BulkGenerationTab from '@/components/admin/seed-styles/BulkGenerationTab'
import { ExecutionHistoryTable } from '@/components/admin/ExecutionHistoryTable'

export default function SeedStylesPage() {
  const t = useTranslations('admin.seed-styles')
  const [activeTab, setActiveTab] = useState<string | null>('bulk')
  const [refreshHistory, setRefreshHistory] = useState(0)

  return (
    <Container size="lg" py="xl">
      <Stack gap="lg">
        {/* Header */}
        <div>
          <Group gap="sm" mb="xs">
            <IconRobot size={32} />
            <Title order={1}>{t('title')}</Title>
          </Group>
          <Text c="dimmed">
            {t('subtitle')}
          </Text>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="bulk" leftSection={<IconRobot size={16} />}>
              {t('tabs.bulk')}
            </Tabs.Tab>
            <Tabs.Tab value="manual" leftSection={<IconEdit size={16} />}>
              {t('tabs.manual')}
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="bulk" pt="md">
            <BulkGenerationTab onComplete={() => setRefreshHistory((prev) => prev + 1)} />
          </Tabs.Panel>

          <Tabs.Panel value="manual" pt="md">
            <ManualGenerationTab onComplete={() => setRefreshHistory((prev) => prev + 1)} />
          </Tabs.Panel>
        </Tabs>

        {/* Shared Execution History */}
        <Divider my="xl" />

        <Paper shadow="sm" p="lg" withBorder>
          <Stack gap="md">
            <Group gap="xs">
              <IconHistory size={24} />
              <Title order={3}>{t('history.title')}</Title>
            </Group>
            <Text c="dimmed" size="sm">
              {t('history.subtitle')}
            </Text>
            <ExecutionHistoryTable
              autoRefresh={false}
              refreshInterval={5000}
              key={refreshHistory}
              onContinue={(executionId) => {
                // Resume only works for bulk tab
                setActiveTab('bulk')
                // The bulk tab will handle the resume
              }}
            />
          </Stack>
        </Paper>
      </Stack>
    </Container>
  )
}
