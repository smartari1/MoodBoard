'use client'

import { Box, Container, Title, Text, Group, Badge, Breadcrumbs, Anchor, Stack } from '@mantine/core'
import { IconChevronLeft } from '@tabler/icons-react'
import Image from 'next/image'
import Link from 'next/link'

interface BreadcrumbItem {
  label: string
  href: string
}

interface LibraryHeroProps {
  title: string
  subtitle?: string
  description?: string
  imageUrl?: string
  breadcrumbs?: BreadcrumbItem[]
  count?: number
  countLabel?: string
  icon?: React.ReactNode
  children?: React.ReactNode
  color?: string
  /** Force dark text (for light backgrounds) - auto-calculated from color if not specified */
  textDark?: boolean
}

// Calculate if a hex color is light or dark
const isLightColor = (hex: string): boolean => {
  const c = hex.replace('#', '')
  const rgb = parseInt(c, 16)
  const r = (rgb >> 16) & 0xff
  const g = (rgb >> 8) & 0xff
  const b = (rgb >> 0) & 0xff
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return luma > 128
}

export function LibraryHero({
  title,
  subtitle,
  description,
  imageUrl,
  breadcrumbs,
  count,
  countLabel,
  icon,
  children,
  color,
  textDark,
}: LibraryHeroProps) {
  const hasImage = !!imageUrl && imageUrl.length > 0

  // Auto-calculate if text should be dark based on color
  const useDarkText = textDark ?? (color ? isLightColor(color) : false)

  // Text colors based on background
  const textColor = useDarkText ? '#1a1a1a' : 'white'
  const textMuted = useDarkText ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255,255,255,0.85)'
  const textSubtle = useDarkText ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255,255,255,0.6)'
  const iconBg = useDarkText ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255,255,255,0.15)'
  const iconBorder = useDarkText ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255,255,255,0.2)'

  // Use custom color for solid backgrounds, or brand gradient
  // When there's an image, use dark background as fallback while image loads
  const bgStyle = hasImage
    ? { backgroundColor: '#1a1a1a' }
    : color
      ? { backgroundColor: color }
      : { background: 'linear-gradient(135deg, #df2538 0%, #c51f2f 50%, #911721 100%)' }

  return (
    <div
      style={{
        position: 'relative',
        minHeight: hasImage ? 380 : 220,
        display: 'flex',
        alignItems: 'flex-end',
        overflow: 'hidden',
        // Break out of parent padding to achieve full-bleed effect
        marginLeft: 'calc(var(--mantine-spacing-md) * -1)',
        marginRight: 'calc(var(--mantine-spacing-md) * -1)',
        marginTop: 'calc(var(--mantine-spacing-md) * -1)',
        width: 'calc(100% + var(--mantine-spacing-md) * 2)',
        ...bgStyle,
      }}
    >
      {/* Background Image */}
      {hasImage && (
        <>
          <Image
            src={imageUrl}
            alt={title}
            fill
            style={{
              objectFit: 'cover',
              objectPosition: 'center',
              zIndex: 0,
            }}
            priority
            sizes="100vw"
          />
          {/* Dark gradient overlay for text readability */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.2) 100%)',
              zIndex: 1,
            }}
          />
        </>
      )}

      {/* Content */}
      <Container size="xl" pos="relative" pb="xl" pt="xl" style={{ width: '100%', zIndex: 2 }}>
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <Breadcrumbs
            mb="lg"
            separator={<IconChevronLeft size={14} color={textSubtle} />}
          >
            {breadcrumbs.map((item, index) => (
              <Anchor
                key={index}
                component={Link}
                href={item.href}
                c={textMuted}
                size="sm"
                fw={500}
                style={{ textDecoration: 'none' }}
              >
                {item.label}
              </Anchor>
            ))}
          </Breadcrumbs>
        )}

        <Group justify="space-between" align="flex-end" wrap="nowrap" gap="xl">
          <Stack gap="sm" style={{ flex: 1 }}>
            <Group gap="lg" align="center">
              {icon && (
                <Box
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 'var(--mantine-radius-lg)',
                    backgroundColor: iconBg,
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `1px solid ${iconBorder}`,
                  }}
                >
                  <Box c={textColor}>{icon}</Box>
                </Box>
              )}
              <div>
                <Title order={1} c={textColor} size="2.5rem" fw={700}>
                  {title}
                </Title>
                {subtitle && (
                  <Text size="lg" c={textMuted} mt={4} fw={500}>
                    {subtitle}
                  </Text>
                )}
              </div>
            </Group>

            {description && (
              <Text size="md" c={textMuted} maw={700} mt="xs" lh={1.6}>
                {description}
              </Text>
            )}
          </Stack>

          {count !== undefined && (
            <Badge
              size="xl"
              radius="md"
              variant="white"
              px="lg"
              py="sm"
              style={{
                backgroundColor: useDarkText ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255,255,255,0.95)',
                color: useDarkText ? '#1a1a1a' : '#1a1a1a',
                fontSize: '1rem',
                fontWeight: 600,
              }}
            >
              {count} {countLabel}
            </Badge>
          )}
        </Group>

        {children && <Box mt="xl">{children}</Box>}
      </Container>
    </div>
  )
}
