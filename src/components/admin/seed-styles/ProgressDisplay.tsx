/**
 * Shared Progress Display Component
 * Shows real-time SSE progress for seed generation
 * Enhanced for Phase 2: Textures, Materials, Special Images
 */

import { Paper, Stack, Group, Title, Badge, Progress, Timeline, Text, ScrollArea, Alert, Anchor, ThemeIcon, SimpleGrid } from '@mantine/core'
import { IconExternalLink, IconPhoto, IconBrush, IconPalette, IconSparkles, IconHome, IconCheck } from '@tabler/icons-react'
import { ProgressEvent, CompletedStyle, PriceLevel } from './shared'

// Phase icons for different generation phases
const PHASE_ICONS: Record<string, React.ReactNode> = {
  'Act 1': <IconBrush size={14} />,    // Script/Content
  'Act 2': <IconPalette size={14} />,  // Asset Prep
  'Act 3': <IconPhoto size={14} />,    // Golden Scenes
  'Act 3.5': <IconPalette size={14} />, // Textures
  'Act 3.55': <IconPalette size={14} />, // Materials
  'Act 3.6': <IconPhoto size={14} />,  // Material Images
  'Act 3.7': <IconSparkles size={14} />, // Special Images
  'Act 4': <IconHome size={14} />,     // Room Walkthrough
}

interface ProgressDisplayProps {
  isRunning: boolean
  isResuming: boolean
  executionId: string | null
  currentProgress: { current: number; total: number } | null
  progress: ProgressEvent[]
  completedStyles: CompletedStyle[]
  priceLevel?: PriceLevel
}

// Helper to detect Phase 2 act from message
function detectPhase(message: string): string | null {
  const actMatch = message.match(/Act (\d+\.?\d*):/)
  return actMatch ? `Act ${actMatch[1]}` : null
}

// Helper to get color for price level
function getPriceLevelColor(level?: PriceLevel): string {
  switch (level) {
    case 'LUXURY': return 'grape'
    case 'REGULAR': return 'teal'
    case 'RANDOM': return 'orange'
    default: return 'gray'
  }
}

export function ProgressDisplay({
  isRunning,
  isResuming,
  executionId,
  currentProgress,
  progress,
  completedStyles,
  priceLevel,
}: ProgressDisplayProps) {
  if (!isRunning || !currentProgress) {
    return null
  }

  // Detect current phase from latest progress
  const latestProgress = progress[progress.length - 1]
  const currentPhase = latestProgress ? detectPhase(latestProgress.message) : null

  return (
    <Paper shadow="sm" p="lg" withBorder>
      <Stack gap="md">
        {isResuming && (
          <Alert color="blue" title="Resuming Generation">
            Continuing from previous execution. Already generated styles will be skipped.
          </Alert>
        )}

        <Group justify="space-between">
          <Title order={3}>Progress</Title>
          <Group gap="sm">
            {executionId && (
              <Badge size="sm" variant="light" c="gray" style={{ fontFamily: 'monospace' }}>
                ID: {executionId.slice(0, 8)}...{executionId.slice(-4)}
              </Badge>
            )}
            {priceLevel && (
              <Badge size="sm" variant="filled" color={getPriceLevelColor(priceLevel)}>
                {priceLevel}
              </Badge>
            )}
            {isResuming && (
              <Badge size="sm" variant="light" color="blue">
                Resuming
              </Badge>
            )}
            <Badge size="lg" color="blue">
              {currentProgress.current} / {currentProgress.total}
            </Badge>
          </Group>
        </Group>

        {/* Current Phase Indicator */}
        {currentPhase && (
          <Paper withBorder p="sm" style={{ backgroundColor: '#f0f9ff' }}>
            <Group gap="xs">
              <ThemeIcon size="sm" variant="light" color="blue">
                {PHASE_ICONS[currentPhase] || <IconBrush size={14} />}
              </ThemeIcon>
              <Text size="sm" fw={500}>Current Phase: {currentPhase}</Text>
            </Group>
          </Paper>
        )}

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
  )
}
