/**
 * Image Upload Component
 * Reusable component for uploading single or multiple images with drag & drop support
 */

'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import {
  Group,
  Stack,
  Paper,
  Image,
  ActionIcon,
  Text,
  Button,
  Alert,
  SimpleGrid,
  LoadingOverlay,
  Box,
} from '@mantine/core'
import { Dropzone, IMAGE_MIME_TYPE, FileWithPath } from '@mantine/dropzone'
import { IconX, IconPhoto, IconUpload, IconAlertCircle } from '@tabler/icons-react'
import { useImageUpload } from '@/hooks/useImageUpload'
import type { EntityType } from '@/lib/storage/r2'
import { validateImageFile, MAX_IMAGE_SIZE } from '@/lib/validations/upload'

interface ImageUploadProps {
  /** Current image URLs */
  value?: string[]
  /** Callback when images change */
  onChange?: (images: string[]) => void
  /** Callback for pending files (when entityId is empty - for creation flow) */
  onPendingFilesChange?: (files: File[]) => void
  /** Entity type for upload */
  entityType: EntityType
  /** Entity ID - empty string for creation mode */
  entityId: string
  /** Project ID (required for room type) */
  projectId?: string
  /** Room ID (required for room type) */
  roomId?: string
  /** Room Type (for room profiles within styles) */
  roomType?: string
  /** Maximum number of images allowed */
  maxImages?: number
  /** Whether to allow multiple images */
  multiple?: boolean
  /** Label for the upload area */
  label?: string
  /** Error message */
  error?: string
  /** Disabled state */
  disabled?: boolean
}

export function ImageUpload({
  value = [],
  onChange,
  onPendingFilesChange,
  entityType,
  entityId,
  projectId,
  roomId,
  roomType,
  maxImages = 20,
  multiple = true,
  label,
  error,
  disabled = false,
}: ImageUploadProps) {
  const { uploadImage, deleteImage, uploading, deleting } = useImageUpload()
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({})
  const [pendingFiles, setPendingFiles] = useState<File[]>([]) // Store files when entityId is empty
  const previewUrlsRef = useRef<Set<string>>(new Set()) // Track preview URLs for cleanup
  
  // Check if we're in creation mode (no entityId)
  const isCreationMode = !entityId || entityId === ''

  // Cleanup object URLs on unmount or when value changes
  useEffect(() => {
    // Find preview URLs (blob URLs) that are no longer in value
    const currentPreviewUrls = new Set(
      value.filter((url) => url.startsWith('blob:'))
    )
    
    // Revoke URLs that are no longer needed
    previewUrlsRef.current.forEach((url) => {
      if (!currentPreviewUrls.has(url)) {
        URL.revokeObjectURL(url)
        previewUrlsRef.current.delete(url)
      }
    })
    
    // Add new preview URLs to tracking set
    currentPreviewUrls.forEach((url) => {
      if (!previewUrlsRef.current.has(url)) {
        previewUrlsRef.current.add(url)
      }
    })
  }, [value])

  // Cleanup all preview URLs on unmount
  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((url) => {
        URL.revokeObjectURL(url)
      })
      previewUrlsRef.current.clear()
    }
  }, [])

  const handleDrop = useCallback(
    async (files: FileWithPath[]) => {
      if (!onChange) return

      const filesToUpload = multiple ? files : files.slice(0, 1)
      const currentCount = value.length

      if (currentCount + filesToUpload.length > maxImages) {
        setUploadErrors({
          general: `Maximum ${maxImages} images allowed. You can upload ${maxImages - currentCount} more.`,
        })
        return
      }

      // If in creation mode (no entityId), store files locally and create preview URLs
      if (isCreationMode) {
        const validFiles: File[] = []
        const previewUrls: string[] = []
        const errors: Record<string, string> = {}

        for (const file of filesToUpload) {
          // Validate file
          const validation = validateImageFile(file)
          if (!validation.valid) {
            errors[file.name] = validation.error || 'Invalid file'
            continue
          }

          validFiles.push(file)
          // Create preview URL
          const previewUrl = URL.createObjectURL(file)
          previewUrls.push(previewUrl)
          previewUrlsRef.current.add(previewUrl)
        }

        if (Object.keys(errors).length > 0) {
          setUploadErrors(errors)
        } else {
          setUploadErrors({})
        }

        if (validFiles.length > 0) {
          // Store files for later upload
          const newPendingFiles = [...pendingFiles, ...validFiles]
          setPendingFiles(newPendingFiles)
          if (onPendingFilesChange) {
            onPendingFilesChange(newPendingFiles)
          }

          // Update preview URLs
          onChange(multiple ? [...value, ...previewUrls] : previewUrls)
        }
        return
      }

      // Normal upload mode (entityId exists)
      const newImages: string[] = []
      const errors: Record<string, string> = {}

      for (const file of filesToUpload) {
        // Validate file
        const validation = validateImageFile(file)
        if (!validation.valid) {
          errors[file.name] = validation.error || 'Invalid file'
          continue
        }

        try {
          const url = await uploadImage({
            file,
            entityType,
            entityId,
            projectId,
            roomId,
            roomType,
          })
          newImages.push(url)
        } catch (err) {
          errors[file.name] = err instanceof Error ? err.message : 'Upload failed'
        }
      }

      if (Object.keys(errors).length > 0) {
        setUploadErrors(errors)
      } else {
        setUploadErrors({})
      }

      if (newImages.length > 0) {
        onChange(multiple ? [...value, ...newImages] : newImages)
      }
    },
    [value, onChange, onPendingFilesChange, entityType, entityId, projectId, roomId, roomType, maxImages, multiple, uploadImage, isCreationMode, pendingFiles]
  )

  const handleRemove = useCallback(
    async (urlToRemove: string) => {
      if (!onChange) return

      // If in creation mode, just remove from preview and pending files
      if (isCreationMode) {
        const index = value.indexOf(urlToRemove)
        if (index !== -1) {
          // Remove from preview URLs
          const newUrls = value.filter((url) => url !== urlToRemove)
          onChange(newUrls)

          // Remove corresponding file from pending files
          if (pendingFiles[index]) {
            const newPendingFiles = pendingFiles.filter((_, i) => i !== index)
            setPendingFiles(newPendingFiles)
            if (onPendingFilesChange) {
              onPendingFilesChange(newPendingFiles)
            }
          }

          // Revoke object URL to free memory
          if (urlToRemove.startsWith('blob:')) {
            URL.revokeObjectURL(urlToRemove)
            previewUrlsRef.current.delete(urlToRemove)
          }
        }
        return
      }

      // Normal delete mode (entityId exists)
      try {
        await deleteImage(urlToRemove)
        onChange(value.filter((url) => url !== urlToRemove))
      } catch (err) {
        // Show error but don't remove from UI if delete fails
        setUploadErrors({
          delete: err instanceof Error ? err.message : 'Failed to delete image',
        })
      }
    },
    [value, onChange, deleteImage, isCreationMode, pendingFiles, onPendingFilesChange]
  )

  const canUploadMore = value.length < maxImages
  const maxSizeMB = MAX_IMAGE_SIZE / 1024 / 1024

  return (
    <Stack gap="sm">
      {label && (
        <Text size="sm" fw={500}>
          {label}
        </Text>
      )}

      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" title="Error">
          {error}
        </Alert>
      )}

      {uploadErrors.general && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" title="Upload Error">
          {uploadErrors.general}
        </Alert>
      )}

      {uploadErrors.delete && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" title="Delete Error">
          {uploadErrors.delete}
        </Alert>
      )}

      {/* Dropzone */}
      {canUploadMore && !disabled && (
        <Box pos="relative">
          <LoadingOverlay visible={uploading} zIndex={1000} overlayProps={{ radius: 'sm', blur: 2 }} />
          <Dropzone
            onDrop={handleDrop}
            accept={IMAGE_MIME_TYPE}
            maxSize={MAX_IMAGE_SIZE}
            multiple={multiple}
            disabled={disabled || uploading}
            styles={{
              root: {
                border: '2px dashed var(--mantine-color-gray-4)',
                borderRadius: 'var(--mantine-radius-md)',
                padding: 'var(--mantine-spacing-xl)',
                backgroundColor: 'var(--mantine-color-gray-0)',
                cursor: disabled || uploading ? 'not-allowed' : 'pointer',
                '&:hover': {
                  backgroundColor: disabled || uploading ? undefined : 'var(--mantine-color-gray-1)',
                },
              },
            }}
          >
            <Group justify="center" gap="xl" mih={100} style={{ pointerEvents: 'none' }}>
              <Dropzone.Accept>
                <IconUpload size={52} stroke={1.5} color="var(--mantine-color-blue-6)" />
              </Dropzone.Accept>
              <Dropzone.Reject>
                <IconX size={52} stroke={1.5} color="var(--mantine-color-red-6)" />
              </Dropzone.Reject>
              <Dropzone.Idle>
                <IconPhoto size={52} stroke={1.5} color="var(--mantine-color-dimmed)" />
              </Dropzone.Idle>

              <div>
                <Text size="xl" inline>
                  {multiple ? 'Drag images here or click to select' : 'Drag image here or click to select'}
                </Text>
                <Text size="sm" c="dimmed" inline mt={7}>
                  {multiple
                    ? `Upload up to ${maxImages} images (max ${maxSizeMB}MB each)`
                    : `Upload one image (max ${maxSizeMB}MB)`}
                </Text>
              </div>
            </Group>
          </Dropzone>
        </Box>
      )}

      {/* Image Grid */}
      {value.length > 0 && (
        <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="md">
          {value.map((url, index) => (
            <Paper key={index} p="xs" withBorder pos="relative" radius="md">
              <Box pos="relative" style={{ aspectRatio: '1', overflow: 'hidden', borderRadius: 'var(--mantine-radius-sm)' }}>
                <Image
                  src={url}
                  alt={`Upload ${index + 1}`}
                  fit="cover"
                  style={{ width: '100%', height: '100%' }}
                />
                {!disabled && (
                  <ActionIcon
                    color="red"
                    variant="filled"
                    size="sm"
                    radius="xl"
                    pos="absolute"
                    top={4}
                    right={4}
                    onClick={() => handleRemove(url)}
                    disabled={deleting}
                    style={{ zIndex: 10 }}
                  >
                    <IconX size={14} />
                  </ActionIcon>
                )}
              </Box>
              {uploadErrors[url] && (
                <Text size="xs" c="red" mt={4}>
                  {uploadErrors[url]}
                </Text>
              )}
            </Paper>
          ))}
        </SimpleGrid>
      )}

      {value.length === 0 && !canUploadMore && (
        <Text size="sm" c="dimmed" ta="center" py="md">
          Maximum {maxImages} images reached. Remove some to upload more.
        </Text>
      )}
    </Stack>
  )
}

