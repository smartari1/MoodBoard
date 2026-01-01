'use client'

import {
  Container,
  Stack,
  Text,
  Button,
  Group,
  Badge,
  SimpleGrid,
  Box,
  CopyButton,
  ActionIcon,
  Tooltip,
} from '@mantine/core'
import { IconPalette, IconSparkles, IconCopy, IconCheck } from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
import { usePathname, useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

// Direct imports following design system
import { LoadingState } from '@/components/ui/LoadingState'
import { EmptyState } from '@/components/ui/EmptyState'
import { MoodBCard } from '@/components/ui/Card'
import { LibraryHero } from '@/components/features/library/LibraryHero'

interface Color {
  id: string
  name: { he: string; en: string }
  description?: { he: string; en: string }
  hex: string
  pantone?: string
  category: string
  role?: string
  usage: number
  styles?: { id: string; name: { he: string; en: string }; slug: string; gallery?: { url: string }[] }[]
}

async function fetchColor(id: string): Promise<Color> {
  const res = await fetch(`/api/admin/colors/${id}`)
  if (!res.ok) throw new Error('Failed to fetch color')
  return res.json()
}

const categoryLabels: Record<string, string> = {
  neutral: 'ניטרלי',
  accent: 'אקסנט',
  semantic: 'סמנטי',
}

const roleLabels: Record<string, string> = {
  primary: 'ראשי',
  secondary: 'משני',
  success: 'הצלחה',
  warning: 'אזהרה',
  error: 'שגיאה',
}

export default function ColorDetailPage() {
  const pathname = usePathname()
  const params = useParams()
  const locale = (pathname?.split('/')[1] || 'he') as 'he' | 'en'
  const colorId = params?.id as string

  const { data: color, isLoading } = useQuery({
    queryKey: ['color', colorId],
    queryFn: () => fetchColor(colorId),
    enabled: !!colorId,
    staleTime: 5 * 60 * 1000,
  })

  // Calculate if color is light or dark for text contrast
  const isLightColor = (hex: string) => {
    const c = hex.substring(1)
    const rgb = parseInt(c, 16)
    const r = (rgb >> 16) & 0xff
    const g = (rgb >> 8) & 0xff
    const b = (rgb >> 0) & 0xff
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b
    return luma > 128
  }

  if (isLoading) {
    return (
      <Container size="xl" py="xl">
        <LoadingState message="טוען צבע..." />
      </Container>
    )
  }

  if (!color) {
    return (
      <Container size="xl" py="xl">
        <EmptyState
          title="צבע לא נמצא"
          description="הצבע המבוקש לא קיים או נמחק"
          icon={<IconPalette size={48} />}
        />
      </Container>
    )
  }

  const isLight = isLightColor(color.hex)
  const styles = color.styles || []

  return (
    <Stack gap={0}>
      <LibraryHero
        title={color.name[locale]}
        description={color.description?.[locale]}
        color={color.hex}
        icon={<IconPalette size={28} />}
        count={color.usage}
        countLabel="סגנונות משתמשים"
        breadcrumbs={[
          { label: 'ספרייה', href: `/${locale}/library` },
          { label: 'צבעים', href: `/${locale}/library/colors` },
          { label: color.name[locale], href: `/${locale}/library/colors/${color.id}` },
        ]}
      >
        <Button
          component={Link}
          href={`/${locale}/ai-studio?colorId=${color.id}`}
          variant="white"
          size="md"
          leftSection={<IconSparkles size={18} />}
          style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}
        >
          צור סגנון עם צבע זה
        </Button>
      </LibraryHero>

      <Container size="xl" py="xl">
        {/* Color Info */}
        <MoodBCard mb="xl">
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xl">
            {/* Color Swatch */}
            <Box
              style={{
                aspectRatio: '16/9',
                backgroundColor: color.hex,
                borderRadius: 'var(--mantine-radius-lg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              <Text
                size="xl"
                fw={700}
                c={isLight ? 'dark' : 'white'}
                style={{ opacity: 0.6, letterSpacing: 2 }}
              >
                {color.hex}
              </Text>
            </Box>

            {/* Color Details */}
            <Stack gap="md">
              <div>
                <Text size="sm" c="dimmed" mb={4}>
                  קוד HEX
                </Text>
                <Group gap="xs">
                  <Text size="lg" fw={600} style={{ fontFamily: 'monospace' }}>
                    {color.hex}
                  </Text>
                  <CopyButton value={color.hex}>
                    {({ copied, copy }) => (
                      <Tooltip label={copied ? 'הועתק!' : 'העתק'}>
                        <ActionIcon variant="subtle" color={copied ? 'teal' : 'gray'} onClick={copy}>
                          {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </CopyButton>
                </Group>
              </div>

              {color.pantone && (
                <div>
                  <Text size="sm" c="dimmed" mb={4}>
                    Pantone
                  </Text>
                  <Text size="lg" fw={600}>
                    {color.pantone}
                  </Text>
                </div>
              )}

              <div>
                <Text size="sm" c="dimmed" mb={4}>
                  קטגוריה
                </Text>
                <Badge size="lg" variant="light" color="brand">
                  {categoryLabels[color.category] || color.category}
                </Badge>
              </div>

              {color.role && (
                <div>
                  <Text size="sm" c="dimmed" mb={4}>
                    תפקיד
                  </Text>
                  <Badge size="lg" variant="light" color="violet">
                    {roleLabels[color.role] || color.role}
                  </Badge>
                </div>
              )}
            </Stack>
          </SimpleGrid>
        </MoodBCard>

        {/* Related Styles */}
        <Group justify="space-between" align="center" mb="lg">
          <Text size="xl" fw={700}>
            סגנונות שמשתמשים בצבע
          </Text>
          <Badge size="lg" variant="light" color="gray">
            {styles.length}
          </Badge>
        </Group>

        {styles.length === 0 ? (
          <EmptyState
            title="אין סגנונות"
            description="לא נמצאו סגנונות שמשתמשים בצבע זה"
            icon={<IconPalette size={48} />}
            action={{
              label: 'צור סגנון חדש',
              onClick: () => window.location.href = `/${locale}/ai-studio?colorId=${color.id}`,
            }}
          />
        ) : (
          <SimpleGrid cols={{ base: 2, sm: 3, lg: 4, xl: 5 }} spacing="md">
            {styles.map((style) => (
              <MoodBCard
                key={style.id}
                component={Link}
                href={`/${locale}/styles/${style.slug}`}
                padding={0}
                style={{
                  overflow: 'hidden',
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
                <Box pos="relative" h={120} bg="gray.1">
                  {style.gallery?.[0]?.url && (
                    <Image
                      src={style.gallery[0].url}
                      alt={style.name[locale]}
                      fill
                      style={{ objectFit: 'cover' }}
                      sizes="(max-width: 768px) 50vw, 20vw"
                    />
                  )}
                  {/* Color indicator */}
                  <Box
                    pos="absolute"
                    bottom={8}
                    right={8}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 6,
                      backgroundColor: color.hex,
                      border: '2px solid white',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    }}
                  />
                </Box>
                <Box p="sm">
                  <Text size="sm" fw={500} lineClamp={1}>
                    {style.name[locale]}
                  </Text>
                </Box>
              </MoodBCard>
            ))}
          </SimpleGrid>
        )}
      </Container>
    </Stack>
  )
}
