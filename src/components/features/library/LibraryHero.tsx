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
}: LibraryHeroProps) {
  const hasImage = !!imageUrl && imageUrl.length > 0
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
            separator={<IconChevronLeft size={14} color="rgba(255,255,255,0.6)" />}
          >
            {breadcrumbs.map((item, index) => (
              <Anchor
                key={index}
                component={Link}
                href={item.href}
                c="rgba(255,255,255,0.85)"
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
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(255,255,255,0.2)',
                  }}
                >
                  <Box c="white">{icon}</Box>
                </Box>
              )}
              <div>
                <Title order={1} c="white" size="2.5rem" fw={700}>
                  {title}
                </Title>
                {subtitle && (
                  <Text size="lg" c="rgba(255,255,255,0.9)" mt={4} fw={500}>
                    {subtitle}
                  </Text>
                )}
              </div>
            </Group>

            {description && (
              <Text size="md" c="rgba(255,255,255,0.85)" maw={700} mt="xs" lh={1.6}>
                {description}
              </Text>
            )}
          </Stack>

          {count !== undefined && (
            <Badge
              size="xl"
              radius="md"
              variant="white"
              c="dark"
              px="lg"
              py="sm"
              style={{
                backgroundColor: 'rgba(255,255,255,0.95)',
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
