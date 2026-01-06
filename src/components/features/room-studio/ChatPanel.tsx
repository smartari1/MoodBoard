/**
 * ChatPanel Component
 * Left panel with chat-like interface for prompt input and image uploads
 */

'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Box,
  Stack,
  Text,
  Paper,
  Textarea,
  ActionIcon,
  Group,
  Image,
  CloseButton,
  FileButton,
  ScrollArea,
  Loader,
  Alert,
  Tooltip,
} from '@mantine/core'
import {
  IconSend,
  IconPaperclip,
  IconSparkles,
  IconAlertCircle,
  IconPhoto,
} from '@tabler/icons-react'
import { useTranslations } from 'next-intl'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt?: Date | string
  attachments?: { url: string; type: 'image' }[]
  metadata?: {
    generatedImageUrl?: string
  }
}

interface ChatPanelProps {
  messages: Message[]
  input: string
  onInputChange: (value: string) => void
  onSend: () => void
  attachedImages: File[]
  onAttachImages: (files: File[]) => void
  onRemoveImage: (index: number) => void
  isGenerating: boolean
  canGenerate: boolean
  error?: string | null
  locale: string
}

export function ChatPanel({
  messages,
  input,
  onInputChange,
  onSend,
  attachedImages,
  onAttachImages,
  onRemoveImage,
  isGenerating,
  canGenerate,
  error,
  locale,
}: ChatPanelProps) {
  const t = useTranslations('projectStyle.studio.chat')
  const tStudio = useTranslations('projectStyle.studio')
  const scrollRef = useRef<HTMLDivElement>(null)
  const [imagePreviews, setImagePreviews] = useState<string[]>([])

  // Generate preview URLs for attached images
  useEffect(() => {
    const previews = attachedImages.map((file) => URL.createObjectURL(file))
    setImagePreviews(previews)

    // Cleanup
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [attachedImages])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    }
  }, [messages])

  // Handle file selection
  const handleFileSelect = (files: File[] | null) => {
    if (files && files.length > 0) {
      // Filter for images only
      const imageFiles = files.filter((file) => file.type.startsWith('image/'))
      onAttachImages(imageFiles)
    }
  }

  // Handle send
  const handleSend = () => {
    if (!canGenerate || isGenerating || !input.trim()) return
    onSend()
  }

  // Handle key press (Enter to send, Shift+Enter for new line)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <Box
      w={280}
      h="100%"
      style={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--mantine-color-gray-0)',
        borderInlineEnd: '1px solid var(--mantine-color-gray-2)',
      }}
    >
      {/* Header */}
      <Box
        p="sm"
        style={{
          borderBottom: '1px solid var(--mantine-color-gray-2)',
          backgroundColor: 'var(--mantine-color-white)',
        }}
      >
        <Group gap="xs">
          <IconSparkles size={18} color="var(--mantine-color-brand-6)" />
          <Text fw={600} size="sm">
            {t('title')}
          </Text>
        </Group>
      </Box>

      {/* Messages Area */}
      <ScrollArea flex={1} p="sm" viewportRef={scrollRef}>
        <Stack gap="sm">
          {messages.length === 0 ? (
            // Empty state
            <Box py="xl" ta="center">
              <Stack align="center" gap="xs">
                <IconPhoto size={40} color="var(--mantine-color-gray-4)" />
                <Text size="sm" c="dimmed">
                  {t('emptyState')}
                </Text>
              </Stack>
            </Box>
          ) : (
            // Messages
            messages.map((message) => (
              <Paper
                key={message.id}
                p="sm"
                radius="md"
                style={{
                  backgroundColor:
                    message.role === 'user'
                      ? 'var(--mantine-color-brand-0)'
                      : 'var(--mantine-color-white)',
                  alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '90%',
                }}
              >
                <Stack gap="xs">
                  <Text size="sm" style={{ direction: 'rtl', whiteSpace: 'pre-wrap' }}>
                    {message.content}
                  </Text>

                  {/* Show attached images */}
                  {message.attachments && message.attachments.length > 0 && (
                    <Group gap="xs">
                      {message.attachments.map((attachment, idx) => (
                        <Image
                          key={idx}
                          src={attachment.url}
                          alt={`Attachment ${idx + 1}`}
                          w={60}
                          h={60}
                          radius="sm"
                          fit="cover"
                        />
                      ))}
                    </Group>
                  )}

                  {/* Show generated image */}
                  {message.metadata?.generatedImageUrl && (
                    <Image
                      src={message.metadata.generatedImageUrl}
                      alt="Generated"
                      w="100%"
                      radius="sm"
                      fit="cover"
                    />
                  )}
                </Stack>
              </Paper>
            ))
          )}

          {/* Generating indicator */}
          {isGenerating && (
            <Paper
              p="sm"
              radius="md"
              style={{
                backgroundColor: 'var(--mantine-color-white)',
                alignSelf: 'flex-start',
                maxWidth: '90%',
              }}
            >
              <Group gap="xs">
                <Loader size="xs" />
                <Text size="sm" c="dimmed">
                  {tStudio('generating')}
                </Text>
              </Group>
            </Paper>
          )}
        </Stack>
      </ScrollArea>

      {/* Attached Images Preview */}
      {attachedImages.length > 0 && (
        <Box
          px="sm"
          py="xs"
          style={{
            borderTop: '1px solid var(--mantine-color-gray-2)',
            backgroundColor: 'var(--mantine-color-white)',
          }}
        >
          <ScrollArea scrollbarSize={4}>
            <Group gap="xs" wrap="nowrap">
              {imagePreviews.map((preview, index) => (
                <Box
                  key={index}
                  pos="relative"
                  style={{
                    flexShrink: 0,
                  }}
                >
                  <Image
                    src={preview}
                    alt={`Preview ${index + 1}`}
                    w={50}
                    h={50}
                    radius="sm"
                    fit="cover"
                  />
                  <CloseButton
                    size="xs"
                    radius="xl"
                    variant="filled"
                    color="dark"
                    pos="absolute"
                    top={-6}
                    right={-6}
                    onClick={() => onRemoveImage(index)}
                  />
                </Box>
              ))}
            </Group>
          </ScrollArea>
        </Box>
      )}

      {/* Error Alert */}
      {error && (
        <Alert
          icon={<IconAlertCircle size={14} />}
          color="red"
          variant="light"
          mx="sm"
          mb="xs"
          p="xs"
        >
          <Text size="xs">{error}</Text>
        </Alert>
      )}

      {/* Input Area */}
      <Box
        p="sm"
        style={{
          borderTop: '1px solid var(--mantine-color-gray-2)',
          backgroundColor: 'var(--mantine-color-white)',
        }}
      >
        <Paper
          p="xs"
          radius="md"
          withBorder
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 8,
          }}
        >
          {/* Attach Button */}
          <FileButton
            onChange={handleFileSelect}
            accept="image/*"
            multiple
            disabled={isGenerating}
          >
            {(props) => (
              <Tooltip label={t('attachImage')}>
                <ActionIcon
                  {...props}
                  variant="subtle"
                  color="gray"
                  size="lg"
                  disabled={isGenerating}
                >
                  <IconPaperclip size={18} />
                </ActionIcon>
              </Tooltip>
            )}
          </FileButton>

          {/* Input */}
          <Textarea
            placeholder={t('placeholder')}
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isGenerating}
            autosize
            minRows={1}
            maxRows={4}
            style={{ flex: 1 }}
            styles={{
              input: {
                direction: 'rtl',
                border: 'none',
                padding: 0,
                minHeight: 'auto',
                '&:focus': {
                  border: 'none',
                },
              },
            }}
          />

          {/* Send Button */}
          <Tooltip label={t('send')}>
            <ActionIcon
              variant="filled"
              color="brand"
              size="lg"
              onClick={handleSend}
              disabled={!canGenerate || isGenerating || !input.trim()}
              loading={isGenerating}
            >
              <IconSend size={18} />
            </ActionIcon>
          </Tooltip>
        </Paper>

        {/* Credits hint */}
        {!canGenerate && !isGenerating && (
          <Text size="xs" c="red" mt="xs" ta="center">
            {tStudio('insufficientCredits')}
          </Text>
        )}
      </Box>
    </Box>
  )
}
