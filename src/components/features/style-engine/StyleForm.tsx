/**
 * Shared StyleForm Component
 * Handles both create and edit modes for style forms
 */

'use client'

import { FormSection, ImageUpload, MoodBCard } from '@/components/ui'
import { useCategories, useSubCategories } from '@/hooks/useCategories'
import { useColors } from '@/hooks/useColors'
import { useImageUpload } from '@/hooks/useImageUpload'
import { useMaterials } from '@/hooks/useMaterials'
import { ROOM_TYPES } from '@/lib/validations/room'
import {
  createStyleFormSchema,
  updateStyleSchema,
  type CreateStyle,
  type UpdateStyle,
} from '@/lib/validations/style'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Group,
  MultiSelect,
  Paper,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import {
  IconAlertCircle,
  IconArrowLeft,
  IconBox,
  IconHome,
  IconPalette,
  IconPlus,
  IconX,
} from '@tabler/icons-react'
import { useTranslations } from 'next-intl'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'

interface StyleFormProps {
  mode: 'create' | 'edit'
  locale: string
  initialData?: any
  onSubmit: (data: CreateStyle | UpdateStyle) => Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
  error?: Error | null
  title?: string
}

export function StyleForm({
  mode,
  locale,
  initialData,
  onSubmit,
  onCancel,
  isSubmitting: externalIsSubmitting,
  error: externalError,
  title,
}: StyleFormProps) {
  const t = useTranslations('admin.styles.create')
  const tCommon = useTranslations('common')
  const tRoomTypes = useTranslations('projects.form.roomTypes')

  const [activeTab, setActiveTab] = useState<string | null>('basic')
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const formRef = useRef<HTMLFormElement>(null)
  const roomProfilesSyncedRef = useRef<string | null>(null) // Track which style ID we've synced
  
  // Track pending files for creation mode (will be uploaded to R2 after style creation)
  const [pendingStyleImages, setPendingStyleImages] = useState<File[]>([])
  const [pendingRoomImages, setPendingRoomImages] = useState<Map<number, File[]>>(new Map())
  
  // Image upload hook for uploading pending files to R2
  const { uploadImage } = useImageUpload()

  // Fetch data
  const { data: categoriesData } = useCategories()
  const categories = categoriesData?.data || []

  const { data: colorsData } = useColors({ page: 1, limit: 100 })
  const colors = colorsData?.data || []

  const { data: materialsData } = useMaterials({ page: 1, limit: 100 })
  const materials = materialsData?.data || []

  // Helper to transform null to undefined
  const nullToUndefined = <T,>(value: T | null | undefined): T | undefined => {
    return value === null ? undefined : value
  }

  // Form setup
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting: formIsSubmitting },
    watch,
    setValue,
    reset,
  } = useForm<CreateStyle | UpdateStyle>({
    // @ts-expect-error - zodResolver type issue with nested schemas
    resolver: zodResolver(mode === 'create' ? createStyleFormSchema : updateStyleSchema),
    mode: 'onChange',
    defaultValues: {
      name: {
        he: '',
        en: '',
      },
      categoryId: '',
      subCategoryId: '',
      slug: '',
      colorId: '',
      materialSet: {
        defaults: [],
        alternatives: [],
      },
      images: [],
      roomProfiles: [],
      metadata: {
        tags: [],
      },
    },
  })

  const isSubmitting = externalIsSubmitting ?? formIsSubmitting

  // Load initial data for edit mode
  useEffect(() => {
    if (mode === 'edit' && initialData && initialData.id) {
      const metadata = initialData.metadata || { tags: [] }
      const cleanedMetadata = {
        ...metadata,
        approvalStatus: nullToUndefined(metadata.approvalStatus),
        approvedBy: nullToUndefined(metadata.approvedBy),
        approvedAt: metadata.approvedAt ? new Date(metadata.approvedAt) : undefined,
        rejectionReason: nullToUndefined(metadata.rejectionReason),
        rating: nullToUndefined(metadata.rating),
      }

      // Normalize materialSet - ensure defaults is an array of objects with materialId
      let normalizedMaterialSet = {
        defaults: [],
        alternatives: [],
      }
      
      if (initialData.materialSet) {
        // Handle materialSet defaults - ensure proper format
        if (Array.isArray(initialData.materialSet.defaults)) {
          normalizedMaterialSet.defaults = initialData.materialSet.defaults.map((item: any) => {
            // If it's already an object with materialId, use it
            if (typeof item === 'object' && item.materialId) {
              return {
                materialId: item.materialId,
              }
            }
            // If it's just a string ID, convert to object
            if (typeof item === 'string') {
              return {
                materialId: item,
              }
            }
            return item
          })
        }
        
        // Handle alternatives
        if (Array.isArray(initialData.materialSet.alternatives)) {
          normalizedMaterialSet.alternatives = initialData.materialSet.alternatives
        }
      }

      // Normalize roomProfiles - ensure proper structure
      let normalizedRoomProfiles: any[] = []
      if (Array.isArray(initialData.roomProfiles)) {
        normalizedRoomProfiles = initialData.roomProfiles.map((profile: any) => ({
          roomType: profile.roomType || '',
          materials: Array.isArray(profile.materials) ? profile.materials : [],
          // Filter out blob URLs - they're temporary and shouldn't be in database
          images: Array.isArray(profile.images) 
            ? profile.images.filter((url: string) => !url.startsWith('blob:'))
            : [],
          constraints: profile.constraints || null,
        }))
      }

      // Normalize images - ensure it's an array and filter out blob URLs
      const normalizedImages = Array.isArray(initialData.images) 
        ? initialData.images.filter((url: string) => !url.startsWith('blob:'))
        : []

      console.log('Loading style data into form:', {
        id: initialData.id,
        name: initialData.name,
        categoryId: initialData.categoryId,
        subCategoryId: initialData.subCategoryId,
        colorId: initialData.colorId,
        images: normalizedImages,
        materialSet: normalizedMaterialSet,
        roomProfiles: normalizedRoomProfiles,
      })

      reset({
        name: initialData.name || { he: '', en: '' },
        categoryId: initialData.categoryId || '',
        subCategoryId: initialData.subCategoryId || '',
        slug: initialData.slug || '',
        colorId: initialData.colorId || '',
        images: normalizedImages,
        materialSet: normalizedMaterialSet,
        roomProfiles: normalizedRoomProfiles,
        metadata: cleanedMetadata,
      }, {
        keepDefaultValues: false, // Override defaults with loaded data
      })
    }
  }, [mode, initialData, reset])

  const categoryId = watch('categoryId')
  const roomProfiles = watch('roomProfiles')

  // Fetch sub-categories when category is selected
  const { data: subCategoriesData } = useSubCategories(categoryId || undefined)
  const subCategories = subCategoriesData?.data || []

  // Options
  const categoryOptions = useMemo(() => {
    return categories.map((cat) => ({
      value: cat.id,
      label: locale === 'he' ? cat.name.he : cat.name.en,
    }))
  }, [categories, locale])

  const subCategoryOptions = useMemo(() => {
    return subCategories.map((subCat) => ({
      value: subCat.id,
      label: locale === 'he' ? subCat.name.he : subCat.name.en,
    }))
  }, [subCategories, locale])

  const colorOptions = useMemo(() => {
    return colors.map((color) => ({
      value: color.id,
      label: `${locale === 'he' ? color.name.he : color.name.en} (${color.hex})`,
      color: color.hex,
    }))
  }, [colors, locale])

  const materialOptions = useMemo(() => {
    return materials.map((material) => ({
      value: material.id,
      label: `${locale === 'he' ? material.name.he : material.name.en}${material.sku ? ` (${material.sku})` : ''}`,
      material: material,
    }))
  }, [materials, locale])

  const roomTypeOptions = useMemo(() => {
    return ROOM_TYPES.map((type) => ({
      value: type,
      label: tRoomTypes(type),
    }))
  }, [tRoomTypes])

  // Reset sub-category when category changes
  useEffect(() => {
    if (categoryId && initialData?.categoryId !== categoryId) {
      setValue('subCategoryId', '')
    }
  }, [categoryId, setValue, initialData?.categoryId])

  // Field arrays
  const {
    fields: roomProfileFields,
    append: appendRoomProfile,
    remove: removeRoomProfile,
    replace: replaceRoomProfiles,
  } = useFieldArray({
    control,
    name: 'roomProfiles',
  })

  // Sync field array when roomProfiles are loaded in edit mode
  // This ensures the field array is populated even if reset() doesn't trigger it properly
  useEffect(() => {
    if (mode === 'edit' && initialData?.id && initialData?.roomProfiles && Array.isArray(initialData.roomProfiles)) {
      const styleId = initialData.id
      
      // Only sync once per style ID to avoid infinite loops
      if (roomProfilesSyncedRef.current === styleId) {
        return
      }
      
      const normalizedRoomProfiles = initialData.roomProfiles.map((profile: any) => ({
        roomType: profile.roomType || '',
        materials: Array.isArray(profile.materials) ? profile.materials : [],
        images: Array.isArray(profile.images) 
          ? profile.images.filter((url: string) => !url.startsWith('blob:'))
          : [],
        constraints: profile.constraints || null,
      }))
      
      // Only replace if field array is empty or length doesn't match
      if (roomProfileFields.length !== normalizedRoomProfiles.length) {
        console.log('Syncing roomProfiles field array:', {
          styleId,
          currentLength: roomProfileFields.length,
          expectedLength: normalizedRoomProfiles.length,
          normalizedRoomProfiles,
        })
        replaceRoomProfiles(normalizedRoomProfiles)
        roomProfilesSyncedRef.current = styleId
      } else if (normalizedRoomProfiles.length > 0) {
        // Mark as synced even if lengths match (data should be synced via reset)
        roomProfilesSyncedRef.current = styleId
      }
    } else if (mode === 'create') {
      // Reset sync ref when switching to create mode
      roomProfilesSyncedRef.current = null
    }
  }, [mode, initialData?.id, initialData?.roomProfiles, replaceRoomProfiles, roomProfileFields.length])

  // Get available room types
  const availableRoomTypes = useMemo(() => {
    const usedTypes = new Set(roomProfiles?.map((rp) => rp.roomType) || [])
    return roomTypeOptions.filter((opt) => !usedTypes.has(opt.value))
  }, [roomTypeOptions, roomProfiles])

  // Extract validation error messages
  useEffect(() => {
    const errorMessages: string[] = []

    if (errors.name?.he?.message) {
      errorMessages.push(`${t('nameHe')}: ${errors.name.he.message}`)
    }
    if (errors.name?.en?.message) {
      errorMessages.push(`${t('nameEn')}: ${errors.name.en.message}`)
    }
    if (errors.categoryId?.message) {
      errorMessages.push(`${t('category')}: ${errors.categoryId.message}`)
    }
    if (errors.subCategoryId?.message) {
      errorMessages.push(`${t('subCategory')}: ${errors.subCategoryId.message}`)
    }
    if (errors.colorId?.message) {
      errorMessages.push(`${t('color')}: ${errors.colorId.message}`)
    }
    if (errors.slug?.message) {
      errorMessages.push(`${t('slug')}: ${errors.slug.message}`)
    }
    if (errors.images?.message) {
      errorMessages.push(`${t('images')}: ${errors.images.message}`)
    }

    // Room profile errors
    if (errors.roomProfiles && Array.isArray(errors.roomProfiles)) {
      errors.roomProfiles.forEach((roomError, index) => {
        if (roomError?.roomType?.message) {
          errorMessages.push(
            `${t('roomProfiles')} ${index + 1} - ${t('roomType')}: ${roomError.roomType.message}`
          )
        }
        if (roomError?.images?.message) {
          errorMessages.push(
            `${t('roomProfiles')} ${index + 1} - ${t('images')}: ${roomError.images.message}`
          )
        }
      })
    }

    setValidationErrors(errorMessages)
  }, [errors, t])

  // Helper to check if an error object has actual error messages
  const hasActualError = (error: any): boolean => {
    if (!error) return false
    if (typeof error === 'string') return true
    if (error.message) return true
    if (Array.isArray(error)) {
      return error.some((item) => hasActualError(item))
    }
    if (typeof error === 'object') {
      if (error.type || error.message) return true
      return Object.values(error).some((value) => hasActualError(value))
    }
    return false
  }

  // Scroll to first error field and switch to appropriate tab
  const scrollToFirstError = () => {
    const basicErrors =
      hasActualError(errors.name?.he) ||
      hasActualError(errors.name?.en) ||
      hasActualError(errors.categoryId) ||
      hasActualError(errors.subCategoryId) ||
      hasActualError(errors.slug) ||
      hasActualError(errors.images)
    const colorErrors = hasActualError(errors.colorId)
    const roomErrors = hasActualError(errors.roomProfiles)
    const materialErrors = hasActualError(errors.materialSet)

    // Log materials errors for debugging
    if (materialErrors) {
      console.log('Materials tab has validation errors:', errors.materialSet)
      console.log('Full materials error object:', JSON.stringify(errors.materialSet, null, 2))
    }

    const hasErrors = Boolean(basicErrors || colorErrors || roomErrors || materialErrors)

    if (!hasErrors) {
      return
    }

    // Determine which tab has the first error
    if (basicErrors) {
      setActiveTab('basic')
    } else if (colorErrors) {
      setActiveTab('color')
    } else if (roomErrors) {
      setActiveTab('rooms')
    } else if (materialErrors) {
      setActiveTab('materials')
    }

    // Wait for tab to switch, then scroll to error
    setTimeout(() => {
      const firstErrorField = formRef.current?.querySelector(
        '[data-invalid="true"], .mantine-Input-error, .mantine-Select-error, [aria-invalid="true"]'
      )
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' })
        if (firstErrorField instanceof HTMLElement) {
          const input = firstErrorField.querySelector('input, select, textarea') as HTMLElement
          if (input) {
            setTimeout(() => input.focus(), 300)
          }
        }
      }
    }, 100)
  }

  const handleFormSubmit = async (data: CreateStyle | UpdateStyle) => {
    try {
      setValidationErrors([])

      // Clean null values from metadata before submission
      let cleanedData: CreateStyle | UpdateStyle = {
        ...data,
        metadata: data.metadata
          ? {
              ...data.metadata,
              approvalStatus: nullToUndefined(data.metadata.approvalStatus),
              approvedBy: nullToUndefined(data.metadata.approvedBy),
              approvedAt: data.metadata.approvedAt || undefined,
              rejectionReason: nullToUndefined(data.metadata.rejectionReason),
              rating: nullToUndefined(data.metadata.rating),
            }
          : undefined,
      }

      // Handle images based on mode
      // In edit mode: ImageUpload uploads immediately when entityId is provided, so we can trust the URLs
      // In create mode: Filter blob URLs (they'll be uploaded after creation)
      cleanedData = {
        ...cleanedData,
        // In edit mode, ImageUpload handles uploads automatically, so just pass the images as-is
        // In create mode, filter out blob URLs (they'll be uploaded after style creation)
        images: mode === 'edit' 
          ? (cleanedData.images || []) // Trust ImageUpload to have uploaded them already
          : (cleanedData.images || []).filter((url) => {
              if (typeof url !== 'string') return false
              // In create mode, filter out blob URLs - they'll be uploaded after creation
              if (url.startsWith('blob:')) return false
              // Only keep valid HTTP/HTTPS URLs (R2 URLs)
              try {
                new URL(url)
                return url.startsWith('http://') || url.startsWith('https://')
              } catch {
                return false
              }
            }),
        // Ensure materialSet has proper structure with valid ObjectIDs
        materialSet: {
          defaults: Array.isArray(cleanedData.materialSet?.defaults) 
            ? cleanedData.materialSet.defaults
                .filter((d: any) => {
                  // Must have materialId and it must be a valid ObjectID format
                  if (!d || !d.materialId || typeof d.materialId !== 'string') return false
                  return /^[0-9a-fA-F]{24}$/.test(d.materialId)
                })
                .map((d: any) => ({
                  materialId: d.materialId,
                }))
            : [],
          alternatives: Array.isArray(cleanedData.materialSet?.alternatives)
            ? cleanedData.materialSet.alternatives
                .filter((alt: any) => {
                  // Must have usageArea and valid alternatives array
                  if (!alt || !alt.usageArea || typeof alt.usageArea !== 'string') return false
                  if (!Array.isArray(alt.alternatives) || alt.alternatives.length === 0) return false
                  // All alternatives must be valid ObjectIDs
                  return alt.alternatives.every((id: string) => 
                    typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id)
                  )
                })
                .map((alt: any) => ({
                  usageArea: alt.usageArea,
                  alternatives: alt.alternatives.filter((id: string) => 
                    typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id)
                  ),
                }))
            : [],
        },
        // Ensure roomProfiles is an array with proper structure and valid ObjectIDs
        roomProfiles: (cleanedData.roomProfiles || []).map((profile) => ({
          roomType: profile.roomType,
          materials: Array.isArray(profile.materials)
            ? profile.materials.filter((id: string) =>
                typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id)
              )
            : [],
          // In edit mode, ImageUpload handles uploads automatically, so trust the URLs
          // In create mode, filter blob URLs (they'll be uploaded after creation)
          images: mode === 'edit'
            ? (profile.images || []) // Trust ImageUpload to have uploaded them already
            : (profile.images || []).filter((url) => {
                if (typeof url !== 'string') return false
                // In create mode, filter out blob URLs - they'll be uploaded after creation
                if (url.startsWith('blob:')) return false
                // Only keep valid HTTP/HTTPS URLs (R2 URLs)
                try {
                  new URL(url)
                  return url.startsWith('http://') || url.startsWith('https://')
                } catch {
                  return false
                }
              }),
          constraints: profile.constraints || null,
        })),
      }

      console.log('========== [STYLE FORM] SUBMITTING DATA ==========')
      console.log('[STYLE FORM] Mode:', mode)
      console.log('[STYLE FORM] Cleaned data summary:', {
        name: cleanedData.name,
        categoryId: cleanedData.categoryId,
        subCategoryId: cleanedData.subCategoryId,
        colorId: cleanedData.colorId,
        slug: cleanedData.slug,
        imagesCount: cleanedData.images?.length || 0,
        images: cleanedData.images,
        materialSet: {
          defaultsCount: cleanedData.materialSet?.defaults?.length || 0,
          alternativesCount: cleanedData.materialSet?.alternatives?.length || 0,
        },
        roomProfilesCount: cleanedData.roomProfiles?.length || 0,
        roomProfiles: cleanedData.roomProfiles?.map((rp) => ({
          roomType: rp.roomType,
          materialsCount: rp.materials?.length || 0,
          materials: rp.materials,
          imagesCount: rp.images?.length || 0,
          images: rp.images,
        })),
        metadata: cleanedData.metadata,
      })

      console.log('[STYLE FORM] Full cleaned data (JSON):', JSON.stringify(cleanedData, null, 2))

      // Submit style (create or update) - this returns the created/updated style
      console.log('[STYLE FORM] Calling onSubmit with cleaned data...')
      let result
      try {
        result = await onSubmit(cleanedData)
        console.log('[STYLE FORM] ✅ onSubmit succeeded')
        console.log('[STYLE FORM] Result:', result)
      } catch (submitError) {
        console.error('[STYLE FORM] ========== SUBMIT ERROR ==========')
        console.error('[STYLE FORM] Error:', submitError)
        if (submitError instanceof Error) {
          console.error('[STYLE FORM] Name:', submitError.name)
          console.error('[STYLE FORM] Message:', submitError.message)
          console.error('[STYLE FORM] Stack:', submitError.stack)
        }
        if (submitError && typeof submitError === 'object') {
          console.error('[STYLE FORM] Error object keys:', Object.keys(submitError))
        }
        console.error('[STYLE FORM] ===========================================')
        throw submitError
      }
      
      // After style creation, upload pending files to R2 and update the style
      if (mode === 'create' && result && typeof result === 'object' && 'id' in result) {
        const styleId = (result as any).id
        const uploadedImageUrls: string[] = []
        const uploadedRoomImageUrls: Map<number, string[]> = new Map()
        
        // Upload pending style images to R2
        if (pendingStyleImages.length > 0) {
          console.log(`Uploading ${pendingStyleImages.length} style images to R2...`)
          for (const file of pendingStyleImages) {
            try {
              const url = await uploadImage({
                file,
                entityType: 'style',
                entityId: styleId,
              })
              uploadedImageUrls.push(url)
              console.log('Uploaded style image to R2:', url)
            } catch (err) {
              console.error('Failed to upload style image to R2:', err)
            }
          }
        }
        
        // Upload pending room profile images to R2
        for (const [index, files] of pendingRoomImages.entries()) {
          if (files.length > 0) {
            const roomProfile = data.roomProfiles?.[index]
            const uploadedUrls: string[] = []
            
            console.log(`Uploading ${files.length} images for room ${roomProfile?.roomType} to R2...`)
            for (const file of files) {
              try {
                const url = await uploadImage({
                  file,
                  entityType: 'style',
                  entityId: styleId,
                  roomType: roomProfile?.roomType,
                })
                uploadedUrls.push(url)
                console.log('Uploaded room image to R2:', url)
              } catch (err) {
                console.error(`Failed to upload room image for ${roomProfile?.roomType} to R2:`, err)
              }
            }
            
            if (uploadedUrls.length > 0) {
              uploadedRoomImageUrls.set(index, uploadedUrls)
            }
          }
        }
        
        // If we uploaded images, update the style with the new R2 URLs
        if (uploadedImageUrls.length > 0 || uploadedRoomImageUrls.size > 0) {
          console.log('Style images uploaded to R2:', {
            styleImages: uploadedImageUrls,
            roomImages: Object.fromEntries(uploadedRoomImageUrls),
          })
          
          // Build updated room profiles with uploaded images
          // Use original data.roomProfiles to preserve full structure (materials, constraints, etc.)
          const updatedRoomProfiles = (data.roomProfiles || []).map((profile: any, index: number) => {
            const uploadedUrls = uploadedRoomImageUrls.get(index) || []
            // Get existing images from result if available, otherwise use submitted images
            const existingImages = (result as any).roomProfiles?.[index]?.images || profile.images || []
            return {
              roomType: profile.roomType,
              materials: profile.materials || [],
              images: [...existingImages.filter((url: string) => !url.startsWith('blob:')), ...uploadedUrls],
              constraints: profile.constraints || null,
            }
          })
          
          // Update style with uploaded image URLs
          try {
            const updateResponse = await fetch(`/api/admin/styles/${styleId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                images: [...((result as any).images || []), ...uploadedImageUrls],
                roomProfiles: updatedRoomProfiles,
              }),
            })
            
            if (!updateResponse.ok) {
              const errorText = await updateResponse.text()
              console.error('Failed to update style with uploaded images:', {
                status: updateResponse.status,
                statusText: updateResponse.statusText,
                error: errorText,
              })
            } else {
              const updatedStyle = await updateResponse.json()
              console.log('Style updated with uploaded R2 image URLs:', {
                styleId: updatedStyle.id,
                imagesCount: updatedStyle.images?.length || 0,
                roomProfilesCount: updatedStyle.roomProfiles?.length || 0,
                roomProfiles: updatedStyle.roomProfiles?.map((rp: any) => ({
                  roomType: rp.roomType,
                  imagesCount: rp.images?.length || 0,
                  materialsCount: rp.materials?.length || 0,
                })),
              })
            }
          } catch (updateError) {
            console.error('Error updating style with uploaded images:', updateError)
            if (updateError instanceof Error) {
              console.error('Update error message:', updateError.message)
              console.error('Update error stack:', updateError.stack)
            }
          }
        }
      }
    } catch (error) {
      console.error('[STYLE FORM] ========== SUBMISSION ERROR ==========')
      console.error('[STYLE FORM] Error type:', error?.constructor?.name)
      console.error('[STYLE FORM] Error:', error)
      
      if (error instanceof Error) {
        console.error('[STYLE FORM] Error message:', error.message)
        console.error('[STYLE FORM] Error stack:', error.stack)
        console.error('[STYLE FORM] Error name:', error.name)
      }
      
      // Log additional error details
      if (error && typeof error === 'object') {
        console.error('[STYLE FORM] Error keys:', Object.keys(error))
        if ('cause' in error) {
          console.error('[STYLE FORM] Error cause:', error.cause)
        }
      }
      
      console.error('[STYLE FORM] =====================================')
      
      // Re-throw to show error in UI
      throw error
    }
  }

  const onError = (validationErrors: any) => {
    console.log('Form validation errors:', JSON.stringify(validationErrors, null, 2))
    
    // Log materials-specific errors if they exist
    if (validationErrors.materialSet) {
      console.log('Materials validation errors:', validationErrors.materialSet)
    }
    if (validationErrors.materials) {
      console.log('Materials validation errors:', validationErrors.materials)
    }
    
    setTimeout(() => {
      scrollToFirstError()
    }, 50)
  }

  const handleAddRoomProfile = () => {
    if (availableRoomTypes.length > 0) {
      appendRoomProfile({
        roomType: availableRoomTypes[0].value,
        materials: [],
        images: [],
      })
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit(handleFormSubmit, onError)}>
      <Stack gap="lg">
        {/* Header */}
        <Group gap="md" align="center">
          <ActionIcon variant="subtle" onClick={onCancel}>
            <IconArrowLeft size={20} />
          </ActionIcon>
          <Title order={1} c="brand" style={{ flex: 1 }}>
            {title || (mode === 'create' ? t('title') : `${t('title')} - ${initialData?.name?.he || ''}`)}
          </Title>
          <Button
            type="submit"
            color="brand"
            variant="filled"
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            {tCommon('save')}
          </Button>
        </Group>

        {/* Validation Errors Alert */}
        {validationErrors.length > 0 && (
          <Alert
            icon={<IconAlertCircle size={16} />}
            title={tCommon('error')}
            color="red"
            onClose={() => setValidationErrors([])}
            withCloseButton
          >
            <Text size="sm" mb="xs" fw={500}>
              {locale === 'he' ? 'אנא תקן את השגיאות הבאות:' : 'Please fix the following errors:'}
            </Text>
            <Stack gap={4}>
              {validationErrors.map((error, index) => (
                <Text key={index} size="sm">
                  • {error}
                </Text>
              ))}
            </Stack>
          </Alert>
        )}

        {/* API Error Alert */}
        {externalError && (
          <Alert icon={<IconAlertCircle size={16} />} title={tCommon('error')} color="red">
            {externalError instanceof Error
              ? externalError.message
              : locale === 'he'
                ? 'שגיאה בשמירת הסגנון'
                : 'Failed to save style'}
          </Alert>
        )}

        {/* Form Tabs */}
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="basic" leftSection={<IconPalette size={16} />}>
              {t('basicInfo')}
            </Tabs.Tab>
            <Tabs.Tab value="color" leftSection={<IconPalette size={16} />}>
              {t('color')}
            </Tabs.Tab>
            <Tabs.Tab value="materials" leftSection={<IconBox size={16} />}>
              {t('materials')}
            </Tabs.Tab>
            <Tabs.Tab value="rooms" leftSection={<IconHome size={16} />}>
              {t('rooms')}
            </Tabs.Tab>
          </Tabs.List>

          {/* Basic Info Tab */}
          <Tabs.Panel value="basic" pt="lg">
            <MoodBCard>
              <Stack gap="md">
                <FormSection title={t('basicInfo')}>
                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                    <TextInput
                      label={t('nameHe')}
                      placeholder={t('nameHe')}
                      {...register('name.he')}
                      error={errors.name?.he?.message}
                      required
                    />
                    <TextInput
                      label={t('nameEn')}
                      placeholder={t('nameEn')}
                      {...register('name.en')}
                      error={errors.name?.en?.message}
                      required
                    />
                  </SimpleGrid>

                  <Controller
                    name="categoryId"
                    control={control}
                    render={({ field: { onChange, onBlur, value, name, ref: _ref, ...field } }) => (
                      <Select
                        {...field}
                        name={name}
                        label={t('category')}
                        placeholder={t('categoryPlaceholder')}
                        data={categoryOptions}
                        value={value}
                        onChange={onChange}
                        onBlur={onBlur}
                        error={errors.categoryId?.message}
                        required
                        searchable
                      />
                    )}
                  />

                  <Controller
                    name="subCategoryId"
                    control={control}
                    render={({ field: { onChange, onBlur, value, name, ref: _ref, ...field } }) => (
                      <Select
                        {...field}
                        name={name}
                        label={t('subCategory')}
                        placeholder={t('subCategoryPlaceholder')}
                        data={subCategoryOptions}
                        value={value}
                        onChange={onChange}
                        onBlur={onBlur}
                        error={errors.subCategoryId?.message}
                        required
                        disabled={!categoryId}
                        searchable
                      />
                    )}
                  />

                  <TextInput
                    label={t('slug')}
                    placeholder={t('slugPlaceholder')}
                    {...register('slug')}
                    error={errors.slug?.message}
                    description={t('slugInvalid')}
                  />

                  {/* Style Images */}
                  <Paper p="md" withBorder>
                    <Text fw={500} size="sm" mb="xs">
                      {t('images') || 'Images'}
                    </Text>
                    <Controller
                      name="images"
                      control={control}
                      render={({ field }) => (
                        <ImageUpload
                          value={field.value || []}
                          onChange={(newImages) => {
                            field.onChange(newImages)
                            setValue('images', newImages, { shouldDirty: true })
                          }}
                          onPendingFilesChange={(files) => {
                            // Track pending files for upload after style creation
                            if (mode === 'create') {
                              setPendingStyleImages(files)
                            }
                          }}
                          entityType="style"
                          entityId={mode === 'edit' ? initialData?.id : ''}
                          maxImages={20}
                          multiple
                          error={errors.images?.message}
                        />
                      )}
                    />
                  </Paper>
                </FormSection>
              </Stack>
            </MoodBCard>
          </Tabs.Panel>

          {/* Color Tab */}
          <Tabs.Panel value="color" pt="lg">
            <MoodBCard>
              <Stack gap="md">
                <FormSection title={t('selectColor')}>
                  <Controller
                    name="colorId"
                    control={control}
                    render={({ field: { onChange, onBlur, value, name, ref: _ref, ...field } }) => (
                      <Select
                        {...field}
                        name={name}
                        label={t('color')}
                        placeholder={t('colorPlaceholder')}
                        data={colorOptions}
                        value={value}
                        onChange={onChange}
                        onBlur={onBlur}
                        error={errors.colorId?.message}
                        required
                        searchable
                        renderOption={({ option }) => {
                          const colorOption = option as { value: string; label: string; color?: string }
                          const colorHex = colorOption.color || '#000000'
                          return (
                            <Group gap="xs">
                              <div
                                style={{
                                  width: 20,
                                  height: 20,
                                  backgroundColor: colorHex,
                                  borderRadius: 4,
                                  border: '1px solid #ddd',
                                }}
                              />
                              <Text>{option.label}</Text>
                            </Group>
                          )
                        }}
                      />
                    )}
                  />
                  {watch('colorId') && (
                    <Paper p="sm" withBorder>
                      <Group gap="xs">
                        <Text size="sm" fw={500}>
                          {t('selectedColor')}:
                        </Text>
                        {(() => {
                          const selectedColor = colors.find((c) => c.id === watch('colorId'))
                          return selectedColor ? (
                            <Group gap="xs">
                              <div
                                style={{
                                  width: 24,
                                  height: 24,
                                  backgroundColor: selectedColor.hex,
                                  borderRadius: 4,
                                  border: '1px solid #ddd',
                                }}
                              />
                              <Text size="sm">
                                {locale === 'he' ? selectedColor.name.he : selectedColor.name.en}
                              </Text>
                              <Badge size="sm" variant="light">
                                {selectedColor.hex}
                              </Badge>
                            </Group>
                          ) : null
                        })()}
                      </Group>
                    </Paper>
                  )}
                </FormSection>
              </Stack>
            </MoodBCard>
          </Tabs.Panel>

          {/* Materials Tab */}
          <Tabs.Panel value="materials" pt="lg">
            <MoodBCard>
              <Stack gap="md">
                <FormSection title={t('generalMaterials')}>
                  <Text size="sm" c="dimmed" mb="sm">
                    {t('generalMaterialsDescription')}
                  </Text>
                  <Controller
                    name="materialSet.defaults"
                    control={control}
                    render={({ field: { onChange, value }, fieldState: { error } }) => {
                      // Log materials field errors
                      if (error) {
                        console.log('materialSet.defaults field error:', error)
                      }
                      
                      return (
                        <MultiSelect
                          label={t('materials')}
                          placeholder={t('selectMaterials')}
                          data={materialOptions}
                          value={
                            Array.isArray(value)
                              ? value.map((item: any) =>
                                  typeof item === 'string' ? item : item?.materialId
                                ).filter(Boolean)
                              : []
                          }
                          onChange={(ids) => {
                            const defaults = ids.map((id) => ({
                              materialId: id,
                            }))
                            onChange(defaults)
                          }}
                          searchable
                          clearable
                          maxDropdownHeight={300}
                          error={error?.message}
                        renderOption={({ option }) => {
                          const materialOption = option as {
                            value: string
                            label: string
                            material?: any
                          }
                          const material = materialOption.material
                          if (!material)
                            return <Text size="sm">{option.label}</Text>

                          return (
                            <Group gap="xs" wrap="nowrap">
                              <div style={{ flex: 1 }}>
                                <Text size="sm" fw={500}>
                                  {locale === 'he' ? material.name.he : material.name.en}
                                </Text>
                                <Text size="xs" c="dimmed" ff="monospace">
                                  {material.sku}
                                </Text>
                              </div>
                            </Group>
                          )
                        }}
                      />
                      )
                    }}
                  />
                </FormSection>
              </Stack>
            </MoodBCard>
          </Tabs.Panel>

          {/* Rooms Tab */}
          <Tabs.Panel value="rooms" pt="lg">
            <ScrollArea h={600}>
              <Stack gap="md">
                <MoodBCard>
                  <Group justify="space-between" mb="md">
                    <div>
                      <Text fw={500}>{t('roomProfiles')}</Text>
                      <Text size="sm" c="dimmed">
                        {t('roomProfilesDescription')}
                      </Text>
                    </div>
                    <Button
                      size="xs"
                      variant="light"
                      leftSection={<IconPlus size={14} />}
                      onClick={handleAddRoomProfile}
                      disabled={availableRoomTypes.length === 0}
                    >
                      {t('addRoomProfile')}
                    </Button>
                  </Group>

                  {roomProfileFields.length === 0 ? (
                    <Text size="sm" c="dimmed" ta="center" py="md">
                      {t('noRoomProfiles')}
                    </Text>
                  ) : (
                    <Stack gap="md">
                      {roomProfileFields.map((field, index) => {
                        const roomProfile = roomProfiles?.[index]

                        return (
                          <Paper key={field.id} p="md" withBorder>
                            <Stack gap="sm">
                              <Group justify="space-between">
                                <Text fw={500}>{tRoomTypes(roomProfile?.roomType || '')}</Text>
                                <ActionIcon
                                  color="red"
                                  variant="subtle"
                                  onClick={() => removeRoomProfile(index)}
                                >
                                  <IconX size={16} />
                                </ActionIcon>
                              </Group>

                              <Controller
                                name={`roomProfiles.${index}.roomType`}
                                control={control}
                                render={({
                                  field: { onChange, onBlur, value, name, ref: _ref, ...roomTypeField },
                                }) => (
                                  <Select
                                    {...roomTypeField}
                                    name={name}
                                    label={t('roomType')}
                                    data={roomTypeOptions.filter(
                                      (opt) =>
                                        opt.value === roomProfile?.roomType ||
                                        !roomProfiles?.some(
                                          (rp, i) => i !== index && rp.roomType === opt.value
                                        )
                                    )}
                                    value={value}
                                    onChange={onChange}
                                    onBlur={onBlur}
                                    error={errors.roomProfiles?.[index]?.roomType?.message}
                                  />
                                )}
                              />

                              <div>
                                <Text size="sm" fw={500} mb="xs">
                                  {t('roomSpecificMaterials')}
                                </Text>
                                <Text size="xs" c="dimmed" mb="sm">
                                  {t('roomSpecificMaterialsDescription')}
                                </Text>
                                <Controller
                                  name={`roomProfiles.${index}.materials`}
                                  control={control}
                                  render={({ field }) => (
                                    <MultiSelect
                                      placeholder={t('selectMaterials')}
                                      data={materialOptions}
                                      value={field.value || []}
                                      onChange={field.onChange}
                                      onBlur={field.onBlur}
                                      error={errors.roomProfiles?.[index]?.materials?.message}
                                      searchable
                                      clearable
                                      renderOption={({ option }) => {
                                        const materialOption = option as {
                                          value: string
                                          label: string
                                          material?: any
                                        }
                                        const material = materialOption.material
                                        if (!material)
                                          return <Text size="sm">{option.label}</Text>

                                        return (
                                          <Group gap="xs" wrap="nowrap">
                                            <div style={{ flex: 1 }}>
                                              <Text size="sm" fw={500}>
                                                {locale === 'he' ? material.name.he : material.name.en}
                                              </Text>
                                              <Text size="xs" c="dimmed" ff="monospace">
                                                {material.sku}
                                              </Text>
                                            </div>
                                          </Group>
                                        )
                                      }}
                                    />
                                  )}
                                />
                              </div>

                              {/* Room Profile Images */}
                              <Paper p="md" withBorder>
                                <Text fw={500} size="sm" mb="xs">
                                  {t('images') || 'Images'} ({tRoomTypes(roomProfile?.roomType || '')})
                                </Text>
                                <Controller
                                  name={`roomProfiles.${index}.images`}
                                  control={control}
                                  render={({ field }) => (
                                    <ImageUpload
                                      value={field.value || []}
                                      onChange={(newImages) => {
                                        field.onChange(newImages)
                                        setValue(`roomProfiles.${index}.images`, newImages, { shouldDirty: true })
                                      }}
                                      onPendingFilesChange={(files) => {
                                        // Track pending files for upload after style creation
                                        if (mode === 'create') {
                                          setPendingRoomImages(prev => {
                                            const newMap = new Map(prev)
                                            newMap.set(index, files)
                                            return newMap
                                          })
                                        }
                                      }}
                                      entityType="style"
                                      entityId={mode === 'edit' ? initialData?.id : ''}
                                      roomType={roomProfile?.roomType}
                                      maxImages={20}
                                      multiple
                                      error={errors.roomProfiles?.[index]?.images?.message}
                                    />
                                  )}
                                />
                              </Paper>
                            </Stack>
                          </Paper>
                        )
                      })}
                    </Stack>
                  )}
                </MoodBCard>
              </Stack>
            </ScrollArea>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </form>
  )
}

