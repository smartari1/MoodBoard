'use client'

import { Text, Group, Stack, Box, Badge } from '@mantine/core'
import { IconArrowLeft } from '@tabler/icons-react'
import Link from 'next/link'
import { MoodBCard } from '@/components/ui/Card'

interface CollectionCardProps {
  title: string
  count: number
  countLabel: string
  icon: React.ReactNode
  href: string
  color?: 'brand' | 'teal' | 'blue' | 'green' | 'pink' | 'violet'
  gradient?: { from: string; to: string }
}

export function CollectionCard({
  title,
  count,
  countLabel,
  icon,
  href,
  color = 'brand',
  gradient,
}: CollectionCardProps) {
  return (
    <MoodBCard
      component={Link}
      href={href}
      style={{
        cursor: 'pointer',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        textDecoration: 'none',
      }}
      onMouseEnter={(e) => {
        const target = e.currentTarget as HTMLElement
        target.style.transform = 'translateY(-4px)'
        target.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)'
      }}
      onMouseLeave={(e) => {
        const target = e.currentTarget as HTMLElement
        target.style.transform = 'translateY(0)'
        target.style.boxShadow = 'none'
      }}
    >
      <Stack gap="md">
        <Group justify="space-between" align="flex-start">
          <Box
            style={{
              width: 56,
              height: 56,
              borderRadius: 'var(--mantine-radius-md)',
              background: gradient
                ? `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`
                : `var(--mantine-color-${color}-5)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </Box>

          <Badge size="lg" variant="light" color={color}>
            {count}
          </Badge>
        </Group>

        <div>
          <Text size="lg" fw={600} mb={4}>
            {title}
          </Text>
          <Text size="sm" c="dimmed">
            {countLabel}
          </Text>
        </div>

        <Group gap={8} c="brand">
          <Text size="sm" fw={500}>
            צפה בקולקציה
          </Text>
          <IconArrowLeft size={16} />
        </Group>
      </Stack>
    </MoodBCard>
  )
}
