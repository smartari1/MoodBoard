'use client'

import {
  Paper,
  Group,
  Text,
  Button,
  SimpleGrid,
  Card,
  Image,
  Badge,
  ActionIcon,
  Stack,
  Box,
} from '@mantine/core'
import { IconPlus, IconX, IconPalette } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'

interface LocalizedString {
  he: string
  en: string
}

interface BaseStyle {
  id: string
  name: LocalizedString
  slug: string
  images?: Array<{ id: string; url: string; imageCategory?: string }>
  category?: { id: string; name: LocalizedString; slug: string }
  subCategory?: { id: string; name: LocalizedString; slug: string }
}

interface SourcedStylesSectionProps {
  styles: BaseStyle[]
  locale: string
  onRemove: (styleId: string) => void
  onAddStyle: () => void
  isRemoving?: boolean
  isAdding?: boolean
}

export function SourcedStylesSection({
  styles,
  locale,
  onRemove,
  onAddStyle,
  isRemoving,
  isAdding,
}: SourcedStylesSectionProps) {
  const t = useTranslations('projectStyle')

  const getName = (name: LocalizedString) =>
    locale === 'he' ? name.he : name.en

  const getStyleImage = (style: BaseStyle): string | null => {
    if (style.images && style.images.length > 0) {
      return style.images[0].url
    }
    return null
  }

  return (
    <Paper p="md" radius="md" withBorder>
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between">
          <Group gap="sm">
            <IconPalette size={20} />
            <Text fw={600} size="lg">
              {t('sourcedStyles.title')}
            </Text>
          </Group>
          <Button
            variant="light"
            size="sm"
            leftSection={<IconPlus size={16} />}
            onClick={onAddStyle}
            loading={isAdding}
          >
            {t('sourcedStyles.addStyle')}
          </Button>
        </Group>

        {/* Style Cards Grid or Empty State */}
        {styles.length > 0 ? (
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
            {styles.map((style) => {
              const imageUrl = getStyleImage(style)

              return (
                <Card
                  key={style.id}
                  padding="sm"
                  radius="md"
                  withBorder
                  style={{ position: 'relative' }}
                >
                  {/* Remove Button */}
                  <ActionIcon
                    variant="filled"
                    color="gray"
                    size="sm"
                    radius="xl"
                    style={{
                      position: 'absolute',
                      top: 8,
                      insetInlineEnd: 8,
                      zIndex: 10,
                    }}
                    onClick={() => onRemove(style.id)}
                    loading={isRemoving}
                    aria-label={t('sourcedStyles.removeStyle')}
                  >
                    <IconX size={12} />
                  </ActionIcon>

                  {/* Style Image */}
                  <Card.Section>
                    <Box
                      style={{
                        height: 120,
                        backgroundColor: 'var(--mantine-color-gray-1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={getName(style.name)}
                          height={120}
                          fit="cover"
                        />
                      ) : (
                        <IconPalette
                          size={40}
                          style={{ opacity: 0.3 }}
                        />
                      )}
                    </Box>
                  </Card.Section>

                  {/* Style Info */}
                  <Stack gap={4} mt="sm">
                    <Text fw={500} size="sm" lineClamp={1}>
                      {getName(style.name)}
                    </Text>
                    {style.category && (
                      <Badge variant="light" size="xs" color="gray">
                        {getName(style.category.name)}
                      </Badge>
                    )}
                  </Stack>
                </Card>
              )
            })}
          </SimpleGrid>
        ) : (
          <Box
            style={{
              padding: 'var(--mantine-spacing-xl)',
              textAlign: 'center',
              backgroundColor: 'var(--mantine-color-gray-0)',
              borderRadius: 'var(--mantine-radius-md)',
              border: '2px dashed var(--mantine-color-gray-3)',
            }}
          >
            <IconPalette size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
            <Text c="dimmed" size="sm">
              {t('sourcedStyles.empty')}
            </Text>
          </Box>
        )}
      </Stack>
    </Paper>
  )
}
