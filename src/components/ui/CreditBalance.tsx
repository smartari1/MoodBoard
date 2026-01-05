'use client'

import { ActionIcon, Badge, Group, Loader, Popover, Stack, Text, Tooltip } from '@mantine/core'
import { IconCoins, IconHistory, IconSparkles } from '@tabler/icons-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useCreditBalance, useCreditTransactions } from '@/hooks/useCredits'

interface CreditBalanceProps {
  /**
   * Whether to show a compact version (badge only)
   */
  compact?: boolean
  /**
   * Locale for navigation
   */
  locale?: string
}

/**
 * Credit Balance Display Component
 * Shows the organization's AI generation credits
 */
export function CreditBalance({ compact = false, locale = 'he' }: CreditBalanceProps) {
  const router = useRouter()
  const [opened, setOpened] = useState(false)
  const { data: balance, isLoading: balanceLoading } = useCreditBalance()
  const { data: transactions, isLoading: transactionsLoading } = useCreditTransactions(1, 5)

  if (balanceLoading) {
    return (
      <Group gap="xs">
        <Loader size="xs" />
      </Group>
    )
  }

  const creditCount = balance?.balance ?? 0

  // Compact version - just a badge
  if (compact) {
    return (
      <Tooltip label={`${creditCount} קרדיטים זמינים`} position="bottom">
        <Badge
          size="lg"
          variant="light"
          color={creditCount > 0 ? 'teal' : 'gray'}
          leftSection={<IconCoins size={14} />}
          style={{ cursor: 'pointer' }}
          onClick={() => router.push(`/${locale}/styles`)}
        >
          {creditCount}
        </Badge>
      </Tooltip>
    )
  }

  // Full version with popover
  return (
    <Popover
      width={320}
      position="bottom-end"
      withArrow
      shadow="md"
      opened={opened}
      onChange={setOpened}
    >
      <Popover.Target>
        <Badge
          size="lg"
          variant="light"
          color={creditCount > 0 ? 'teal' : 'gray'}
          leftSection={<IconCoins size={14} />}
          rightSection={
            <ActionIcon
              size="xs"
              variant="transparent"
              color={creditCount > 0 ? 'teal' : 'gray'}
              onClick={(e) => {
                e.stopPropagation()
                setOpened((o) => !o)
              }}
            >
              <IconHistory size={12} />
            </ActionIcon>
          }
          style={{ cursor: 'pointer', paddingInlineEnd: 4 }}
          onClick={() => router.push(`/${locale}/styles`)}
        >
          {creditCount} קרדיטים
        </Badge>
      </Popover.Target>

      <Popover.Dropdown>
        <Stack gap="sm">
          {/* Header */}
          <Group justify="space-between">
            <Group gap="xs">
              <IconCoins size={20} color="var(--mantine-color-teal-6)" />
              <Text fw={600}>יתרת קרדיטים</Text>
            </Group>
            <Text size="xl" fw={700} c="teal">
              {creditCount}
            </Text>
          </Group>

          {/* Info */}
          <Text size="xs" c="dimmed">
            כל קרדיט = יצירת תמונה אחת
          </Text>

          {/* Recent Transactions */}
          {transactionsLoading ? (
            <Loader size="sm" />
          ) : transactions?.transactions && transactions.transactions.length > 0 ? (
            <Stack gap="xs">
              <Text size="sm" fw={500}>
                פעילות אחרונה
              </Text>
              {transactions.transactions.slice(0, 3).map((t) => (
                <Group key={t.id} justify="space-between" wrap="nowrap">
                  <Group gap="xs" wrap="nowrap">
                    <Text size="xs" c="dimmed" style={{ width: 60 }}>
                      {new Date(t.createdAt).toLocaleDateString('he-IL', {
                        day: '2-digit',
                        month: '2-digit',
                      })}
                    </Text>
                    <Text size="xs" lineClamp={1}>
                      {getTransactionLabel(t.type)}
                    </Text>
                  </Group>
                  <Text
                    size="xs"
                    fw={500}
                    c={t.amount > 0 ? 'teal' : 'red'}
                  >
                    {t.amount > 0 ? '+' : ''}{t.amount}
                  </Text>
                </Group>
              ))}
            </Stack>
          ) : (
            <Text size="xs" c="dimmed" ta="center">
              אין פעילות עדיין
            </Text>
          )}

          {/* CTA */}
          <Group justify="center" mt="xs">
            <Badge
              size="md"
              variant="gradient"
              gradient={{ from: 'teal', to: 'cyan' }}
              leftSection={<IconSparkles size={12} />}
              style={{ cursor: 'pointer' }}
              onClick={() => {
                setOpened(false)
                router.push(`/${locale}/styles`)
              }}
            >
              עיין בסגנונות
            </Badge>
          </Group>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  )
}

function getTransactionLabel(type: string): string {
  switch (type) {
    case 'purchase':
      return 'רכישה'
    case 'usage':
      return 'שימוש'
    case 'refund':
      return 'החזר'
    case 'bonus':
      return 'בונוס'
    default:
      return type
  }
}
