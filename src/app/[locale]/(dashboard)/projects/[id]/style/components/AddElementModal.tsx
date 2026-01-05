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
  ColorSwatch,
  Box,
} from '@mantine/core'
import { useDebouncedValue } from '@mantine/hooks'
import { IconSearch, IconCheck } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'

type ElementType = 'color' | 'texture' | 'material'

interface Color {
  id: string
  name: { he: string; en: string }
  hex: string
  category?: string
}

interface Texture {
  id: string
  name: { he: string; en: string }
  imageUrl?: string
  thumbnailUrl?: string
}

interface Material {
  id: string
  name: { he: string; en: string }
  assets?: {
    thumbnail?: string
    images?: string[]
  }
}

interface AddElementModalProps {
  type: ElementType
  opened: boolean
  onClose: () => void
  onAdd: (id: string) => void | Promise<void>
  onRemove?: (id: string) => void | Promise<void>
  existingIds: string[]
}

async function fetchColors(search?: string): Promise<{ data: Color[] }> {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  params.set('limit', '50')

  const response = await fetch(`/api/admin/colors?${params.toString()}`)
  if (!response.ok) throw new Error('Failed to fetch colors')
  return response.json()
}

async function fetchTextures(search?: string): Promise<{ data: Texture[] }> {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  params.set('limit', '30')

  const response = await fetch(`/api/admin/textures?${params.toString()}`)
  if (!response.ok) throw new Error('Failed to fetch textures')
  return response.json()
}

async function fetchMaterials(search?: string): Promise<{ data: Material[] }> {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  params.set('limit', '30')

  const response = await fetch(`/api/admin/materials?${params.toString()}`)
  if (!response.ok) throw new Error('Failed to fetch materials')
  return response.json()
}

export function AddElementModal({
  type,
  opened,
  onClose,
  onAdd,
  onRemove,
  existingIds,
}: AddElementModalProps) {
  const t = useTranslations('projectStyle')
  const params = useParams()
  const locale = params.locale as string

  const [search, setSearch] = useState('')
  const [debouncedSearch] = useDebouncedValue(search, 300)
  const [isAdding, setIsAdding] = useState(false)

  // Fetch data based on type
  const { data: colorsData, isLoading: isLoadingColors } = useQuery({
    queryKey: ['colors-for-selection', debouncedSearch],
    queryFn: () => fetchColors(debouncedSearch),
    enabled: opened && type === 'color',
  })

  const { data: texturesData, isLoading: isLoadingTextures } = useQuery({
    queryKey: ['textures-for-selection', debouncedSearch],
    queryFn: () => fetchTextures(debouncedSearch),
    enabled: opened && type === 'texture',
  })

  const { data: materialsData, isLoading: isLoadingMaterials } = useQuery({
    queryKey: ['materials-for-selection', debouncedSearch],
    queryFn: () => fetchMaterials(debouncedSearch),
    enabled: opened && type === 'material',
  })

  const isLoading = isLoadingColors || isLoadingTextures || isLoadingMaterials

  const getName = (name: { he: string; en: string }) =>
    locale === 'he' ? name.he : name.en

  const getTitle = () => {
    switch (type) {
      case 'color':
        return t('addElement.colorTitle')
      case 'texture':
        return t('addElement.textureTitle')
      case 'material':
        return t('addElement.materialTitle')
    }
  }

  const handleAdd = async (id: string) => {
    setIsAdding(true)
    try {
      await onAdd(id)
    } finally {
      setIsAdding(false)
    }
  }

  const handleRemove = async (id: string) => {
    if (!onRemove) return
    setIsAdding(true)
    try {
      await onRemove(id)
    } finally {
      setIsAdding(false)
    }
  }

  const handleToggle = async (id: string, isSelected: boolean) => {
    if (isSelected && onRemove) {
      await handleRemove(id)
    } else if (!isSelected) {
      await handleAdd(id)
    }
  }

  const handleClose = () => {
    setSearch('')
    onClose()
  }

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={<Title order={3}>{getTitle()}</Title>}
      size="lg"
      centered
    >
      <Stack gap="lg">
        {/* Search */}
        <TextInput
          placeholder={t('addElement.searchPlaceholder')}
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

        {/* Colors */}
        {type === 'color' && !isLoading && (
          <SimpleGrid cols={{ base: 4, sm: 6, md: 8 }} spacing="sm">
            {(colorsData?.data || []).map((color) => {
              const isSelected = existingIds.includes(color.id)
              return (
                <Box key={color.id} pos="relative">
                  <Button
                    variant={isSelected ? 'filled' : 'subtle'}
                    color={isSelected ? 'brand' : 'gray'}
                    p={4}
                    h="auto"
                    onClick={() => handleToggle(color.id, isSelected)}
                    disabled={isAdding}
                    style={{ width: '100%' }}
                  >
                    <Stack gap={4} align="center">
                      <ColorSwatch color={color.hex} size={40} />
                      <Text size="xs" lineClamp={1}>
                        {getName(color.name)}
                      </Text>
                    </Stack>
                  </Button>
                  {isSelected && (
                    <IconCheck
                      size={14}
                      style={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        color: 'var(--mantine-color-green-6)',
                      }}
                    />
                  )}
                </Box>
              )
            })}
          </SimpleGrid>
        )}

        {/* Textures */}
        {type === 'texture' && !isLoading && (
          <SimpleGrid cols={{ base: 3, sm: 4, md: 5 }} spacing="sm">
            {(texturesData?.data || []).map((texture) => {
              const isSelected = existingIds.includes(texture.id)
              return (
                <Card
                  key={texture.id}
                  padding="xs"
                  radius="md"
                  withBorder
                  style={{
                    cursor: isSelected ? 'default' : 'pointer',
                    opacity: isSelected ? 0.6 : 1,
                    borderColor: isSelected ? 'var(--mantine-color-brand-6)' : undefined,
                  }}
                  onClick={() => !isSelected && handleAdd(texture.id)}
                >
                  <Card.Section pos="relative">
                    <Image
                      src={texture.imageUrl || texture.thumbnailUrl || '/placeholder-texture.png'}
                      alt={getName(texture.name)}
                      h={80}
                      fit="cover"
                    />
                    {isSelected && (
                      <Badge
                        variant="filled"
                        color="brand"
                        size="xs"
                        pos="absolute"
                        top={4}
                        right={4}
                      >
                        <IconCheck size={10} />
                      </Badge>
                    )}
                  </Card.Section>
                  <Text size="xs" ta="center" mt={4} lineClamp={1}>
                    {getName(texture.name)}
                  </Text>
                </Card>
              )
            })}
          </SimpleGrid>
        )}

        {/* Materials */}
        {type === 'material' && !isLoading && (
          <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="sm">
            {(materialsData?.data || []).map((material) => {
              const isSelected = existingIds.includes(material.id)
              return (
                <Card
                  key={material.id}
                  padding="xs"
                  radius="md"
                  withBorder
                  style={{
                    cursor: isSelected ? 'default' : 'pointer',
                    opacity: isSelected ? 0.6 : 1,
                    borderColor: isSelected ? 'var(--mantine-color-brand-6)' : undefined,
                  }}
                  onClick={() => !isSelected && handleAdd(material.id)}
                >
                  <Card.Section pos="relative">
                    <Image
                      src={material.assets?.thumbnail || material.assets?.images?.[0] || '/placeholder-material.png'}
                      alt={getName(material.name)}
                      h={100}
                      fit="cover"
                    />
                    {isSelected && (
                      <Badge
                        variant="filled"
                        color="brand"
                        size="xs"
                        pos="absolute"
                        top={4}
                        right={4}
                      >
                        <IconCheck size={10} />
                      </Badge>
                    )}
                  </Card.Section>
                  <Stack gap={2} mt={4}>
                    <Text size="xs" fw={500} lineClamp={1}>
                      {getName(material.name)}
                    </Text>
                  </Stack>
                </Card>
              )
            })}
          </SimpleGrid>
        )}

        {/* No Results */}
        {!isLoading && (
          (type === 'color' && (colorsData?.data || []).length === 0) ||
          (type === 'texture' && (texturesData?.data || []).length === 0) ||
          (type === 'material' && (materialsData?.data || []).length === 0)
        ) && (
          <Center py="xl">
            <Text c="dimmed">{t('addElement.noResults')}</Text>
          </Center>
        )}

        {/* Close */}
        <Group justify="flex-end">
          <Button variant="subtle" onClick={handleClose}>
            {t('addElement.done')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
