'use client'

import {
  Accordion,
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  ColorSwatch,
  Group,
  Image,
  Loader,
  Paper,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  Tooltip,
  UnstyledButton,
} from '@mantine/core'
import {
  IconCategory,
  IconCheck,
  IconPalette,
  IconPlus,
  IconSearch,
  IconTexture,
  IconBox,
  IconX,
} from '@tabler/icons-react'
import { useState, useMemo } from 'react'
import { usePathname } from 'next/navigation'

import { useCategories, useSubCategories, type Category, type SubCategory } from '@/hooks/useCategories'
import { useColors, type Color } from '@/hooks/useColors'
import { useTextures, type Texture } from '@/hooks/useTextures'
import { useMaterials, type Material } from '@/hooks/useMaterials'
import { useAIStudio } from '@/hooks/useAIStudio'

interface IngredientSelectorProps {
  defaultCategoryId?: string
  defaultColorId?: string
  defaultTextureId?: string
  defaultMaterialId?: string
}

/**
 * IngredientSelector - Main component for selecting design elements
 * Includes: Category, SubCategory, Colors, Textures, Materials
 */
export function IngredientSelector({
  defaultCategoryId,
  defaultColorId,
  defaultTextureId,
  defaultMaterialId,
}: IngredientSelectorProps) {
  const pathname = usePathname()
  const locale = pathname?.split('/')[1] || 'he'

  const {
    input,
    selectedItems,
    setCategory,
    setSubCategory,
    addColor,
    removeColor,
    addTexture,
    removeTexture,
    addMaterial,
    removeMaterial,
  } = useAIStudio()

  // Search states
  const [colorSearch, setColorSearch] = useState('')
  const [textureSearch, setTextureSearch] = useState('')
  const [materialSearch, setMaterialSearch] = useState('')

  // Fetch data
  const { data: categoriesData, isLoading: categoriesLoading } = useCategories()
  const { data: subCategoriesData, isLoading: subCategoriesLoading } = useSubCategories(
    input.categoryId || undefined
  )
  const { data: colorsData, isLoading: colorsLoading } = useColors({ search: colorSearch, page: 1, limit: 50 })
  const { data: texturesData, isLoading: texturesLoading } = useTextures({ search: textureSearch, page: 1, limit: 50 })
  const { data: materialsData, isLoading: materialsLoading } = useMaterials({ search: materialSearch, page: 1, limit: 50 })

  // Filter helpers
  const categories = categoriesData?.data || []
  const subCategories = subCategoriesData?.data || []
  const colors = colorsData?.data || []
  const textures = texturesData?.data || []
  const materials = materialsData?.data || []

  // Category select data
  const categorySelectData = useMemo(
    () =>
      categories.map((cat) => ({
        value: cat.id,
        label: cat.name[locale as 'he' | 'en'] || cat.name.he,
      })),
    [categories, locale]
  )

  const subCategorySelectData = useMemo(
    () =>
      subCategories.map((sub) => ({
        value: sub.id,
        label: sub.name[locale as 'he' | 'en'] || sub.name.he,
      })),
    [subCategories, locale]
  )

  // Handle category selection
  const handleCategoryChange = (categoryId: string | null) => {
    const category = categories.find((c) => c.id === categoryId) || null
    setCategory(category)
  }

  const handleSubCategoryChange = (subCategoryId: string | null) => {
    const subCategory = subCategories.find((s) => s.id === subCategoryId) || null
    setSubCategory(subCategory)
  }

  // Check if item is selected
  const isColorSelected = (colorId: string) => input.colorIds.includes(colorId)
  const isTextureSelected = (textureId: string) => input.textureIds.includes(textureId)
  const isMaterialSelected = (materialId: string) => input.materialIds.includes(materialId)

  // Toggle handlers
  const handleColorToggle = (color: Color) => {
    if (isColorSelected(color.id)) {
      removeColor(color.id)
    } else if (input.colorIds.length < 6) {
      addColor(color)
    }
  }

  const handleTextureToggle = (texture: Texture) => {
    if (isTextureSelected(texture.id)) {
      removeTexture(texture.id)
    } else if (input.textureIds.length < 5) {
      addTexture(texture)
    }
  }

  const handleMaterialToggle = (material: Material) => {
    if (isMaterialSelected(material.id)) {
      removeMaterial(material.id)
    } else if (input.materialIds.length < 10) {
      addMaterial(material)
    }
  }

  return (
    <Accordion
      variant="separated"
      radius="md"
      defaultValue={['category', 'colors']}
      multiple
    >
      {/* Category Selection */}
      <Accordion.Item value="category">
        <Accordion.Control icon={<IconCategory size={20} />}>
          <Group gap="xs">
            <Text fw={600}>קטגוריה וסגנון</Text>
            {selectedItems.category && (
              <Badge size="sm" variant="light" color="brand">
                {selectedItems.category.name[locale as 'he' | 'en']}
              </Badge>
            )}
          </Group>
        </Accordion.Control>
        <Accordion.Panel>
          <Stack gap="md">
            <Select
              label="קטגוריה"
              placeholder="בחר קטגוריה"
              data={categorySelectData}
              value={input.categoryId}
              onChange={handleCategoryChange}
              searchable
              clearable
              rightSection={categoriesLoading ? <Loader size="xs" /> : undefined}
            />

            <Select
              label="תת-קטגוריה"
              placeholder={input.categoryId ? 'בחר תת-קטגוריה' : 'יש לבחור קטגוריה קודם'}
              data={subCategorySelectData}
              value={input.subCategoryId}
              onChange={handleSubCategoryChange}
              searchable
              clearable
              disabled={!input.categoryId}
              rightSection={subCategoriesLoading ? <Loader size="xs" /> : undefined}
            />
          </Stack>
        </Accordion.Panel>
      </Accordion.Item>

      {/* Colors Selection */}
      <Accordion.Item value="colors">
        <Accordion.Control icon={<IconPalette size={20} />}>
          <Group gap="xs">
            <Text fw={600}>צבעים</Text>
            <Badge size="sm" variant="light" color="teal">
              {selectedItems.colors.length}/6
            </Badge>
          </Group>
        </Accordion.Control>
        <Accordion.Panel>
          <Stack gap="md">
            {/* Selected Colors */}
            {selectedItems.colors.length > 0 && (
              <Paper p="sm" radius="md" withBorder>
                <Group gap="xs" wrap="wrap">
                  {selectedItems.colors.map((color) => (
                    <Tooltip key={color.id} label={color.name[locale as 'he' | 'en']}>
                      <ActionIcon
                        size="lg"
                        radius="xl"
                        variant="filled"
                        style={{ backgroundColor: color.hex }}
                        onClick={() => removeColor(color.id)}
                      >
                        <IconX size={14} color="white" style={{ opacity: 0.8 }} />
                      </ActionIcon>
                    </Tooltip>
                  ))}
                </Group>
              </Paper>
            )}

            {/* Search */}
            <TextInput
              placeholder="חפש צבע..."
              leftSection={<IconSearch size={16} />}
              value={colorSearch}
              onChange={(e) => setColorSearch(e.target.value)}
            />

            {/* Color Grid */}
            <ScrollArea h={200}>
              {colorsLoading ? (
                <Group justify="center" p="xl">
                  <Loader size="sm" />
                </Group>
              ) : (
                <SimpleGrid cols={6} spacing="xs">
                  {colors.map((color) => {
                    const selected = isColorSelected(color.id)
                    return (
                      <Tooltip key={color.id} label={color.name[locale as 'he' | 'en']}>
                        <UnstyledButton
                          onClick={() => handleColorToggle(color)}
                          style={{
                            borderRadius: '50%',
                            outline: selected ? `3px solid var(--mantine-color-teal-5)` : 'none',
                            outlineOffset: 2,
                          }}
                        >
                          <ColorSwatch
                            color={color.hex}
                            size={40}
                            style={{
                              cursor: 'pointer',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            }}
                          >
                            {selected && <IconCheck size={16} color="white" />}
                          </ColorSwatch>
                        </UnstyledButton>
                      </Tooltip>
                    )
                  })}
                </SimpleGrid>
              )}
            </ScrollArea>
          </Stack>
        </Accordion.Panel>
      </Accordion.Item>

      {/* Textures Selection */}
      <Accordion.Item value="textures">
        <Accordion.Control icon={<IconTexture size={20} />}>
          <Group gap="xs">
            <Text fw={600}>טקסטורות</Text>
            <Badge size="sm" variant="light" color="cyan">
              {selectedItems.textures.length}/5
            </Badge>
          </Group>
        </Accordion.Control>
        <Accordion.Panel>
          <Stack gap="md">
            {/* Selected Textures */}
            {selectedItems.textures.length > 0 && (
              <Paper p="sm" radius="md" withBorder>
                <Group gap="xs" wrap="wrap">
                  {selectedItems.textures.map((texture) => (
                    <Badge
                      key={texture.id}
                      size="lg"
                      variant="light"
                      color="cyan"
                      rightSection={
                        <ActionIcon
                          size="xs"
                          radius="xl"
                          variant="transparent"
                          color="cyan"
                          onClick={() => removeTexture(texture.id)}
                        >
                          <IconX size={12} />
                        </ActionIcon>
                      }
                    >
                      {texture.name[locale as 'he' | 'en']}
                    </Badge>
                  ))}
                </Group>
              </Paper>
            )}

            {/* Search */}
            <TextInput
              placeholder="חפש טקסטורה..."
              leftSection={<IconSearch size={16} />}
              value={textureSearch}
              onChange={(e) => setTextureSearch(e.target.value)}
            />

            {/* Texture Grid */}
            <ScrollArea h={200}>
              {texturesLoading ? (
                <Group justify="center" p="xl">
                  <Loader size="sm" />
                </Group>
              ) : (
                <SimpleGrid cols={3} spacing="sm">
                  {textures.map((texture) => {
                    const selected = isTextureSelected(texture.id)
                    return (
                      <UnstyledButton
                        key={texture.id}
                        onClick={() => handleTextureToggle(texture)}
                      >
                        <Card
                          padding="xs"
                          radius="md"
                          withBorder
                          style={{
                            borderColor: selected
                              ? 'var(--mantine-color-cyan-5)'
                              : undefined,
                            borderWidth: selected ? 2 : 1,
                          }}
                        >
                          <Card.Section>
                            <Box h={60} pos="relative">
                              {texture.imageUrl ? (
                                <Image
                                  src={texture.imageUrl}
                                  h={60}
                                  alt={texture.name[locale as 'he' | 'en']}
                                  fit="cover"
                                />
                              ) : (
                                <Box
                                  h={60}
                                  style={{
                                    backgroundColor: 'var(--mantine-color-gray-2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  <IconTexture size={24} color="gray" />
                                </Box>
                              )}
                              {selected && (
                                <ThemeIcon
                                  size="sm"
                                  radius="xl"
                                  color="cyan"
                                  pos="absolute"
                                  top={4}
                                  right={4}
                                >
                                  <IconCheck size={12} />
                                </ThemeIcon>
                              )}
                            </Box>
                          </Card.Section>
                          <Text size="xs" ta="center" mt={4} lineClamp={1}>
                            {texture.name[locale as 'he' | 'en']}
                          </Text>
                        </Card>
                      </UnstyledButton>
                    )
                  })}
                </SimpleGrid>
              )}
            </ScrollArea>
          </Stack>
        </Accordion.Panel>
      </Accordion.Item>

      {/* Materials Selection */}
      <Accordion.Item value="materials">
        <Accordion.Control icon={<IconBox size={20} />}>
          <Group gap="xs">
            <Text fw={600}>חומרים</Text>
            <Badge size="sm" variant="light" color="orange">
              {selectedItems.materials.length}/10
            </Badge>
          </Group>
        </Accordion.Control>
        <Accordion.Panel>
          <Stack gap="md">
            {/* Selected Materials */}
            {selectedItems.materials.length > 0 && (
              <Paper p="sm" radius="md" withBorder>
                <Group gap="xs" wrap="wrap">
                  {selectedItems.materials.map((material) => (
                    <Badge
                      key={material.id}
                      size="lg"
                      variant="light"
                      color="orange"
                      rightSection={
                        <ActionIcon
                          size="xs"
                          radius="xl"
                          variant="transparent"
                          color="orange"
                          onClick={() => removeMaterial(material.id)}
                        >
                          <IconX size={12} />
                        </ActionIcon>
                      }
                    >
                      {material.name[locale as 'he' | 'en']}
                    </Badge>
                  ))}
                </Group>
              </Paper>
            )}

            {/* Search */}
            <TextInput
              placeholder="חפש חומר..."
              leftSection={<IconSearch size={16} />}
              value={materialSearch}
              onChange={(e) => setMaterialSearch(e.target.value)}
            />

            {/* Material Grid */}
            <ScrollArea h={200}>
              {materialsLoading ? (
                <Group justify="center" p="xl">
                  <Loader size="sm" />
                </Group>
              ) : (
                <SimpleGrid cols={2} spacing="sm">
                  {materials.map((material) => {
                    const selected = isMaterialSelected(material.id)
                    return (
                      <UnstyledButton
                        key={material.id}
                        onClick={() => handleMaterialToggle(material)}
                      >
                        <Card
                          padding="sm"
                          radius="md"
                          withBorder
                          style={{
                            borderColor: selected
                              ? 'var(--mantine-color-orange-5)'
                              : undefined,
                            borderWidth: selected ? 2 : 1,
                          }}
                        >
                          <Group gap="sm" wrap="nowrap">
                            <Box w={50} h={50} style={{ flexShrink: 0 }}>
                              {material.assets?.thumbnail ? (
                                <Image
                                  src={material.assets.thumbnail}
                                  w={50}
                                  h={50}
                                  radius="md"
                                  alt={material.name[locale as 'he' | 'en']}
                                  fit="cover"
                                />
                              ) : (
                                <Box
                                  w={50}
                                  h={50}
                                  style={{
                                    backgroundColor: 'var(--mantine-color-gray-2)',
                                    borderRadius: 'var(--mantine-radius-md)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  <IconBox size={20} color="gray" />
                                </Box>
                              )}
                            </Box>
                            <Box style={{ flex: 1, minWidth: 0 }}>
                              <Text size="sm" fw={500} lineClamp={1}>
                                {material.name[locale as 'he' | 'en']}
                              </Text>
                              {material.sku && (
                                <Text size="xs" c="dimmed" lineClamp={1}>
                                  {material.sku}
                                </Text>
                              )}
                            </Box>
                            {selected && (
                              <ThemeIcon size="sm" radius="xl" color="orange">
                                <IconCheck size={12} />
                              </ThemeIcon>
                            )}
                          </Group>
                        </Card>
                      </UnstyledButton>
                    )
                  })}
                </SimpleGrid>
              )}
            </ScrollArea>
          </Stack>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  )
}
