/**
 * Execution History Table Component
 *
 * Displays list of all seed executions with their status and results
 */

'use client'

import { useState, useEffect } from 'react'
import {
  Table,
  Text,
  Stack,
  Group,
  Badge,
  Button,
  Anchor,
  Loader,
  Alert,
  Collapse,
  ScrollArea,
  Pagination,
  ActionIcon,
  Tooltip,
} from '@mantine/core'
import {
  IconChevronDown,
  IconChevronRight,
  IconExternalLink,
  IconClock,
  IconCurrencyDollar,
  IconRefresh,
} from '@tabler/icons-react'
import { formatCost, formatTimeEstimate } from '@/lib/seed/cost-calculator'

interface GeneratedStyleReference {
  styleId: string
  slug: string
  name: { he: string; en: string }
  subCategory: string
  approach: string
  color: string
  adminEditUrl: string
  publicViewUrl: string
}

interface SeedStats {
  totalSubCategories: number
  alreadyGenerated: number
  pendingBeforeSeed: number
  created: number
  updated: number
  skipped: number
  errorsCount: number
}

interface ExecutionSummary {
  id: string
  executedAt: string
  completedAt: string | null
  config: {
    limit?: number
    categoryFilter?: string
    subCategoryFilter?: string
    generateImages: boolean
    generateRoomProfiles: boolean
    dryRun: boolean
  }
  stats: SeedStats
  estimatedCost: number
  actualCost: number | null
  duration: number | null
  status: 'running' | 'completed' | 'failed' | 'stopped'
  error: string | null
  generatedStyles: {
    styleId: string
    name: { he: string; en: string }
    slug: string
    adminEditUrl: string
  }[]
  summary: {
    totalStyles: number
    created: number
    updated: number
    errors: number
    duration: number | null
    cost: number
  }
}

interface ExecutionHistoryTableProps {
  autoRefresh?: boolean
  refreshInterval?: number
}

export function ExecutionHistoryTable({
  autoRefresh = false,
  refreshInterval = 10000,
}: ExecutionHistoryTableProps) {
  const [executions, setExecutions] = useState<ExecutionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const limit = 10

  const fetchExecutions = async () => {
    try {
      setError(null)
      const response = await fetch(
        `/api/admin/seed-styles/history?limit=${limit}&offset=${(page - 1) * limit}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch execution history')
      }

      const data = await response.json()
      setExecutions(data.executions)
      setTotalCount(data.pagination.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchExecutions()
  }, [page])

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(fetchExecutions, refreshInterval)
    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, page])

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedRows(newExpanded)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return (
          <Badge color="blue" variant="light" leftSection={<Loader size={10} />}>
            Running
          </Badge>
        )
      case 'completed':
        return (
          <Badge color="green" variant="light">
            Completed
          </Badge>
        )
      case 'failed':
        return (
          <Badge color="red" variant="light">
            Failed
          </Badge>
        )
      case 'stopped':
        return (
          <Badge color="gray" variant="light">
            Stopped
          </Badge>
        )
      default:
        return <Badge variant="light">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <Stack align="center" py="xl">
        <Loader size="lg" />
        <Text c="dimmed">Loading execution history...</Text>
      </Stack>
    )
  }

  if (error) {
    return (
      <Alert color="red" title="Error loading history">
        {error}
      </Alert>
    )
  }

  if (executions.length === 0) {
    return (
      <Alert color="blue" title="No executions yet">
        Start your first generation to see execution history here.
      </Alert>
    )
  }

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Text size="sm" c="dimmed">
          Showing {executions.length} of {totalCount} executions
        </Text>
        <Tooltip label="Refresh">
          <ActionIcon variant="light" onClick={fetchExecutions}>
            <IconRefresh size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>

      <ScrollArea>
        <Table striped highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ width: 40 }}></Table.Th>
              <Table.Th>Date</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th style={{ textAlign: 'center' }}>Styles</Table.Th>
              <Table.Th style={{ textAlign: 'center' }}>Duration</Table.Th>
              <Table.Th style={{ textAlign: 'center' }}>Cost</Table.Th>
              <Table.Th style={{ textAlign: 'center' }}>Config</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {executions.map((execution) => {
              const isExpanded = expandedRows.has(execution.id)

              return (
                <>
                  <Table.Tr
                    key={execution.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => toggleRow(execution.id)}
                  >
                    <Table.Td>
                      {isExpanded ? (
                        <IconChevronDown size={16} />
                      ) : (
                        <IconChevronRight size={16} />
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Stack gap={0}>
                        <Text size="sm">
                          {new Date(execution.executedAt).toLocaleDateString()}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {new Date(execution.executedAt).toLocaleTimeString()}
                        </Text>
                      </Stack>
                    </Table.Td>
                    <Table.Td>{getStatusBadge(execution.status)}</Table.Td>
                    <Table.Td style={{ textAlign: 'center' }}>
                      <Group gap="xs" justify="center">
                        <Text fw={600} c="green">
                          {execution.summary.created}
                        </Text>
                        {execution.summary.errors > 0 && (
                          <Text c="red" size="sm">
                            ({execution.summary.errors} errors)
                          </Text>
                        )}
                      </Group>
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'center' }}>
                      {execution.duration ? (
                        <Group gap={4} justify="center">
                          <IconClock size={14} />
                          <Text size="sm">
                            {formatTimeEstimate(Math.ceil(execution.duration / 60))}
                          </Text>
                        </Group>
                      ) : (
                        <Text size="sm" c="dimmed">
                          -
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'center' }}>
                      <Group gap={4} justify="center">
                        <IconCurrencyDollar size={14} />
                        <Text size="sm">
                          {formatCost(execution.actualCost || execution.estimatedCost)}
                        </Text>
                      </Group>
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'center' }}>
                      <Group gap="xs" justify="center">
                        {execution.config.limit && (
                          <Badge size="sm" variant="outline">
                            Limit: {execution.config.limit}
                          </Badge>
                        )}
                        {execution.config.dryRun && (
                          <Badge size="sm" variant="outline" color="orange">
                            Dry Run
                          </Badge>
                        )}
                      </Group>
                    </Table.Td>
                  </Table.Tr>

                  {/* Expanded Row - Generated Styles */}
                  {isExpanded && (
                    <Table.Tr>
                      <Table.Td colSpan={7} style={{ backgroundColor: '#f8f9fa' }}>
                        <Collapse in={isExpanded}>
                          <Stack gap="md" p="md">
                            <Text fw={600}>Generated Styles ({execution.generatedStyles.length})</Text>

                            {execution.generatedStyles.length > 0 ? (
                              <ScrollArea h={200}>
                                <Table size="sm">
                                  <Table.Thead>
                                    <Table.Tr>
                                      <Table.Th>Style Name</Table.Th>
                                      <Table.Th>Sub-Category</Table.Th>
                                      <Table.Th>Actions</Table.Th>
                                    </Table.Tr>
                                  </Table.Thead>
                                  <Table.Tbody>
                                    {execution.generatedStyles.map((style) => (
                                      <Table.Tr key={style.styleId}>
                                        <Table.Td>
                                          <Text size="sm" fw={500}>
                                            {style.name.en}
                                          </Text>
                                          <Text size="xs" c="dimmed">
                                            {style.name.he}
                                          </Text>
                                        </Table.Td>
                                        <Table.Td>
                                          <Text size="sm">{style.slug}</Text>
                                        </Table.Td>
                                        <Table.Td>
                                          <Anchor
                                            href={style.adminEditUrl}
                                            size="sm"
                                            target="_blank"
                                          >
                                            <Group gap={4}>
                                              Edit
                                              <IconExternalLink size={12} />
                                            </Group>
                                          </Anchor>
                                        </Table.Td>
                                      </Table.Tr>
                                    ))}
                                  </Table.Tbody>
                                </Table>
                              </ScrollArea>
                            ) : (
                              <Text size="sm" c="dimmed">
                                No styles generated yet
                              </Text>
                            )}

                            {execution.error && (
                              <Alert color="red" title="Error">
                                {execution.error}
                              </Alert>
                            )}
                          </Stack>
                        </Collapse>
                      </Table.Td>
                    </Table.Tr>
                  )}
                </>
              )
            })}
          </Table.Tbody>
        </Table>
      </ScrollArea>

      {totalCount > limit && (
        <Group justify="center">
          <Pagination
            total={Math.ceil(totalCount / limit)}
            value={page}
            onChange={setPage}
          />
        </Group>
      )}
    </Stack>
  )
}
