/**
 * RoomStudio Component
 * Full-screen modal for Kive-style room generation with ingredient selection
 */

'use client'

import { useEffect, useCallback, useState } from 'react'
import { Modal, Flex, Box, LoadingOverlay } from '@mantine/core'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import { useRoomStudio, useRoomStudioStore } from '@/hooks/useRoomStudio'
import { useCreditBalance } from '@/hooks/useCredits'
import { StudioHeader } from './StudioHeader'
import { IngredientSidebar } from './IngredientSidebar'
import { StudioCanvas } from './StudioCanvas'
import { SelectedIngredientsBar } from './SelectedIngredientsBar'
import type {
  ColorItem,
  TextureItem,
  MaterialItem,
  CategoryItem,
  SubCategoryItem,
  ProjectRoom,
} from './types'

interface BaseStyle {
  id: string
  name: { he: string; en: string }
  slug: string
}

interface RoomStudioProps {
  opened: boolean
  onClose: () => void
  room?: ProjectRoom
  // Base styles (for showing original style name)
  baseStyles?: BaseStyle[]
  // Available ingredients from project style
  availableColors: ColorItem[]
  availableTextures: TextureItem[]
  availableMaterials: MaterialItem[]
  // Category options
  categories: CategoryItem[]
  subCategories: SubCategoryItem[]
  // Generation handler
  onGenerate: (
    roomId: string,
    options: {
      categoryId?: string
      subCategoryId?: string
      colorIds: string[]
      textureIds: string[]
      materialIds: string[]
      customPrompt?: string
      roomPart?: string
    }
  ) => Promise<void>
  isGenerating?: boolean
  // Modals handlers
  onAddFromLibrary?: (type: 'color' | 'texture' | 'material') => void
  onCreateCustom?: (type: 'color' | 'texture' | 'material') => void
}

export function RoomStudio({
  opened,
  onClose,
  room,
  baseStyles = [],
  availableColors,
  availableTextures,
  availableMaterials,
  categories,
  subCategories,
  onGenerate,
  isGenerating = false,
  onAddFromLibrary,
  onCreateCustom,
}: RoomStudioProps) {
  const t = useTranslations('projectStyle.studio')
  const params = useParams()
  const locale = (params?.locale as string) || 'he'

  // Credit balance
  const { data: credits } = useCreditBalance()

  // Room studio state
  const {
    isOpen,
    roomId,
    selectedCategoryId,
    selectedSubCategoryId,
    selectedColorIds,
    selectedTextureIds,
    selectedMaterialIds,
    customPrompt,
    generationProgress,
    generationError,
    canGenerate,
    selectedCounts,
    openStudio,
    closeStudio,
    setCategory,
    setSubCategory,
    toggleColor,
    toggleTexture,
    toggleMaterial,
    setCustomPrompt,
    setGenerating,
    setProgress,
    setError,
  } = useRoomStudio()

  // Room part state
  const [selectedRoomPart, setSelectedRoomPart] = useState<string | null>(null)

  // Initialize studio when opened with room data
  useEffect(() => {
    if (opened && room) {
      openStudio({
        roomId: room.id,
        roomName: room.name || room.roomType,
        colorIds: room.overrideColorIds,
        textureIds: room.overrideTextureIds,
        materialIds: room.overrideMaterialIds,
        customPrompt: room.customPrompt || undefined,
      })
    } else if (!opened) {
      closeStudio()
    }
  }, [opened, room, openStudio, closeStudio])

  // Helper to get localized name
  const getName = useCallback(
    (name: { he: string; en: string }) => (locale === 'he' ? name.he : name.en),
    [locale]
  )

  // Get first base style name (original style)
  const originalStyleName = baseStyles.length > 0 ? getName(baseStyles[0].name) : null

  // Handle generate
  const handleGenerate = useCallback(async () => {
    if (!room || !canGenerate) return

    setGenerating(true)
    setError(null)

    try {
      await onGenerate(room.id, {
        categoryId: selectedCategoryId || undefined,
        subCategoryId: selectedSubCategoryId || undefined,
        colorIds: selectedColorIds,
        textureIds: selectedTextureIds,
        materialIds: selectedMaterialIds,
        customPrompt: customPrompt || undefined,
        roomPart: selectedRoomPart || undefined,
      })
      setProgress(100)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }, [
    room,
    canGenerate,
    selectedCategoryId,
    selectedSubCategoryId,
    selectedColorIds,
    selectedTextureIds,
    selectedMaterialIds,
    customPrompt,
    selectedRoomPart,
    onGenerate,
    setGenerating,
    setError,
    setProgress,
  ])

  // Handle close
  const handleClose = useCallback(() => {
    closeStudio()
    onClose()
  }, [closeStudio, onClose])

  // Remove ingredient
  const handleRemoveIngredient = useCallback(
    (type: 'color' | 'texture' | 'material', id: string) => {
      switch (type) {
        case 'color':
          toggleColor(id)
          break
        case 'texture':
          toggleTexture(id)
          break
        case 'material':
          toggleMaterial(id)
          break
      }
    },
    [toggleColor, toggleTexture, toggleMaterial]
  )

  // Get selected items with full data
  const selectedColors = availableColors.filter((c) =>
    selectedColorIds.includes(c.id)
  )
  const selectedTextures = availableTextures.filter((t) =>
    selectedTextureIds.includes(t.id)
  )
  const selectedMaterials = availableMaterials.filter((m) =>
    selectedMaterialIds.includes(m.id)
  )

  // Filter subcategories by selected category
  const filteredSubCategories = selectedCategoryId
    ? subCategories.filter((sc) => sc.categoryId === selectedCategoryId)
    : subCategories

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      fullScreen
      withCloseButton={false}
      padding={0}
      styles={{
        body: {
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <LoadingOverlay
        visible={isGenerating}
        zIndex={1000}
        overlayProps={{ blur: 2 }}
        loaderProps={{ type: 'bars' }}
      />

      <Flex direction="column" h="100vh">
        {/* Header */}
        <StudioHeader
          roomType={room?.roomType || t('untitledRoom')}
          originalStyleName={originalStyleName}
          onClose={handleClose}
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
          canGenerate={canGenerate}
          creditBalance={credits?.balance || 0}
        />

        {/* Main Content */}
        <Flex flex={1} style={{ overflow: 'hidden' }}>
          {/* Left Sidebar - Ingredients */}
          <IngredientSidebar
            // Category
            categories={categories}
            subCategories={filteredSubCategories}
            selectedCategoryId={selectedCategoryId}
            selectedSubCategoryId={selectedSubCategoryId}
            onSelectCategory={setCategory}
            onSelectSubCategory={setSubCategory}
            // Colors
            availableColors={availableColors}
            selectedColorIds={selectedColorIds}
            onToggleColor={toggleColor}
            // Textures
            availableTextures={availableTextures}
            selectedTextureIds={selectedTextureIds}
            onToggleTexture={toggleTexture}
            // Materials
            availableMaterials={availableMaterials}
            selectedMaterialIds={selectedMaterialIds}
            onToggleMaterial={toggleMaterial}
            // Custom actions
            onAddFromLibrary={onAddFromLibrary}
            onCreateCustom={onCreateCustom}
            // Locale
            locale={locale}
          />

          {/* Center - Canvas */}
          <StudioCanvas
            room={room}
            isGenerating={isGenerating}
            progress={generationProgress}
            error={generationError}
            customPrompt={customPrompt}
            onCustomPromptChange={setCustomPrompt}
            selectedRoomPart={selectedRoomPart}
            onRoomPartChange={setSelectedRoomPart}
            locale={locale}
          />
        </Flex>

        {/* Bottom Bar - Selected Ingredients */}
        <SelectedIngredientsBar
          colors={selectedColors}
          textures={selectedTextures}
          materials={selectedMaterials}
          onRemove={handleRemoveIngredient}
          locale={locale}
        />
      </Flex>
    </Modal>
  )
}
