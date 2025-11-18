/**
 * Bulk Generation Tab
 * AI-powered bulk style generation with filters and configuration
 */

'use client'

import { useState, useMemo, useRef } from 'react'
import { Stack, Paper, Title, NumberInput, Select, Switch, Group, Button, Radio, MultiSelect, Alert, Text, Badge, Collapse } from '@mantine/core'
import { IconPlayerPlay, IconPlayerStop, IconChevronDown, IconChevronRight } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'
import { calculateEstimatedCost } from '@/lib/seed/cost-calculator'
import { CostBreakdownTable } from '@/components/admin/CostBreakdownTable'
import { ProgressDisplay } from './ProgressDisplay'
import { ResultDisplay } from './ResultDisplay'
import { ROOM_TYPES, CATEGORY_OPTIONS, ProgressEvent, SeedResult, CompletedStyle } from './shared'

interface BulkGenerationTabProps {
  onComplete?: () => void
  resumeExecutionId?: string | null
}

export default function BulkGenerationTab({ onComplete, resumeExecutionId }: BulkGenerationTabProps) {
  const t = useTranslations('admin.seed-styles.bulk')

  // Configuration state
  const [limit, setLimit] = useState<number>(5)
  const [generateImages, setGenerateImages] = useState(true)
  const [generateRoomProfiles, setGenerateRoomProfiles] = useState(true)
  const [dryRun, setDryRun] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [roomSelection, setRoomSelection] = useState<'all' | 'specific'>('all')
  const [selectedRooms, setSelectedRooms] = useState<string[]>([])

  // Progress state
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState<ProgressEvent[]>([])
  const [currentProgress, setCurrentProgress] = useState<{ current: number; total: number } | null>(null)
  const [result, setResult] = useState<SeedResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [executionId, setExecutionId] = useState<string | null>(null)
  const [completedStyles, setCompletedStyles] = useState<CompletedStyle[]>([])
  const [isResuming, setIsResuming] = useState(false)

  // UI state
  const [showCostBreakdown, setShowCostBreakdown] = useState(false)

  const abortControllerRef = useRef<AbortController | null>(null)

  // Calculate cost breakdown
  const costBreakdown = useMemo(
    () =>
      calculateEstimatedCost(limit, {
        generateImages,
        generateRoomProfiles,
      }),
    [limit, generateImages, generateRoomProfiles]
  )

  const estimatedTime = limit * 3 // ~3 minutes per style
  const roomCount = generateRoomProfiles ? (roomSelection === 'specific' && selectedRooms.length > 0 ? selectedRooms.length : 24) : 0
  const estimatedImages = generateRoomProfiles ? limit * (3 + roomCount * 3) : limit * 3

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
      const response = await fetch('/api/admin/seed-styles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          limit,
          generateImages,
          generateRoomProfiles,
          dryRun,
          categoryFilter: categoryFilter || undefined,
          roomTypeFilter: roomSelection === 'specific' && selectedRooms.length > 0 ? selectedRooms : undefined,
          resumeExecutionId: resumeId,
          manualMode: false, // Use AI selection
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
        setError(t('stoppedByUser'))
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
  useState(() => {
    if (resumeExecutionId) {
      startSeeding(resumeExecutionId)
    }
  })

  return (
    <Stack gap="lg">
      {/* Configuration */}
      <Paper shadow="sm" p="lg" withBorder>
        <Stack gap="md">
          <Title order={3}>{t('title')}</Title>
          <Text c="dimmed" size="sm">
            {t('subtitle')}
          </Text>

          <NumberInput
            label={t('numberOfStyles')}
            description={t('numberOfStylesDesc', { limit })}
            value={limit}
            onChange={(val) => setLimit(val as number)}
            min={1}
            max={60}
            disabled={isRunning}
          />

          <Select
            label={t('categoryFilter')}
            description={t('categoryFilterDesc')}
            placeholder={t('allCategories')}
            data={CATEGORY_OPTIONS}
            value={categoryFilter}
            onChange={setCategoryFilter}
            clearable
            disabled={isRunning}
          />

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
                setRoomSelection('all')
                setSelectedRooms([])
              }
            }}
            disabled={isRunning || !generateImages}
          />

          {generateRoomProfiles && (
            <Paper withBorder p="md" style={{ backgroundColor: '#f0f9ff' }}>
              <Stack gap="md">
                <Text fw={600} size="sm">
                  {t('roomSelection')}
                </Text>

                <Radio.Group
                  value={roomSelection}
                  onChange={(value) => {
                    setRoomSelection(value as 'all' | 'specific')
                    if (value === 'all') {
                      setSelectedRooms([])
                    }
                  }}
                >
                  <Stack gap="xs">
                    <Radio value="all" label={t('allRooms')} description={t('allRoomsDesc')} disabled={isRunning} />
                    <Radio value="specific" label={t('specificRooms')} description={t('specificRoomsDesc')} disabled={isRunning} />
                  </Stack>
                </Radio.Group>

                {roomSelection === 'specific' && (
                  <>
                    <MultiSelect
                      label={t('selectRoomTypes')}
                      description={t('selectRoomTypesDesc')}
                      placeholder={t('pickRooms')}
                      data={ROOM_TYPES}
                      value={selectedRooms}
                      onChange={setSelectedRooms}
                      searchable
                      clearable
                      disabled={isRunning}
                      maxDropdownHeight={300}
                    />

                    <Group gap="xs">
                      <Text size="xs" c="dimmed">
                        {t('quickSelect')}
                      </Text>
                      <Button size="xs" variant="light" onClick={() => setSelectedRooms(['living-room', 'dining-room', 'kitchen'])} disabled={isRunning}>
                        {t('mainRooms')}
                      </Button>
                      <Button size="xs" variant="light" onClick={() => setSelectedRooms(['primary-bedroom', 'bedroom', 'bathroom'])} disabled={isRunning}>
                        {t('bedrooms')}
                      </Button>
                      <Button size="xs" variant="light" onClick={() => setSelectedRooms(['home-office', 'library-reading-area', 'family-room-tv-area'])} disabled={isRunning}>
                        {t('workLeisure')}
                      </Button>
                    </Group>
                  </>
                )}

                {roomSelection === 'specific' && selectedRooms.length > 0 && (
                  <Alert color="blue" variant="light">
                    <Text size="sm">
                      {t('selectedRooms', { count: selectedRooms.length, s: selectedRooms.length > 1 ? 'ים' : '', total: selectedRooms.length * 3 })}
                    </Text>
                  </Alert>
                )}
              </Stack>
            </Paper>
          )}

          <Switch label={t('dryRun')} description={t('dryRunDesc')} checked={dryRun} onChange={(e) => setDryRun(e.currentTarget.checked)} disabled={isRunning} />

          <Paper withBorder p="md" style={{ backgroundColor: '#f8f9fa' }}>
            <Stack gap="sm">
              <Group justify="space-between" style={{ cursor: 'pointer' }} onClick={() => setShowCostBreakdown(!showCostBreakdown)}>
                <Group gap="xs">
                  {showCostBreakdown ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                  <Text fw={600} size="sm">
                    {t('estimatedCostTime')}
                  </Text>
                </Group>
                <Group gap="md">
                  <Badge variant="light" size="lg">
                    ~{estimatedTime} min
                  </Badge>
                  <Badge variant="filled" color="blue" size="lg">
                    ${costBreakdown.grandTotal.toFixed(2)}
                  </Badge>
                </Group>
              </Group>

              <Collapse in={showCostBreakdown}>
                <CostBreakdownTable breakdown={costBreakdown} />
              </Collapse>
            </Stack>
          </Paper>

          <Group justify="flex-end">
            {!isRunning ? (
              <Button
                leftSection={<IconPlayerPlay size={16} />}
                onClick={() => startSeeding()}
                size="lg"
                color="green"
                disabled={roomSelection === 'specific' && selectedRooms.length === 0 && generateRoomProfiles}
              >
                {t('startGeneration')}
              </Button>
            ) : (
              <Button leftSection={<IconPlayerStop size={16} />} onClick={stopSeeding} size="lg" color="red" variant="light">
                {t('stop')}
              </Button>
            )}
          </Group>

          {roomSelection === 'specific' && selectedRooms.length === 0 && generateRoomProfiles && (
            <Alert color="orange" variant="light">
              <Text size="sm">{t('selectRoomsWarning')}</Text>
            </Alert>
          )}
        </Stack>
      </Paper>

      {/* Progress Display */}
      <ProgressDisplay isRunning={isRunning} isResuming={isResuming} executionId={executionId} currentProgress={currentProgress} progress={progress} completedStyles={completedStyles} />

      {/* Result Display */}
      <ResultDisplay result={result} error={error} />
    </Stack>
  )
}
