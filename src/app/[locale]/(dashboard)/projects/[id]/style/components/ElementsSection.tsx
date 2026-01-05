'use client'

import {
  Paper,
  Stack,
  Group,
  Title,
  Text,
  Button,
  ActionIcon,
  Box,
  Image,
  SimpleGrid,
  Tooltip,
  ColorSwatch,
} from '@mantine/core'
import { IconPlus, IconX, IconPalette, IconTexture, IconBox } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'

interface LocalizedString {
  he: string
  en: string
}

interface ColorItem {
  id: string
  name: LocalizedString
  hex: string
  category?: string
}

interface TextureItem {
  id: string
  name: LocalizedString
  images?: string[]
}

interface MaterialItem {
  id: string
  name: LocalizedString
  images?: string[]
  pricing?: {
    basePrice?: number
    unit?: string
  }
}

interface ElementsSectionProps {
  colors: ColorItem[]
  textures: TextureItem[]
  materials: MaterialItem[]
  onAddColor: () => void
  onAddTexture: () => void
  onAddMaterial: () => void
  onRemoveColor: (id: string) => void
  onRemoveTexture: (id: string) => void
  onRemoveMaterial: (id: string) => void
}

export function ElementsSection({
  colors,
  textures,
  materials,
  onAddColor,
  onAddTexture,
  onAddMaterial,
  onRemoveColor,
  onRemoveTexture,
  onRemoveMaterial,
}: ElementsSectionProps) {
  const t = useTranslations('projectStyle')
  const params = useParams()
  const locale = params.locale as string

  const getName = (name: LocalizedString) => (locale === 'he' ? name.he : name.en)

  return (
    <Stack gap="lg">
      {/* Colors Section */}
      <Paper p="md" radius="md" withBorder>
        <Stack gap="md">
          <Group justify="space-between">
            <Group gap="sm">
              <IconPalette size={20} />
              <Title order={4}>{t('elements.colors')}</Title>
              <Text c="dimmed" size="sm">
                ({colors.length})
              </Text>
            </Group>
            <Button
              variant="light"
              size="xs"
              leftSection={<IconPlus size={14} />}
              onClick={onAddColor}
            >
              {t('elements.addColor')}
            </Button>
          </Group>

          {colors.length === 0 ? (
            <Text c="dimmed" size="sm" ta="center" py="md">
              {t('elements.noColors')}
            </Text>
          ) : (
            <Group gap="sm">
              {colors.map((color) => (
                <Tooltip key={color.id} label={getName(color.name)}>
                  <Box pos="relative">
                    <ColorSwatch
                      color={color.hex}
                      size={48}
                      radius="md"
                      style={{ cursor: 'default' }}
                    />
                    <ActionIcon
                      size="xs"
                      variant="filled"
                      color="red"
                      radius="xl"
                      pos="absolute"
                      top={-6}
                      right={-6}
                      onClick={() => onRemoveColor(color.id)}
                    >
                      <IconX size={10} />
                    </ActionIcon>
                  </Box>
                </Tooltip>
              ))}
            </Group>
          )}
        </Stack>
      </Paper>

      {/* Textures Section */}
      <Paper p="md" radius="md" withBorder>
        <Stack gap="md">
          <Group justify="space-between">
            <Group gap="sm">
              <IconTexture size={20} />
              <Title order={4}>{t('elements.textures')}</Title>
              <Text c="dimmed" size="sm">
                ({textures.length})
              </Text>
            </Group>
            <Button
              variant="light"
              size="xs"
              leftSection={<IconPlus size={14} />}
              onClick={onAddTexture}
            >
              {t('elements.addTexture')}
            </Button>
          </Group>

          {textures.length === 0 ? (
            <Text c="dimmed" size="sm" ta="center" py="md">
              {t('elements.noTextures')}
            </Text>
          ) : (
            <SimpleGrid cols={{ base: 3, sm: 4, md: 6 }} spacing="sm">
              {textures.map((texture) => (
                <Box key={texture.id} pos="relative">
                  <Paper radius="md" withBorder style={{ overflow: 'hidden' }}>
                    <Image
                      src={texture.images?.[0] || '/placeholder-texture.png'}
                      alt={getName(texture.name)}
                      h={80}
                      fit="cover"
                    />
                    <Text size="xs" ta="center" py={4} truncate>
                      {getName(texture.name)}
                    </Text>
                  </Paper>
                  <ActionIcon
                    size="xs"
                    variant="filled"
                    color="red"
                    radius="xl"
                    pos="absolute"
                    top={-6}
                    right={-6}
                    onClick={() => onRemoveTexture(texture.id)}
                  >
                    <IconX size={10} />
                  </ActionIcon>
                </Box>
              ))}
            </SimpleGrid>
          )}
        </Stack>
      </Paper>

      {/* Materials Section */}
      <Paper p="md" radius="md" withBorder>
        <Stack gap="md">
          <Group justify="space-between">
            <Group gap="sm">
              <IconBox size={20} />
              <Title order={4}>{t('elements.materials')}</Title>
              <Text c="dimmed" size="sm">
                ({materials.length})
              </Text>
            </Group>
            <Button
              variant="light"
              size="xs"
              leftSection={<IconPlus size={14} />}
              onClick={onAddMaterial}
            >
              {t('elements.addMaterial')}
            </Button>
          </Group>

          {materials.length === 0 ? (
            <Text c="dimmed" size="sm" ta="center" py="md">
              {t('elements.noMaterials')}
            </Text>
          ) : (
            <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="sm">
              {materials.map((material) => (
                <Box key={material.id} pos="relative">
                  <Paper radius="md" withBorder style={{ overflow: 'hidden' }}>
                    <Image
                      src={material.images?.[0] || '/placeholder-material.png'}
                      alt={getName(material.name)}
                      h={100}
                      fit="cover"
                    />
                    <Box p="xs">
                      <Text size="sm" fw={500} truncate>
                        {getName(material.name)}
                      </Text>
                      {material.pricing?.basePrice && (
                        <Text size="xs" c="dimmed">
                          ₪{material.pricing.basePrice}/{material.pricing.unit || 'unit'}
                        </Text>
                      )}
                    </Box>
                  </Paper>
                  <ActionIcon
                    size="xs"
                    variant="filled"
                    color="red"
                    radius="xl"
                    pos="absolute"
                    top={-6}
                    right={-6}
                    onClick={() => onRemoveMaterial(material.id)}
                  >
                    <IconX size={10} />
                  </ActionIcon>
                </Box>
              ))}
            </SimpleGrid>
          )}
        </Stack>
      </Paper>
    </Stack>
  )
}
