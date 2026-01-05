'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { Paper, Stack, Text, Title, Divider } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconCheck, IconX } from '@tabler/icons-react'

import {
  StudioLayout,
  IngredientSelector,
  RoomSpecForm,
  GenerationPreview,
} from '@/components/features/ai-studio'
import { useAIStudio } from '@/hooks/useAIStudio'
import { useHasCredits, useInvalidateCredits } from '@/hooks/useCredits'

/**
 * AI Studio Page
 * Main page for creating AI-generated interior design images
 */
export default function AIStudioPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const locale = pathname?.split('/')[1] || 'he'

  const {
    reset,
    setGenerating,
    setProgress,
    setError,
    setPreviewImage,
    input,
    canGenerate,
  } = useAIStudio()

  const { hasCredits } = useHasCredits(1)
  const invalidateCredits = useInvalidateCredits()

  // Handle URL params for deep linking from library
  useEffect(() => {
    const categoryId = searchParams.get('categoryId')
    const colorId = searchParams.get('colorId')
    const textureId = searchParams.get('textureId')
    const materialId = searchParams.get('materialId')
    const sourceStyleId = searchParams.get('sourceStyle')

    // If we have params, we could pre-populate the form
    // For now, just log them - actual pre-population would require fetching the data
    if (categoryId || colorId || textureId || materialId || sourceStyleId) {
      console.log('AI Studio opened with params:', {
        categoryId,
        colorId,
        textureId,
        materialId,
        sourceStyleId,
      })
    }
  }, [searchParams])

  // Handle generation
  const handleGenerate = async () => {
    if (!canGenerate()) {
      setError('יש להשלים את כל השדות הנדרשים')
      return
    }

    if (!hasCredits) {
      setError('אין מספיק קרדיטים')
      return
    }

    try {
      setGenerating(true)
      setError(null)
      setProgress(0)

      // Simulate progress for now (will be replaced with actual API call)
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + Math.random() * 10
        })
      }, 500)

      // Call the generation API
      const response = await fetch('/api/ai-studio/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: {
            categoryId: input.categoryId,
            subCategoryId: input.subCategoryId,
            colorIds: input.colorIds,
            textureIds: input.textureIds,
            materialIds: input.materialIds,
            roomSpec: input.roomSpec,
            highlightAreas: input.highlightAreas,
            customPrompt: input.customPrompt,
          },
        }),
      })

      clearInterval(progressInterval)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'שגיאה ביצירת התמונה')
      }

      const data = await response.json()

      setProgress(100)

      // Invalidate credits to refresh balance
      invalidateCredits()

      // Show success notification
      notifications.show({
        title: 'התמונה נוצרה בהצלחה!',
        message: 'ניתן לצפות בתוצאה ולשמור אותה כסגנון',
        color: 'teal',
        icon: <IconCheck size={16} />,
      })

      // Navigate to results page if we have a generated style ID
      if (data.generatedStyleId) {
        router.push(`/${locale}/ai-studio/${data.generatedStyleId}`)
      } else if (data.imageUrl) {
        // For now, just set the preview image
        setPreviewImage(data.imageUrl)
      }
    } catch (error) {
      console.error('Generation error:', error)
      setError(error instanceof Error ? error.message : 'שגיאה ביצירת התמונה')

      notifications.show({
        title: 'שגיאה',
        message: error instanceof Error ? error.message : 'שגיאה ביצירת התמונה',
        color: 'red',
        icon: <IconX size={16} />,
      })
    } finally {
      setGenerating(false)
    }
  }

  return (
    <StudioLayout
      title="AI Style Studio"
      subtitle="צרו תמונות עיצוב פנים מותאמות אישית באמצעות AI"
      preview={<GenerationPreview onGenerate={handleGenerate} />}
    >
      {/* Section 1: Design Elements */}
      <Paper p="lg" radius="md" withBorder>
        <Stack gap="md">
          <Title order={4}>1. בחירת מרכיבי עיצוב</Title>
          <Text size="sm" c="dimmed">
            בחרו קטגוריה, צבעים, טקסטורות וחומרים לסגנון שלכם
          </Text>
          <Divider />
          <IngredientSelector />
        </Stack>
      </Paper>

      {/* Section 2: Room Details */}
      <Paper p="lg" radius="md" withBorder>
        <Stack gap="md">
          <Title order={4}>2. פרטי החדר</Title>
          <Text size="sm" c="dimmed">
            הגדירו את סוג החדר, המידות והתכונות המיוחדות
          </Text>
          <Divider />
          <RoomSpecForm />
        </Stack>
      </Paper>
    </StudioLayout>
  )
}
