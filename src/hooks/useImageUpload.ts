/**
 * Image Upload Hook
 * Manages image upload state and operations
 */

import { useState, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import type { EntityType } from '@/lib/storage/gcp-storage'

interface UploadImageParams {
  file: File
  entityType: EntityType
  entityId: string
  projectId?: string
  roomId?: string
  roomType?: string
}

interface DeleteImageParams {
  url: string
}

/**
 * Hook for uploading images to R2
 */
export function useImageUpload() {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})

  const uploadMutation = useMutation({
    mutationFn: async ({ file, entityType, entityId, projectId, roomId, roomType }: UploadImageParams) => {
      // Validate file object before creating FormData
      if (!(file instanceof File)) {
        throw new Error('Invalid file object provided')
      }

      if (file.size === 0) {
        throw new Error('File is empty')
      }

      // Validate file is still readable
      try {
        // Check if file has a valid name and type
        if (!file.name || file.name.trim() === '') {
          throw new Error('File name is required')
        }
      } catch (err) {
        throw new Error(`File validation failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }

      // Clone the file to prevent FileSystemFileHandle issues
      // Read the file content and create a new File object
      let fileToUpload: File
      try {
        const arrayBuffer = await file.arrayBuffer()
        fileToUpload = new File([arrayBuffer], file.name, {
          type: file.type,
          lastModified: file.lastModified,
        })
      } catch (err) {
        // If cloning fails, use the original file
        // This might fail if there's a file handle issue, but we'll let the API handle it
        fileToUpload = file
      }

      const formData = new FormData()
      formData.append('file', fileToUpload)
      formData.append('entityType', entityType)
      formData.append('entityId', entityId)
      if (projectId) formData.append('projectId', projectId)
      if (roomId) formData.append('roomId', roomId)
      if (roomType) formData.append('roomType', roomType)

      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to upload image')
      }

      return response.json()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async ({ url }: DeleteImageParams) => {
      const response = await fetch('/api/upload/image', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete image')
      }

      return response.json()
    },
  })

  const uploadImage = useCallback(
    async (params: UploadImageParams): Promise<string> => {
      setUploading(true)
      try {
        const result = await uploadMutation.mutateAsync(params)
        return result.url
      } finally {
        setUploading(false)
      }
    },
    [uploadMutation]
  )

  const deleteImage = useCallback(
    async (url: string): Promise<void> => {
      await deleteMutation.mutateAsync({ url })
    },
    [deleteMutation]
  )

  return {
    uploadImage,
    deleteImage,
    uploading: uploading || uploadMutation.isPending,
    deleting: deleteMutation.isPending,
    uploadError: uploadMutation.error,
    deleteError: deleteMutation.error,
  }
}

