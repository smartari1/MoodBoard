/**
 * StudioHeader Component
 * Header with room type, original style, close button, and credits display
 * Note: Generate button is now in ChatPanel (left side)
 */

'use client'

import { Group, Title, Text, ActionIcon, Badge, Box, Stack } from '@mantine/core'
import { IconX, IconCoin, IconPalette } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'

interface StudioHeaderProps {
  roomType: string
  originalStyleName?: string | null
  onClose: () => void
  creditBalance: number
}

export function StudioHeader({
  roomType,
  originalStyleName,
  onClose,
  creditBalance,
}: StudioHeaderProps) {
  const t = useTranslations('projectStyle.studio')

  return (
    <Box
      p="md"
      style={(theme) => ({
        borderBottom: `1px solid ${theme.colors.gray[2]}`,
        backgroundColor: theme.white,
      })}
    >
      <Group justify="space-between">
        {/* Left: Close and Title */}
        <Group gap="md">
          <ActionIcon
            variant="subtle"
            size="lg"
            onClick={onClose}
            aria-label={t('close')}
          >
            <IconX size={20} />
          </ActionIcon>
          <Stack gap={2}>
            <Title order={3}>{roomType}</Title>
            {originalStyleName && (
              <Group gap="xs">
                <IconPalette size={14} color="var(--mantine-color-dimmed)" />
                <Text size="sm" c="dimmed">
                  {originalStyleName}
                </Text>
              </Group>
            )}
          </Stack>
        </Group>

        {/* Right: Credits Display */}
        <Group gap="xs">
          <IconCoin size={18} style={{ color: 'var(--mantine-color-yellow-6)' }} />
          <Badge variant="light" color="yellow" size="lg">
            {creditBalance} {t('credits')}
          </Badge>
        </Group>
      </Group>
    </Box>
  )
}
