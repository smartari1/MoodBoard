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
  Paper,
  ActionIcon,
  Badge,
  Skeleton,
  Alert,
  Center,
  Box,
} from '@mantine/core'
import {
  IconArrowLeft,
  IconPalette,
  IconShare,
  IconDownload,
  IconPlus,
  IconBuildingStore,
  IconSparkles,
  IconInfoCircle,
} from '@tabler/icons-react'
import { useProjectStyleWithUI } from '@/hooks/useProjectStyle'
import { useCreditBalance } from '@/hooks/useCredits'
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

export default function ProjectStylePage() {
  const params = useParams()
  const router = useRouter()
  const t = useTranslations('projectStyle')
  const tCommon = useTranslations('common')

  const projectId = params.id as string
  const locale = params.locale as string

  // Project style state
  const {
    data,
    styleExists,
    style,
    rooms,
    colors,
    textures,
    materials,
    baseStyle,
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
    // Loading states
    isCreating,
    isForking,
    isUpdating,
    isAddingRoom,
    isGenerating,
  } = useProjectStyleWithUI(projectId)

  // Credit balance
  const { data: credits } = useCreditBalance()

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

  // Handle generating room image
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
                {project?.client && ` • ${project.client.name}`}
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
            {/* Base Style Info */}
            {baseStyle && (
              <Paper p="md" radius="md" withBorder>
                <Group justify="space-between">
                  <Group gap="sm">
                    <IconPalette size={20} />
                    <Text fw={500}>{t('basedOn')}</Text>
                    <Badge variant="light" size="lg">
                      {baseStyle.name?.he || baseStyle.name?.en}
                    </Badge>
                  </Group>
                  <Button
                    variant="subtle"
                    size="xs"
                    onClick={() => openModal('selectStyle')}
                  >
                    {t('changeBase')}
                  </Button>
                </Group>
              </Paper>
            )}

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
              onAddRoom={() => openModal('addRoom')}
              onGenerateRoom={(roomId) => openModal('generateRoom', { roomId })}
              onDeleteRoom={deleteRoom}
              isGenerating={isGenerating}
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

      <AddElementModal
        type={activeModal === 'addColor' ? 'color' : activeModal === 'addTexture' ? 'texture' : 'material'}
        opened={activeModal === 'addColor' || activeModal === 'addTexture' || activeModal === 'addMaterial'}
        onClose={closeModal}
        onAdd={
          activeModal === 'addColor'
            ? addColor
            : activeModal === 'addTexture'
            ? addTexture
            : addMaterial
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
      />

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
    </Container>
  )
}
