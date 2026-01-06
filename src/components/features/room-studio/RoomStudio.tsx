/**
 * RoomStudio Component
 * Full-screen modal for Kive-style room generation with chat interface
 * Layout: ChatPanel (LEFT) | StudioCanvas (CENTER) | IngredientSidebar (RIGHT)
 */

'use client'

import { useEffect, useCallback, useState, useRef } from 'react'
import { Modal, Flex, Box } from '@mantine/core'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'
import { useRoomStudio, useRoomStudioStore } from '@/hooks/useRoomStudio'
import { useCreditBalance } from '@/hooks/useCredits'
import { StudioHeader } from './StudioHeader'
import { IngredientSidebar } from './IngredientSidebar'
import { StudioCanvas } from './StudioCanvas'
import { SelectedIngredientsBar } from './SelectedIngredientsBar'
import { ChatPanel } from './ChatPanel'
import type {
  ColorItem,
  TextureItem,
  MaterialItem,
  CategoryItem,
  SubCategoryItem,
  ProjectRoom,
  GeneratedImage,
} from './types'

// Message type for chat
interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt?: Date | string
  attachments?: { url: string; type: 'image' }[]
  metadata?: {
    generatedImageUrl?: string
    imageId?: string
    status?: 'approved' | 'discarded' | 'replaced'
  }
}

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
  // Generation handler - returns the preview image (not saved to DB yet)
  onGenerate: (
    roomId: string,
    options: {
      categoryId?: string
      subCategoryId?: string
      colorIds: string[]
      textureIds: string[]
      materialIds: string[]
      customPrompt?: string
      preview?: boolean
    }
  ) => Promise<GeneratedImage | undefined>
  // Approve handler - saves the preview image to DB
  onApprove?: (roomId: string, image: GeneratedImage) => Promise<void>
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
  onApprove,
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
    preSelectedRoomType,
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

  // Chat state
  const [chatMessages, setChatMessages] = useState<Message[]>([])
  const [chatInput, setChatInput] = useState('')
  const [attachedImages, setAttachedImages] = useState<File[]>([])

  // Preview image (not saved to DB yet - pending approval)
  const [previewImage, setPreviewImage] = useState<GeneratedImage | null>(null)
  // Whether we're approving (saving) the preview image
  const [isApproving, setIsApproving] = useState(false)

  // Track if we're in an active session (prevents state reset on room data refresh)
  const isSessionActiveRef = useRef(false)

  // Initialize studio when opened with room data
  useEffect(() => {
    if (opened && room) {
      // Only initialize if this is a NEW session (not a data refresh)
      if (!isSessionActiveRef.current) {
        isSessionActiveRef.current = true
        openStudio({
          roomId: room.id,
          roomName: room.name || room.roomType,
          colorIds: room.overrideColorIds,
          textureIds: room.overrideTextureIds,
          materialIds: room.overrideMaterialIds,
          customPrompt: room.customPrompt || undefined,
        })
        // Reset chat and canvas state for new session
        setChatMessages([])
        setPreviewImage(null)
        setIsApproving(false)
      }
    } else if (!opened) {
      // Modal closed - reset session flag
      isSessionActiveRef.current = false
      closeStudio()
      // Clear state when closing
      setChatMessages([])
      setPreviewImage(null)
      setIsApproving(false)
    }
  }, [opened, room, openStudio, closeStudio])

  // Helper to get localized name
  const getName = useCallback(
    (name: { he: string; en: string }) => (locale === 'he' ? name.he : name.en),
    [locale]
  )

  // Get first base style name (original style)
  const originalStyleName = baseStyles.length > 0 ? getName(baseStyles[0].name) : null

  // Handle attach images
  const handleAttachImages = useCallback((files: File[]) => {
    setAttachedImages((prev) => [...prev, ...files])
  }, [])

  // Handle remove attached image
  const handleRemoveAttachedImage = useCallback((index: number) => {
    setAttachedImages((prev) => prev.filter((_, i) => i !== index))
  }, [])

  // Handle send message (triggers generation)
  const handleSendMessage = useCallback(async () => {
    if (!room || !canGenerate || !chatInput.trim()) return

    // Create user message
    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: chatInput.trim(),
      createdAt: new Date().toISOString(),
      // TODO: Upload attached images and add URLs here
      attachments: [],
    }

    // Add user message to chat
    setChatMessages((prev) => [...prev, userMessage])

    // Clear input
    const promptText = chatInput.trim()
    setChatInput('')
    setAttachedImages([])

    // Update customPrompt in studio state for compatibility
    setCustomPrompt(promptText)

    // Start generation
    setGenerating(true)
    setError(null)

    // Add system message for generating
    const generatingMsgId = uuidv4()
    setChatMessages((prev) => [
      ...prev,
      {
        id: generatingMsgId,
        role: 'system' as const,
        content: t('generatingPreview'),
        createdAt: new Date().toISOString(),
      },
    ])

    try {
      // Generate image with preview mode (don't save to DB yet)
      const generatedImage = await onGenerate(room.id, {
        categoryId: selectedCategoryId || undefined,
        subCategoryId: selectedSubCategoryId || undefined,
        colorIds: selectedColorIds,
        textureIds: selectedTextureIds,
        materialIds: selectedMaterialIds,
        customPrompt: promptText,
        preview: true, // Preview mode - don't save to DB
      })
      setProgress(100)

      // Remove the "generating" system message
      setChatMessages((prev) => prev.filter((m) => m.id !== generatingMsgId))

      if (generatedImage) {
        // If there was a previous preview image, move it to chat as "discarded"
        if (previewImage) {
          setChatMessages((prev) => [
            ...prev,
            {
              id: uuidv4(),
              role: 'assistant' as const,
              content: t('imageReplaced'),
              createdAt: new Date().toISOString(),
              metadata: {
                generatedImageUrl: previewImage.url,
                imageId: previewImage.id,
                status: 'replaced',
              },
            },
          ])
        }

        // Set new image as preview (pending approval)
        setPreviewImage(generatedImage)

        // Add system message about preview ready
        setChatMessages((prev) => [
          ...prev,
          {
            id: uuidv4(),
            role: 'system' as const,
            content: t('previewReady'),
            createdAt: new Date().toISOString(),
          },
        ])
      }
    } catch (error) {
      // Remove the "generating" system message on error
      setChatMessages((prev) => prev.filter((m) => m.id !== generatingMsgId))
      setError(error instanceof Error ? error.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }, [
    room,
    canGenerate,
    chatInput,
    selectedCategoryId,
    selectedSubCategoryId,
    selectedColorIds,
    selectedTextureIds,
    selectedMaterialIds,
    onGenerate,
    setCustomPrompt,
    setGenerating,
    setError,
    setProgress,
    previewImage,
    t,
  ])

  // Handle approve preview image (save to DB)
  const handleApprove = useCallback(async () => {
    if (!room || !previewImage || !onApprove) return

    setIsApproving(true)
    try {
      await onApprove(room.id, previewImage)

      // Add success message to chat
      setChatMessages((prev) => [
        ...prev,
        {
          id: uuidv4(),
          role: 'assistant' as const,
          content: t('imageApproved'),
          createdAt: new Date().toISOString(),
          metadata: {
            generatedImageUrl: previewImage.url,
            imageId: previewImage.id,
            status: 'approved',
          },
        },
      ])

      // Clear preview
      setPreviewImage(null)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to save image')
    } finally {
      setIsApproving(false)
    }
  }, [room, previewImage, onApprove, t, setError])

  // Handle discard preview image (don't save, keep in chat history)
  const handleDiscard = useCallback(() => {
    if (!previewImage) return

    // Add discarded message to chat (image URL remains valid from GCP)
    setChatMessages((prev) => [
      ...prev,
      {
        id: uuidv4(),
        role: 'assistant' as const,
        content: t('imageDiscarded'),
        createdAt: new Date().toISOString(),
        metadata: {
          generatedImageUrl: previewImage.url,
          imageId: previewImage.id,
          status: 'discarded',
        },
      },
    ])

    // Clear preview
    setPreviewImage(null)
  }, [previewImage, t])

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
      <Flex direction="column" h="100vh">
        {/* Header - Without Generate Button */}
        <StudioHeader
          roomType={room?.roomType || t('untitledRoom')}
          originalStyleName={originalStyleName}
          onClose={handleClose}
          creditBalance={credits?.balance || 0}
        />

        {/* Main Content - 3 columns: Chat | Canvas | Ingredients */}
        <Flex flex={1} style={{ overflow: 'hidden' }}>
          {/* LEFT - Chat Panel */}
          <ChatPanel
            messages={chatMessages}
            input={chatInput}
            onInputChange={setChatInput}
            onSend={handleSendMessage}
            attachedImages={attachedImages}
            onAttachImages={handleAttachImages}
            onRemoveImage={handleRemoveAttachedImage}
            isGenerating={isGenerating}
            canGenerate={canGenerate}
            error={generationError}
            locale={locale}
          />

          {/* CENTER - Canvas */}
          <StudioCanvas
            room={room}
            isGenerating={isGenerating}
            progress={generationProgress}
            error={generationError}
            previewImage={previewImage}
            isApproving={isApproving}
            onApprove={handleApprove}
            onDiscard={handleDiscard}
            onDone={handleClose}
          />

          {/* RIGHT - Ingredients Sidebar */}
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
        </Flex>

        {/* Bottom Bar - Selected Ingredients + Reference Images */}
        <SelectedIngredientsBar
          colors={selectedColors}
          textures={selectedTextures}
          materials={selectedMaterials}
          referenceImages={room?.generatedImages || []}
          onRemove={handleRemoveIngredient}
          locale={locale}
        />
      </Flex>
    </Modal>
  )
}
