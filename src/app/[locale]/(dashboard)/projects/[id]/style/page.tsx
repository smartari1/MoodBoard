'use client'

import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  Container,
  Title,
  Group,
  Button,
  Stack,
  Text,
  ActionIcon,
  Skeleton,
  Alert,
} from '@mantine/core'
import {
  IconArrowLeft,
  IconShare,
  IconDownload,
} from '@tabler/icons-react'
import { useProjectStyleWithUI } from '@/hooks/useProjectStyle'
import { useCreditBalance } from '@/hooks/useCredits'
import { useCategories, useSubCategories } from '@/hooks/useCategories'
import { useRoomTypes } from '@/hooks/useRoomTypes'
import { CreditBalance } from '@/components/ui/CreditBalance'

// Components (to be created)
import { StylePageHeader } from './components/StylePageHeader'
import { EmptyState } from './components/EmptyState'
import { ElementsSection } from './components/ElementsSection'
import { RoomsSection } from './components/RoomsSection'
import { BaseStyleSelector } from './components/BaseStyleSelector'
import { AddElementModal } from './components/AddElementModal'
import { GenerateRoomModal } from './components/GenerateRoomModal'
import { AddRoomModal } from './components/AddRoomModal'
import { SourcedStylesSection } from './components/SourcedStylesSection'
import { RoomStudio } from '@/components/features/room-studio'

export default function ProjectStylePage() {
  const params = useParams()
  const router = useRouter()
  const t = useTranslations('projectStyle')
  const tCommon = useTranslations('common')

  const projectId = params?.id as string
  const locale = (params?.locale as string) || 'he'

  // Project style state
  const {
    data,
    styleExists,
    style,
    rooms,
    colors,
    textures,
    materials,
    // Multi-style support
    baseStyles,
    baseStyleIds,
    availableTextures,
    availableMaterials,
    project,
    isLoading,
    error,
    // UI state
    activeModal,
    modalData,
    openModal,
    closeModal,
    // Mutations
    createStyle,
    forkStyle,
    updateStyle,
    addColor,
    removeColor,
    addTexture,
    removeTexture,
    addMaterial,
    removeMaterial,
    addRoom,
    deleteRoom,
    generateRoomImage,
    addBaseStyle,
    removeBaseStyle,
    // Loading states
    isCreating,
    isForking,
    isUpdating,
    isAddingRoom,
    isGenerating,
    isAddingBaseStyle,
    isRemovingBaseStyle,
  } = useProjectStyleWithUI(projectId)

  // Credit balance
  const { data: credits } = useCreditBalance()

  // Categories for RoomStudio
  const { data: categoriesData } = useCategories()
  const { data: subCategoriesData } = useSubCategories()

  const categories = categoriesData?.data || []
  const subCategories = subCategoriesData?.data || []

  // Room types for grouping
  const { data: roomTypesData, isLoading: isLoadingRoomTypes } = useRoomTypes()
  const roomTypes = roomTypesData?.data || []

  // Get localized name helper
  const getName = (name: { he: string; en: string }) =>
    locale === 'he' ? name.he : name.en

  // Navigate back to project
  const handleBack = () => {
    router.push(`/${locale}/projects/${projectId}`)
  }

  // Handle starting from a style (fork)
  const handleForkStyle = async (sourceStyleId: string) => {
    try {
      await forkStyle(sourceStyleId)
      closeModal()
    } catch (error) {
      console.error('Fork failed:', error)
    }
  }

  // Handle starting from scratch
  const handleStartFromScratch = async () => {
    try {
      await createStyle({})
      closeModal()
    } catch (error) {
      console.error('Create failed:', error)
    }
  }

  // Handle adding room
  const handleAddRoom = async (roomData: {
    roomType: string
    roomTypeId?: string
    name?: string
    customPrompt?: string
  }) => {
    try {
      await addRoom(roomData)
      closeModal()
    } catch (error) {
      console.error('Add room failed:', error)
    }
  }

  // Handle generating room image (from GenerateRoomModal - deprecated)
  const handleGenerateRoom = async (roomId: string, options?: {
    customPrompt?: string
    overrideColorIds?: string[]
  }) => {
    try {
      await generateRoomImage(roomId, options)
      closeModal()
    } catch (error) {
      console.error('Generate failed:', error)
    }
  }

  // Handle opening studio for a room type (with pre-population)
  const handleOpenStudioForType = (roomTypeId: string, roomType: string) => {
    // Collect reference images from all rooms of this type
    const roomsOfType = rooms.filter(
      (r) => r.roomTypeId === roomTypeId || r.roomType === roomType
    )
    const referenceImages = roomsOfType.flatMap((r) => r.generatedImages || [])

    // Get suggested category/subcategory from first base style
    const firstBaseStyle = baseStyles?.[0]
    const suggestedCategoryId = firstBaseStyle?.category?.id || null
    const suggestedSubCategoryId = firstBaseStyle?.subCategory?.id || null

    // Use roomStudio modal with additional type context
    openModal('roomStudio', {
      roomTypeId,
      roomType,
      referenceImages,
      suggestedCategoryId,
      suggestedSubCategoryId,
    })
  }

  // Handle room studio generation (new full studio)
  const handleRoomStudioGenerate = async (
    roomId: string,
    options: {
      categoryId?: string
      subCategoryId?: string
      colorIds: string[]
      textureIds: string[]
      materialIds: string[]
      customPrompt?: string
    }
  ) => {
    try {
      await generateRoomImage(roomId, {
        customPrompt: options.customPrompt,
        overrideColorIds: options.colorIds,
        overrideTextureIds: options.textureIds,
        overrideMaterialIds: options.materialIds,
      })
      closeModal()
    } catch (error) {
      console.error('Generate failed:', error)
      throw error
    }
  }

  // Handle removing a base style
  const handleRemoveBaseStyle = async (styleId: string) => {
    try {
      await removeBaseStyle(styleId)
    } catch (error) {
      console.error('Remove base style failed:', error)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <Container size="xl" py="xl">
        <Stack gap="lg">
          <Skeleton height={60} />
          <Skeleton height={200} />
          <Skeleton height={300} />
        </Stack>
      </Container>
    )
  }

  // Error state
  if (error) {
    return (
      <Container size="xl" py="xl">
        <Alert color="red" title={tCommon('error')}>
          {error.message}
        </Alert>
      </Container>
    )
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Group justify="space-between" align="flex-start">
          <Group gap="md">
            <ActionIcon variant="subtle" size="lg" onClick={handleBack}>
              <IconArrowLeft size={20} />
            </ActionIcon>
            <Stack gap={4}>
              <Title order={2}>
                {t('pageTitle')}
              </Title>
              <Text c="dimmed" size="sm">
                {project?.name || t('untitledProject')}
                {(project as { client?: { name: string } })?.client && ` • ${(project as { client?: { name: string } }).client?.name}`}
              </Text>
            </Stack>
          </Group>

          <Group gap="sm">
            <CreditBalance />
            {styleExists && (
              <>
                <Button
                  variant="light"
                  leftSection={<IconShare size={16} />}
                  disabled
                >
                  {t('share')}
                </Button>
                <Button
                  variant="light"
                  leftSection={<IconDownload size={16} />}
                  disabled
                >
                  {t('export')}
                </Button>
              </>
            )}
          </Group>
        </Group>

        {/* No Style - Empty State */}
        {!styleExists && (
          <EmptyState
            onSelectStyle={() => openModal('selectStyle')}
            onStartFromScratch={handleStartFromScratch}
            isCreating={isCreating}
          />
        )}

        {/* Style Exists - Show Content */}
        {styleExists && style && (
          <>
            {/* Sourced Styles Section - Visual Cards */}
            <SourcedStylesSection
              styles={baseStyles || []}
              locale={locale}
              onRemove={handleRemoveBaseStyle}
              onAddStyle={() => openModal('addBaseStyle')}
              isRemoving={isRemovingBaseStyle}
              isAdding={isAddingBaseStyle}
            />

            {/* Design Elements */}
            <ElementsSection
              colors={colors}
              textures={textures}
              materials={materials}
              onAddColor={() => openModal('addColor')}
              onAddTexture={() => openModal('addTexture')}
              onAddMaterial={() => openModal('addMaterial')}
              onRemoveColor={removeColor}
              onRemoveTexture={removeTexture}
              onRemoveMaterial={removeMaterial}
            />

            {/* Rooms */}
            <RoomsSection
              rooms={rooms}
              roomTypes={roomTypes}
              onAddRoom={(roomTypeId) => openModal('addRoom', { roomTypeId })}
              onGenerateRoom={(roomId) => openModal('roomStudio', { roomId })}
              onOpenStudioForType={handleOpenStudioForType}
              onDeleteRoom={deleteRoom}
              isGenerating={isGenerating}
              isLoadingRoomTypes={isLoadingRoomTypes}
              locale={locale}
            />
          </>
        )}
      </Stack>

      {/* Modals */}
      <BaseStyleSelector
        opened={activeModal === 'selectStyle'}
        onClose={closeModal}
        onSelect={handleForkStyle}
        isLoading={isForking}
      />

      {/* Add Base Style Modal - uses same selector */}
      <BaseStyleSelector
        opened={activeModal === 'addBaseStyle'}
        onClose={closeModal}
        onSelect={async (styleId) => {
          await addBaseStyle(styleId)
          closeModal()
        }}
        isLoading={isAddingBaseStyle}
        excludeIds={baseStyleIds}
      />

      <AddElementModal
        type={activeModal === 'addColor' ? 'color' : activeModal === 'addTexture' ? 'texture' : 'material'}
        opened={activeModal === 'addColor' || activeModal === 'addTexture' || activeModal === 'addMaterial'}
        onClose={closeModal}
        onAdd={
          activeModal === 'addColor'
            ? async (id: string) => { await addColor(id) }
            : activeModal === 'addTexture'
            ? async (id: string) => { await addTexture(id) }
            : async (id: string) => { await addMaterial(id) }
        }
        onRemove={
          activeModal === 'addColor'
            ? async (id: string) => { await removeColor(id) }
            : activeModal === 'addTexture'
            ? async (id: string) => { await removeTexture(id) }
            : async (id: string) => { await removeMaterial(id) }
        }
        existingIds={
          activeModal === 'addColor'
            ? style?.colorIds || []
            : activeModal === 'addTexture'
            ? style?.textureIds || []
            : style?.materialIds || []
        }
      />

      <AddRoomModal
        opened={activeModal === 'addRoom'}
        onClose={closeModal}
        onAdd={handleAddRoom}
        isLoading={isAddingRoom}
        preSelectedRoomTypeId={modalData.roomTypeId as string | undefined}
      />

      {/* Legacy - kept for backwards compatibility */}
      <GenerateRoomModal
        opened={activeModal === 'generateRoom'}
        onClose={closeModal}
        roomId={modalData.roomId as string}
        room={rooms.find(r => r.id === modalData.roomId)}
        colors={colors}
        onGenerate={handleGenerateRoom}
        isGenerating={isGenerating}
        creditBalance={credits?.balance || 0}
      />

      {/* Room Studio - Full screen ingredient selection and generation */}
      <RoomStudio
        opened={activeModal === 'roomStudio'}
        onClose={closeModal}
        room={rooms.find(r => r.id === modalData.roomId)}
        // Base styles for showing original style name
        baseStyles={baseStyles}
        // Available ingredients from project style (use project-level + base style aggregated)
        availableColors={colors}
        availableTextures={[...textures, ...availableTextures.filter(at => !textures.some(t => t.id === at.id))]}
        availableMaterials={[...materials, ...availableMaterials.filter(am => !materials.some(m => m.id === am.id))]}
        // Category options
        categories={categories.map(c => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
        }))}
        subCategories={subCategories.map(sc => ({
          id: sc.id,
          name: sc.name,
          slug: sc.slug,
          categoryId: sc.categoryId,
        }))}
        // Generation
        onGenerate={handleRoomStudioGenerate}
        isGenerating={isGenerating}
      />
    </Container>
  )
}
