/**
 * Manual Generation Tab
 * Allows precise control over style generation with specific selections
 */

'use client'

import { useState, useMemo, useRef } from 'react'
import { Stack, Paper, Title, Select, MultiSelect, Switch, Group, Button, Badge, Collapse, Alert, Text } from '@mantine/core'
import { IconPlayerPlay, IconChevronDown, IconChevronRight } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'
import { useSubCategories } from '@/hooks/useCategories'
import { useApproaches } from '@/hooks/useApproaches'
import { useColors } from '@/hooks/useColors'
import { calculateEstimatedCost } from '@/lib/seed/cost-calculator'
import { CostBreakdownTable } from '@/components/admin/CostBreakdownTable'
import { ProgressDisplay } from './ProgressDisplay'
import { ResultDisplay } from './ResultDisplay'
import { ROOM_TYPES, PRICE_LEVEL_OPTIONS, ProgressEvent, SeedResult, CompletedStyle, PriceLevel } from './shared'

interface ManualGenerationTabProps {
  onComplete?: () => void
}

export default function ManualGenerationTab({ onComplete }: ManualGenerationTabProps) {
  const t = useTranslations('admin.seed-styles.manual')

  // Form state
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null)
  const [selectedApproach, setSelectedApproach] = useState<string | null>(null)
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [selectedRooms, setSelectedRooms] = useState<string[]>([])
  const [generateImages, setGenerateImages] = useState(true)
  const [generateRoomProfiles, setGenerateRoomProfiles] = useState(true)
  // Phase 2: Price level
  const [priceLevel, setPriceLevel] = useState<PriceLevel>('REGULAR')

  // Progress state
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState<ProgressEvent[]>([])
  const [currentProgress, setCurrentProgress] = useState<{ current: number; total: number } | null>(null)
  const [result, setResult] = useState<SeedResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [executionId, setExecutionId] = useState<string | null>(null)
  const [completedStyles, setCompletedStyles] = useState<CompletedStyle[]>([])

  // UI state
  const [showCostBreakdown, setShowCostBreakdown] = useState(false)

  const abortControllerRef = useRef<AbortController | null>(null)

  // Fetch data
  const { data: subCategories, isLoading: loadingSubCategories } = useSubCategories()
  const { data: approaches, isLoading: loadingApproaches } = useApproaches()
  const { data: colors, isLoading: loadingColors } = useColors({ organizationId: 'null' })

  // Calculate cost
  const roomCount = generateRoomProfiles ? (selectedRooms.length > 0 ? selectedRooms.length : 24) : 0
  const costBreakdown = useMemo(
    () =>
      calculateEstimatedCost(1, {
        generateImages,
        generateRoomProfiles,
      }),
    [generateImages, generateRoomProfiles]
  )

  const estimatedImages = generateRoomProfiles ? 3 + roomCount * 3 : 3

  const startManualGeneration = async () => {
    setIsRunning(true)
    setProgress([])
    setCurrentProgress(null)
    setResult(null)
    setError(null)
    setExecutionId(null)
    setCompletedStyles([])

    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const response = await fetch('/api/admin/seed-styles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          limit: 1,
          subCategoryFilter: selectedSubCategory,
          manualMode: true,
          approachId: selectedApproach,
          colorId: selectedColor,
          roomTypeFilter: selectedRooms.length > 0 ? selectedRooms : undefined,
          generateImages,
          generateRoomProfiles,
          dryRun: false,
          priceLevel, // Phase 2: Price level
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(t('failedToStart'))
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error(t('noResponseBody'))
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
            onComplete?.()
          } else if (event === 'error') {
            setError(data.error)
            setIsRunning(false)
            onComplete?.()
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError(t('generationStopped'))
      } else {
        setError(err instanceof Error ? err.message : 'Unknown error')
      }
      setIsRunning(false)
    }
  }

  const isFormValid = selectedSubCategory && selectedApproach && selectedColor

  return (
    <Stack gap="lg">
      {/* Configuration Form */}
      <Paper shadow="sm" p="lg" withBorder>
        <Stack gap="md">
          <Title order={3}>{t('title')}</Title>
          <Text c="dimmed" size="sm">
            {t('subtitle')}
          </Text>

          {/* Sub-category Selector */}
          <Select
            label={t('subCategory')}
            placeholder={loadingSubCategories ? t('loading') : t('selectSubCategory')}
            description={t('subCategoryDesc')}
            data={
              subCategories?.data.map((sc) => ({
                value: sc.slug,
                label: `${sc.name.en} (${sc.category?.name.en || 'N/A'})`,
              })) || []
            }
            value={selectedSubCategory}
            onChange={setSelectedSubCategory}
            required
            searchable
            disabled={isRunning || loadingSubCategories}
          />

          {/* Approach Selector */}
          <Select
            label={t('approach')}
            placeholder={loadingApproaches ? t('loading') : t('selectApproach')}
            description={t('approachDesc')}
            data={
              approaches?.data.map((a) => ({
                value: a.id,
                label: a.name.en,
              })) || []
            }
            value={selectedApproach}
            onChange={setSelectedApproach}
            required
            searchable
            disabled={isRunning || loadingApproaches}
          />

          {/* Color Selector */}
          <Select
            label={t('color')}
            placeholder={loadingColors ? t('loading') : t('selectColor')}
            description={t('colorDesc')}
            data={
              colors?.data.map((c) => ({
                value: c.id,
                label: `${c.name.en}${c.hex ? ` (${c.hex})` : ''}`,
              })) || []
            }
            value={selectedColor}
            onChange={setSelectedColor}
            required
            searchable
            disabled={isRunning || loadingColors}
          />

          {/* Phase 2: Price Level Selector */}
          <Select
            label={t('priceLevel') || 'Price Level'}
            description={t('priceLevelDesc') || 'Controls material quality and luxury keywords in AI generation'}
            data={PRICE_LEVEL_OPTIONS.map(opt => ({
              value: opt.value,
              label: opt.label,
            }))}
            value={priceLevel}
            onChange={(val) => setPriceLevel(val as PriceLevel)}
            disabled={isRunning}
          />

          {/* Room Types Multi-Select */}
          <MultiSelect
            label={t('roomTypes')}
            description={t('roomTypesDesc')}
            placeholder={t('roomTypesPlaceholder')}
            data={ROOM_TYPES}
            value={selectedRooms}
            onChange={setSelectedRooms}
            searchable
            clearable
            disabled={isRunning || !generateRoomProfiles}
            maxDropdownHeight={300}
          />

          <Group gap="xs">
            <Text size="xs" c="dimmed">
              {t('quickSelect')}
            </Text>
            <Button
              size="xs"
              variant="light"
              onClick={() => setSelectedRooms(['living-room', 'dining-room', 'kitchen'])}
              disabled={isRunning || !generateRoomProfiles}
            >
              {t('mainRooms')}
            </Button>
            <Button
              size="xs"
              variant="light"
              onClick={() => setSelectedRooms(['primary-bedroom', 'bedroom', 'bathroom'])}
              disabled={isRunning || !generateRoomProfiles}
            >
              {t('bedrooms')}
            </Button>
            <Button
              size="xs"
              variant="light"
              onClick={() => setSelectedRooms(['home-office', 'library-reading-area', 'family-room-tv-area'])}
              disabled={isRunning || !generateRoomProfiles}
            >
              {t('workLeisure')}
            </Button>
          </Group>

          {/* Toggles */}
          <Switch
            label={t('generateImages')}
            description={t('generateImagesDesc', { total: estimatedImages, rooms: roomCount })}
            checked={generateImages}
            onChange={(e) => setGenerateImages(e.currentTarget.checked)}
            disabled={isRunning}
          />

          <Switch
            label={t('generateRoomProfiles')}
            description={t('generateRoomProfilesDesc')}
            checked={generateRoomProfiles}
            onChange={(e) => {
              setGenerateRoomProfiles(e.currentTarget.checked)
              if (!e.currentTarget.checked) {
                setSelectedRooms([])
              }
            }}
            disabled={isRunning || !generateImages}
          />

          {/* Cost Breakdown */}
          <Paper withBorder p="md" style={{ backgroundColor: '#f8f9fa' }}>
            <Stack gap="sm">
              <Group justify="space-between" style={{ cursor: 'pointer' }} onClick={() => setShowCostBreakdown(!showCostBreakdown)}>
                <Group gap="xs">
                  {showCostBreakdown ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                  <Text fw={600} size="sm">
                    {t('estimatedCost')}
                  </Text>
                </Group>
                <Badge variant="filled" color="blue" size="lg">
                  ${costBreakdown.grandTotal.toFixed(2)}
                </Badge>
              </Group>

              <Collapse in={showCostBreakdown}>
                <CostBreakdownTable breakdown={costBreakdown} />
              </Collapse>
            </Stack>
          </Paper>

          {/* Generate Button */}
          <Group justify="flex-end">
            <Button
              leftSection={<IconPlayerPlay size={16} />}
              onClick={startManualGeneration}
              size="lg"
              color="green"
              disabled={!isFormValid || isRunning}
            >
              {t('generateStyle')}
            </Button>
          </Group>

          {!isFormValid && (
            <Alert color="orange" variant="light">
              <Text size="sm">{t('formValidation')}</Text>
            </Alert>
          )}
        </Stack>
      </Paper>

      {/* Progress Display */}
      <ProgressDisplay
        isRunning={isRunning}
        isResuming={false}
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
