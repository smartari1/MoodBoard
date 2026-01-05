'use client'

import { Paper, Stack, Title, Text, Button, Group, Center, ThemeIcon, Box } from '@mantine/core'
import { IconPalette, IconPlus, IconSparkles } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'

interface EmptyStateProps {
  onSelectStyle: () => void
  onStartFromScratch: () => void
  isCreating?: boolean
}

export function EmptyState({ onSelectStyle, onStartFromScratch, isCreating }: EmptyStateProps) {
  const t = useTranslations('projectStyle')

  return (
    <Center py="xl">
      <Paper
        p="xl"
        radius="lg"
        withBorder
        style={{
          maxWidth: 500,
          width: '100%',
          textAlign: 'center',
        }}
      >
        <Stack gap="xl" align="center">
          <ThemeIcon size={80} radius="xl" variant="light" color="brand">
            <IconPalette size={40} />
          </ThemeIcon>

          <Stack gap="xs">
            <Title order={3}>{t('empty.title')}</Title>
            <Text c="dimmed" size="sm">
              {t('empty.description')}
            </Text>
          </Stack>

          <Stack gap="md" w="100%">
            <Button
              size="lg"
              leftSection={<IconSparkles size={20} />}
              onClick={onSelectStyle}
              fullWidth
            >
              {t('empty.startFromStyle')}
            </Button>

            <Text c="dimmed" size="xs">
              {t('empty.startFromStyleDescription')}
            </Text>

            <Button
              size="lg"
              variant="light"
              leftSection={<IconPlus size={20} />}
              onClick={onStartFromScratch}
              loading={isCreating}
              fullWidth
            >
              {t('empty.buildFromScratch')}
            </Button>
          </Stack>

          <Text c="dimmed" size="xs" maw={400}>
            {t('empty.buildFromScratchDescription')}
          </Text>
        </Stack>
      </Paper>
    </Center>
  )
}
