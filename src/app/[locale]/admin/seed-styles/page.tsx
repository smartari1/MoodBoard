'use client'

/**
 * Admin Page: AI-Powered Style Seeding
 *
 * Minimal UI to control and monitor the style generation process
 */

import { useState, useRef, useMemo } from 'react'
import { Container, Title, Text, Paper, Stack, Group, Button, NumberInput, Switch, Select, Progress, Badge, Alert, Timeline, ScrollArea, Collapse, Anchor, Divider } from '@mantine/core'
import { IconRobot, IconAlertCircle, IconCheck, IconX, IconPlayerPlay, IconPlayerStop, IconChevronDown, IconChevronRight, IconExternalLink } from '@tabler/icons-react'
import { CostBreakdownTable } from '@/components/admin/CostBreakdownTable'
import { ExecutionHistoryTable } from '@/components/admin/ExecutionHistoryTable'
import { calculateEstimatedCost } from '@/lib/seed/cost-calculator'

interface ProgressEvent {
  message: string
  current?: number
  total?: number
  percentage?: number
  timestamp: string
}

interface SeedResult {
  success: boolean
  stats: {
    styles: { created: number; updated: number; skipped: number }
  }
  errors: Array<{ entity: string; error: string }>
}

export default function SeedStylesPage() {
  // Configuration
  const [limit, setLimit] = useState<number>(5)
  const [generateImages, setGenerateImages] = useState(true)
  const [generateRoomProfiles, setGenerateRoomProfiles] = useState(true)
  const [dryRun, setDryRun] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)

  // State
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState<ProgressEvent[]>([])
  const [currentProgress, setCurrentProgress] = useState<{ current: number; total: number } | null>(null)
  const [result, setResult] = useState<SeedResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [executionId, setExecutionId] = useState<string | null>(null)
  const [completedStyles, setCompletedStyles] = useState<Array<{ styleId: string; styleName: { he: string; en: string }; slug: string }>>([])
  const [showCostBreakdown, setShowCostBreakdown] = useState(false)
  const [refreshHistory, setRefreshHistory] = useState(0)

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

  const startSeeding = async () => {
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
          limit,
          generateImages,
          generateRoomProfiles,
          dryRun,
          categoryFilter: categoryFilter || undefined,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error('Failed to start seeding')
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
            setRefreshHistory((prev) => prev + 1) // Trigger history refresh
          } else if (event === 'error') {
            setError(data.error)
            setIsRunning(false)
            setRefreshHistory((prev) => prev + 1) // Trigger history refresh
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Seeding stopped by user')
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

  const estimatedTime = limit * 3 // ~3 minutes per style (rough estimate)
  const estimatedImages = generateRoomProfiles ? limit * (3 + 24 * 3) : limit * 3

  return (
    <Container size="lg" py="xl">
      <Stack gap="lg">
        {/* Header */}
        <div>
          <Group gap="sm" mb="xs">
            <IconRobot size={32} />
            <Title order={1}>AI Style Generation</Title>
          </Group>
          <Text c="dimmed">
            Generate comprehensive style pages with hybrid poetic + factual content, AI-selected approach/color combinations, and room-specific profiles.
          </Text>
        </div>

        {/* Configuration */}
        <Paper shadow="sm" p="lg" withBorder>
          <Stack gap="md">
            <Title order={3}>Configuration</Title>

            <NumberInput
              label="Number of Styles to Generate"
              description={`Generate styles for the first ${limit} sub-categories (max 60 total)`}
              value={limit}
              onChange={(val) => setLimit(val as number)}
              min={1}
              max={60}
              disabled={isRunning}
            />

            <Select
              label="Category Filter (Optional)"
              description="Only generate styles for sub-categories in this category"
              placeholder="All categories"
              data={[
                { value: 'ancient-world', label: 'Ancient World' },
                { value: 'classical-styles', label: 'Classical Styles' },
                { value: 'regional-styles', label: 'Regional Styles' },
                { value: 'early-modern', label: 'Early Modern' },
                { value: '20th-century-design', label: '20th Century Design' },
                { value: 'contemporary-design', label: 'Contemporary Design' },
                { value: 'design-approaches', label: 'Design Approaches' },
              ]}
              value={categoryFilter}
              onChange={setCategoryFilter}
              clearable
              disabled={isRunning}
            />

            <Switch
              label="Generate Images (Gemini 2.5 Flash Image)"
              description={`Will generate ${estimatedImages} images total (3 general + 24 rooms × 3 images per style)`}
              checked={generateImages}
              onChange={(e) => setGenerateImages(e.currentTarget.checked)}
              disabled={isRunning}
            />

            <Switch
              label="Generate Room Profiles (All 24 Room Types)"
              description="Create detailed room-specific content and images for each style"
              checked={generateRoomProfiles}
              onChange={(e) => setGenerateRoomProfiles(e.currentTarget.checked)}
              disabled={isRunning || !generateImages}
            />

            <Switch
              label="Dry Run (Test Without Saving)"
              description="Simulate the process without saving to database"
              checked={dryRun}
              onChange={(e) => setDryRun(e.currentTarget.checked)}
              disabled={isRunning}
            />

            <Paper withBorder p="md" style={{ backgroundColor: '#f8f9fa' }}>
              <Stack gap="sm">
                <Group
                  justify="space-between"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setShowCostBreakdown(!showCostBreakdown)}
                >
                  <Group gap="xs">
                    {showCostBreakdown ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                    <Text fw={600} size="sm">
                      Estimated Cost & Time
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
                  onClick={startSeeding}
                  size="lg"
                  color="green"
                >
                  Start Generation
                </Button>
              ) : (
                <Button
                  leftSection={<IconPlayerStop size={16} />}
                  onClick={stopSeeding}
                  size="lg"
                  color="red"
                  variant="light"
                >
                  Stop
                </Button>
              )}
            </Group>
          </Stack>
        </Paper>

        {/* Progress */}
        {isRunning && currentProgress && (
          <Paper shadow="sm" p="lg" withBorder>
            <Stack gap="md">
              <Group justify="space-between">
                <Title order={3}>Progress</Title>
                <Group gap="sm">
                  {executionId && (
                    <Badge size="sm" variant="light" color="gray">
                      ID: {executionId.slice(0, 8)}...
                    </Badge>
                  )}
                  <Badge size="lg" color="blue">
                    {currentProgress.current} / {currentProgress.total}
                  </Badge>
                </Group>
              </Group>

              <Progress
                value={(currentProgress.current / currentProgress.total) * 100}
                size="xl"
                animated
                color="blue"
              />

              {/* Completed Styles */}
              {completedStyles.length > 0 && (
                <Paper withBorder p="md" style={{ backgroundColor: '#f0fdf4' }}>
                  <Stack gap="xs">
                    <Text fw={600} size="sm" c="green">
                      Completed Styles ({completedStyles.length})
                    </Text>
                    <ScrollArea h={120}>
                      <Stack gap="xs">
                        {completedStyles.map((style) => (
                          <Group key={style.styleId} justify="space-between">
                            <div>
                              <Text size="sm">{style.styleName.en}</Text>
                              <Text size="xs" c="dimmed">
                                {style.styleName.he}
                              </Text>
                            </div>
                            <Anchor href={`/admin/styles/${style.styleId}/edit`} target="_blank" size="sm">
                              <Group gap={4}>
                                Edit
                                <IconExternalLink size={12} />
                              </Group>
                            </Anchor>
                          </Group>
                        ))}
                      </Stack>
                    </ScrollArea>
                  </Stack>
                </Paper>
              )}

              <ScrollArea h={300} type="auto">
                <Timeline active={progress.length} bulletSize={20}>
                  {progress.slice(-20).map((p, idx) => (
                    <Timeline.Item key={idx} title={p.message}>
                      <Text size="xs" c="dimmed">
                        {new Date(p.timestamp).toLocaleTimeString()}
                        {p.percentage !== undefined && ` • ${p.percentage}%`}
                      </Text>
                    </Timeline.Item>
                  ))}
                </Timeline>
              </ScrollArea>
            </Stack>
          </Paper>
        )}

        {/* Result */}
        {result && (
          <Paper shadow="sm" p="lg" withBorder>
            <Stack gap="md">
              <Group justify="space-between">
                <Title order={3}>
                  {result.success ? (
                    <Group gap="xs">
                      <IconCheck color="green" />
                      <span>Completed Successfully</span>
                    </Group>
                  ) : (
                    <Group gap="xs">
                      <IconX color="red" />
                      <span>Completed with Errors</span>
                    </Group>
                  )}
                </Title>
              </Group>

              <Group gap="xl">
                <div>
                  <Text size="sm" c="dimmed">Created</Text>
                  <Text size="xl" fw={600} c="green">{result.stats.styles.created}</Text>
                </div>
                <div>
                  <Text size="sm" c="dimmed">Updated</Text>
                  <Text size="xl" fw={600} c="blue">{result.stats.styles.updated}</Text>
                </div>
                <div>
                  <Text size="sm" c="dimmed">Skipped</Text>
                  <Text size="xl" fw={600} c="gray">{result.stats.styles.skipped}</Text>
                </div>
                <div>
                  <Text size="sm" c="dimmed">Errors</Text>
                  <Text size="xl" fw={600} c="red">{result.errors.length}</Text>
                </div>
              </Group>

              {result.errors.length > 0 && (
                <Alert color="red" title="Errors">
                  <ScrollArea h={200}>
                    <Stack gap="xs">
                      {result.errors.map((err, idx) => (
                        <Text key={idx} size="sm">
                          • {err.entity}: {err.error}
                        </Text>
                      ))}
                    </Stack>
                  </ScrollArea>
                </Alert>
              )}
            </Stack>
          </Paper>
        )}

        {/* Error */}
        {error && (
          <Alert icon={<IconAlertCircle />} color="red" title="Error">
            {error}
          </Alert>
        )}

        {/* Execution History */}
        <Divider my="xl" />

        <Paper shadow="sm" p="lg" withBorder>
          <Stack gap="md">
            <Title order={3}>Execution History</Title>
            <Text c="dimmed" size="sm">
              View all previous seed executions and their results
            </Text>
            <ExecutionHistoryTable
              autoRefresh={isRunning}
              refreshInterval={5000}
              key={refreshHistory}
            />
          </Stack>
        </Paper>
      </Stack>
    </Container>
  )
}
