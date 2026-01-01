'use client'

import { Text, Group, Badge, Box } from '@mantine/core'
import { IconArrowLeft } from '@tabler/icons-react'
import Image from 'next/image'
import Link from 'next/link'
import { MoodBCard } from '@/components/ui/Card'

interface LibraryCardProps {
  title: string
  subtitle?: string
  count?: number
  countLabel?: string
  imageUrl?: string
  href: string
}

export function LibraryCard({
  title,
  subtitle,
  count,
  countLabel,
  imageUrl,
  href,
}: LibraryCardProps) {
  return (
    <MoodBCard
      component={Link}
      href={href}
      padding={0}
      shadow="md"
      style={{
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        textDecoration: 'none',
        borderRadius: 'var(--mantine-radius-lg)',
      }}
      onMouseEnter={(e) => {
        const target = e.currentTarget as HTMLElement
        target.style.transform = 'translateY(-8px)'
        target.style.boxShadow = '0 20px 40px rgba(0,0,0,0.15)'
      }}
      onMouseLeave={(e) => {
        const target = e.currentTarget as HTMLElement
        target.style.transform = 'translateY(0)'
        target.style.boxShadow = ''
      }}
    >
      {/* Image Section - Much taller aspect ratio */}
      <Box
        pos="relative"
        style={{
          aspectRatio: '4 / 3',
          backgroundColor: 'var(--mantine-color-gray-2)',
          minHeight: 220,
        }}
      >
        {imageUrl && (
          <Image
            src={imageUrl}
            alt={title}
            fill
            style={{ objectFit: 'cover' }}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        )}

        {/* Gradient Overlay */}
        <Box
          pos="absolute"
          inset={0}
          style={{
            background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.3) 40%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* Count Badge */}
        {count !== undefined && (
          <Badge
            pos="absolute"
            top={16}
            right={16}
            size="lg"
            radius="md"
            variant="filled"
            style={{
              backgroundColor: 'rgba(255,255,255,0.95)',
              color: 'var(--mantine-color-dark-7)',
              fontWeight: 600,
              fontSize: '0.85rem',
              padding: '8px 14px',
            }}
          >
            {count} {countLabel}
          </Badge>
        )}

        {/* Title on Image */}
        <Box pos="absolute" bottom={0} left={0} right={0} p="lg">
          <Text size="xl" fw={700} c="white" lh={1.3}>
            {title}
          </Text>
          {subtitle && (
            <Text size="sm" c="rgba(255,255,255,0.85)" mt={6} lineClamp={2}>
              {subtitle}
            </Text>
          )}
        </Box>
      </Box>

      {/* Bottom Action Bar */}
      <Group justify="space-between" p="md" bg="white">
        <Text size="sm" fw={500} c="dimmed">
          צפה בקולקציה
        </Text>
        <Box
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            backgroundColor: 'var(--mantine-color-brand-0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <IconArrowLeft size={16} color="var(--mantine-color-brand-6)" />
        </Box>
      </Group>
    </MoodBCard>
  )
}
