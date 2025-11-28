/**
 * Bulk Generation Tab
 * AI-powered bulk style generation with Phase 2 image generation
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { Stack, Paper, Title, NumberInput, Select, Switch, Group, Button, Alert, Text, Badge } from '@mantine/core'
import { IconPlayerPlay, IconPlayerStop, IconSparkles } from '@tabler/icons-react'
import { ProgressDisplay } from './ProgressDisplay'
import { ResultDisplay } from './ResultDisplay'
import { CATEGORY_OPTIONS, PRICE_LEVEL_OPTIONS, ProgressEvent, SeedResult, CompletedStyle, PriceLevel } from './shared'

interface BulkGenerationTabProps {
  onComplete?: () => void
  resumeExecutionId?: string | null
}

export default function BulkGenerationTab({ onComplete, resumeExecutionId }: BulkGenerationTabProps) {
  // Configuration state
  const [limit, setLimit] = useState<number>(5)
  const [generateImages, setGenerateImages] = useState(true)
  const [dryRun, setDryRun] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [priceLevel, setPriceLevel] = useState<PriceLevel>('RANDOM')

  // Progress state
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState<ProgressEvent[]>([])
  const [currentProgress, setCurrentProgress] = useState<{ current: number; total: number } | null>(null)
  const [result, setResult] = useState<SeedResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [executionId, setExecutionId] = useState<string | null>(null)
  const [completedStyles, setCompletedStyles] = useState<CompletedStyle[]>([])
  const [isResuming, setIsResuming] = useState(false)

  const abortControllerRef = useRef<AbortController | null>(null)

  // Phase 2 constants (fixed values for simplicity)
  const ROOM_IMAGE_COUNT = 60
  const MATERIAL_IMAGE_COUNT = 25
  const TEXTURE_IMAGE_COUNT = 15
  const TOTAL_IMAGES_PER_STYLE = ROOM_IMAGE_COUNT + MATERIAL_IMAGE_COUNT + TEXTURE_IMAGE_COUNT + 2 // +2 for composite & anchor

  // Estimates
  const estimatedTime = generateImages ? limit * 15 : limit * 2 // ~15 min with images, ~2 min without
  const estimatedImages = generateImages ? limit * TOTAL_IMAGES_PER_STYLE : 0

  const startSeeding = async (resumeId?: string) => {
    setIsRunning(true)
    setProgress([])
    setCurrentProgress(null)
    setResult(null)
    setError(null)
    setIsResuming(!!resumeId)
    if (!resumeId) {
      setExecutionId(null)
      setCompletedStyles([])
    }

    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const requestBody = {
        limit,
        generateImages,
        generateRoomProfiles: generateImages, // Auto-enable when images are on
        dryRun,
        categoryFilter: categoryFilter || undefined,
        manualMode: false,
        priceLevel,
        resumeExecutionId: resumeId,
        // Phase 2: Always use full generation when images are enabled
        phase2FullGeneration: generateImages,
        roomImageCount: ROOM_IMAGE_COUNT,
        materialImageCount: MATERIAL_IMAGE_COUNT,
        textureImageCount: TEXTURE_IMAGE_COUNT,
      }

      console.log('📤 Sending request:', requestBody)

      const response = await fetch('/api/admin/seed-styles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error('Failed to start generation')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response body')
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n\n')

        for (const line of lines) {
          if (!line.trim()) continue

          const [eventLine, dataLine] = line.split('\n')
          if (!eventLine?.startsWith('event:') || !dataLine?.startsWith('data:')) continue

          const event = eventLine.replace('event: ', '').trim()
          const data = JSON.parse(dataLine.replace('data: ', ''))

          if (event === 'start') {
            if (data.executionId) {
              setExecutionId(data.executionId)
            }
          } else if (event === 'progress') {
            setProgress((prev) => [...prev, data])
            if (data.current && data.total) {
              setCurrentProgress({ current: data.current, total: data.total })
            }
          } else if (event === 'style-completed') {
            setCompletedStyles((prev) => [
              ...prev,
              {
                styleId: data.styleId,
                styleName: data.styleName,
                slug: data.slug,
              },
            ])
          } else if (event === 'complete') {
            setResult(data.result)
            setIsRunning(false)
            setIsResuming(false)
            onComplete?.()
          } else if (event === 'error') {
            setError(data.error)
            setIsRunning(false)
            setIsResuming(false)
            onComplete?.()
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Stopped by user')
      } else {
        setError(err instanceof Error ? err.message : 'Unknown error')
      }
      setIsRunning(false)
    }
  }

  const stopSeeding = () => {
    abortControllerRef.current?.abort()
    setIsRunning(false)
  }

  // Auto-resume if resumeExecutionId is provided
  useEffect(() => {
    if (resumeExecutionId) {
      console.log('✅ Auto-starting resume for execution:', resumeExecutionId)
      startSeeding(resumeExecutionId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeExecutionId])

  return (
    <Stack gap="lg">
      {/* Configuration */}
      <Paper shadow="sm" p="lg" withBorder>
        <Stack gap="md">
          <Group gap="sm">
            <IconSparkles size={24} style={{ color: '#df2538' }} />
            <Title order={3}>יצירת סגנונות</Title>
          </Group>
          <Text c="dimmed" size="sm">
            יצירת סגנונות עיצוב באמצעות AI עם תמונות מלאות (102 תמונות לכל סגנון)
          </Text>

          <NumberInput
            label="מספר סגנונות"
            description={`יצור ${limit} סגנונות חדשים`}
            value={limit}
            onChange={(val) => setLimit(val as number)}
            min={1}
            max={60}
            disabled={isRunning}
          />

          <Select
            label="סינון לפי קטגוריה"
            description="השאר ריק ליצירת סגנונות מכל הקטגוריות"
            placeholder="כל הקטגוריות"
            data={CATEGORY_OPTIONS}
            value={categoryFilter}
            onChange={setCategoryFilter}
            clearable
            disabled={isRunning}
          />

          <Select
            label="רמת מחיר"
            description="משפיע על איכות החומרים ומילות מפתח יוקרה ביצירת AI"
            data={PRICE_LEVEL_OPTIONS.map(opt => ({
              value: opt.value,
              label: opt.label,
            }))}
            value={priceLevel}
            onChange={(val) => setPriceLevel(val as PriceLevel)}
            disabled={isRunning}
          />

          <Switch
            label="יצור תמונות (Gemini 2.5 Flash Image)"
            description={`יצור ${TOTAL_IMAGES_PER_STYLE} תמונות לכל סגנון (${ROOM_IMAGE_COUNT} חדרים + ${MATERIAL_IMAGE_COUNT} חומרים + ${TEXTURE_IMAGE_COUNT} טקסטורות + מיוחדים)`}
            checked={generateImages}
            onChange={(e) => setGenerateImages(e.currentTarget.checked)}
            disabled={isRunning}
          />

          <Switch
            label="הרצה יבשה (Dry Run)"
            description="בדיקה ללא שמירה בפועל - לבדיקת הקונפיגורציה"
            checked={dryRun}
            onChange={(e) => setDryRun(e.currentTarget.checked)}
            disabled={isRunning}
          />

          {/* Estimates */}
          <Paper withBorder p="md" style={{ backgroundColor: '#f8f9fa' }}>
            <Group justify="space-between">
              <Text fw={600} size="sm">הערכות:</Text>
              <Group gap="md">
                <Badge variant="light" size="lg">
                  ~{estimatedTime} דקות
                </Badge>
                <Badge variant="filled" color="blue" size="lg">
                  {estimatedImages.toLocaleString()} תמונות
                </Badge>
              </Group>
            </Group>
          </Paper>

          <Group justify="flex-end">
            {!isRunning ? (
              <Button
                leftSection={<IconPlayerPlay size={16} />}
                onClick={() => startSeeding()}
                size="lg"
                color="green"
              >
                התחל יצירה
              </Button>
            ) : (
              <Button leftSection={<IconPlayerStop size={16} />} onClick={stopSeeding} size="lg" color="red" variant="light">
                עצור
              </Button>
            )}
          </Group>

          {generateImages && (
            <Alert color="blue" variant="light">
              <Text size="sm">
                <strong>Phase 2 Generation:</strong> כל סגנון יקבל {TOTAL_IMAGES_PER_STYLE} תמונות - {ROOM_IMAGE_COUNT} תמונות חדרים (15 סוגים × 4 זוויות), {MATERIAL_IMAGE_COUNT} חומרים, {TEXTURE_IMAGE_COUNT} טקסטורות, + תמונת קומפוזיט ועוגן.
                כל התמונות מקושרות לסוגי חדרים ומותאמות לסגנון, גישה, צבע ורמת מחיר.
              </Text>
            </Alert>
          )}
        </Stack>
      </Paper>

      {/* Progress Display */}
      <ProgressDisplay
        isRunning={isRunning}
        isResuming={isResuming}
        executionId={executionId}
        currentProgress={currentProgress}
        progress={progress}
        completedStyles={completedStyles}
        priceLevel={priceLevel}
      />

      {/* Result Display */}
      <ResultDisplay result={result} error={error} />
    </Stack>
  )
}
