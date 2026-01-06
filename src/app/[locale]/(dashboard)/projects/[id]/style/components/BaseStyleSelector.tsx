'use client'

import { useState } from 'react'
import {
  Modal,
  Stack,
  Group,
  Title,
  Text,
  TextInput,
  SimpleGrid,
  Card,
  Image,
  Button,
  Center,
  Loader,
  Badge,
} from '@mantine/core'
import { useDebouncedValue } from '@mantine/hooks'
import { IconSearch, IconCheck } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'

interface Style {
  id: string
  name: { he: string; en: string }
  slug: string
  images?: string[]
  category?: {
    name: { he: string; en: string }
  }
  subCategory?: {
    name: { he: string; en: string }
  }
}

interface BaseStyleSelectorProps {
  opened: boolean
  onClose: () => void
  onSelect: (styleId: string) => void
  isLoading?: boolean
  excludeIds?: string[]
}

async function fetchStyles(search?: string): Promise<{ data: Style[] }> {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  params.set('limit', '20')

  const response = await fetch(`/api/styles?${params.toString()}`)
  if (!response.ok) throw new Error('Failed to fetch styles')
  return response.json()
}

export function BaseStyleSelector({
  opened,
  onClose,
  onSelect,
  isLoading: isSelecting,
  excludeIds = [],
}: BaseStyleSelectorProps) {
  const t = useTranslations('projectStyle')
  const params = useParams()
  const locale = params.locale as string

  const [search, setSearch] = useState('')
  const [debouncedSearch] = useDebouncedValue(search, 300)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Fetch styles
  const { data, isLoading } = useQuery({
    queryKey: ['styles-for-selection', debouncedSearch],
    queryFn: () => fetchStyles(debouncedSearch),
    enabled: opened,
  })

  // Filter out excluded styles
  const styles = (data?.data || []).filter(
    (style) => !excludeIds.includes(style.id)
  )

  const getName = (name: { he: string; en: string }) =>
    locale === 'he' ? name.he : name.en

  const handleSelect = () => {
    if (selectedId) {
      onSelect(selectedId)
    }
  }

  const handleClose = () => {
    setSelectedId(null)
    setSearch('')
    onClose()
  }

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={<Title order={3}>{t('selectStyle.title')}</Title>}
      size="xl"
      centered
    >
      <Stack gap="lg">
        {/* Search */}
        <TextInput
          placeholder={t('selectStyle.searchPlaceholder')}
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* Loading */}
        {isLoading && (
          <Center py="xl">
            <Loader />
          </Center>
        )}

        {/* Empty */}
        {!isLoading && styles.length === 0 && (
          <Center py="xl">
            <Text c="dimmed">{t('selectStyle.noStyles')}</Text>
          </Center>
        )}

        {/* Styles Grid */}
        {!isLoading && styles.length > 0 && (
          <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="sm">
            {styles.map((style) => (
              <Card
                key={style.id}
                padding="xs"
                radius="md"
                withBorder
                style={{
                  cursor: 'pointer',
                  borderColor: selectedId === style.id ? 'var(--mantine-color-brand-6)' : undefined,
                  borderWidth: selectedId === style.id ? 2 : 1,
                }}
                onClick={() => setSelectedId(style.id)}
              >
                <Card.Section pos="relative">
                  <Image
                    src={style.images?.[0] || '/placeholder-style.png'}
                    alt={getName(style.name)}
                    h={120}
                    fit="cover"
                  />
                  {selectedId === style.id && (
                    <Badge
                      variant="filled"
                      color="brand"
                      pos="absolute"
                      top={8}
                      right={8}
                      leftSection={<IconCheck size={12} />}
                    >
                      {t('selectStyle.selected')}
                    </Badge>
                  )}
                </Card.Section>
                <Stack gap={2} mt="xs">
                  <Text size="sm" fw={500} lineClamp={1}>
                    {getName(style.name)}
                  </Text>
                  {style.subCategory && (
                    <Text size="xs" c="dimmed" lineClamp={1}>
                      {getName(style.subCategory.name)}
                    </Text>
                  )}
                </Stack>
              </Card>
            ))}
          </SimpleGrid>
        )}

        {/* Actions */}
        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={handleClose}>
            {t('selectStyle.cancel')}
          </Button>
          <Button
            onClick={handleSelect}
            disabled={!selectedId}
            loading={isSelecting}
          >
            {t('selectStyle.select')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
