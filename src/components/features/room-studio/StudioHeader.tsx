/**
 * StudioHeader Component
 * Header with room type, original style, close button, and generate action
 */

'use client'

import { Group, Title, Text, Button, ActionIcon, Badge, Box, Stack } from '@mantine/core'
import { IconX, IconSparkles, IconCoin, IconPalette } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'

interface StudioHeaderProps {
  roomType: string
  originalStyleName?: string | null
  onClose: () => void
  onGenerate: () => void
  isGenerating?: boolean
  canGenerate?: boolean
  creditBalance: number
}

export function StudioHeader({
  roomType,
  originalStyleName,
  onClose,
  onGenerate,
  isGenerating = false,
  canGenerate = false,
  creditBalance,
}: StudioHeaderProps) {
  const t = useTranslations('projectStyle.studio')

  const hasEnoughCredits = creditBalance >= 1

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

        {/* Right: Credits and Generate */}
        <Group gap="md">
          {/* Credit Balance */}
          <Group gap="xs">
            <IconCoin size={18} style={{ color: 'var(--mantine-color-yellow-6)' }} />
            <Badge variant="light" color="yellow" size="lg">
              {creditBalance} {t('credits')}
            </Badge>
          </Group>

          {/* Generate Button */}
          <Button
            leftSection={<IconSparkles size={18} />}
            onClick={onGenerate}
            loading={isGenerating}
            disabled={!canGenerate || !hasEnoughCredits}
            size="md"
          >
            {t('generate')}
            <Badge
              variant="filled"
              color="rgba(255,255,255,0.2)"
              size="sm"
              ml="xs"
            >
              1
            </Badge>
          </Button>
        </Group>
      </Group>
    </Box>
  )
}
