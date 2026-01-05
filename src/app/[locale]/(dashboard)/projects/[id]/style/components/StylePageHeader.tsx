'use client'

import { Group, Title, Text, Stack, ActionIcon, Button, Badge } from '@mantine/core'
import { IconArrowLeft, IconShare, IconDownload } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'
import { CreditBalance } from '@/components/ui/CreditBalance'

interface StylePageHeaderProps {
  projectName?: string
  clientName?: string
  styleExists: boolean
  onBack: () => void
}

export function StylePageHeader({
  projectName,
  clientName,
  styleExists,
  onBack,
}: StylePageHeaderProps) {
  const t = useTranslations('projectStyle')

  return (
    <Group justify="space-between" align="flex-start">
      <Group gap="md">
        <ActionIcon variant="subtle" size="lg" onClick={onBack}>
          <IconArrowLeft size={20} />
        </ActionIcon>
        <Stack gap={4}>
          <Title order={2}>{t('pageTitle')}</Title>
          <Text c="dimmed" size="sm">
            {projectName || t('untitledProject')}
            {clientName && ` • ${clientName}`}
          </Text>
        </Stack>
      </Group>

      <Group gap="sm">
        <CreditBalance />
        {styleExists && (
          <>
            <Button variant="light" leftSection={<IconShare size={16} />} disabled>
              {t('share')}
            </Button>
            <Button variant="light" leftSection={<IconDownload size={16} />} disabled>
              {t('export')}
            </Button>
          </>
        )}
      </Group>
    </Group>
  )
}
