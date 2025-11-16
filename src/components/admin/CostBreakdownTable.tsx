/**
 * Cost Breakdown Table Component
 *
 * Displays detailed cost breakdown for AI style generation
 */

import { Table, Text, Stack, Group, Badge } from '@mantine/core'
import { CostBreakdown, formatCost } from '@/lib/seed/cost-calculator'

interface CostBreakdownTableProps {
  breakdown: CostBreakdown
}

export function CostBreakdownTable({ breakdown }: CostBreakdownTableProps) {
  return (
    <Stack gap="md">
      <Table striped highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Component</Table.Th>
            <Table.Th style={{ textAlign: 'right' }}>Count</Table.Th>
            <Table.Th style={{ textAlign: 'right' }}>Cost/Unit</Table.Th>
            <Table.Th style={{ textAlign: 'right' }}>Total</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {/* Text Generation Section */}
          <Table.Tr>
            <Table.Td colSpan={4}>
              <Text fw={600} size="sm">
                Text Generation
              </Text>
            </Table.Td>
          </Table.Tr>
          <Table.Tr>
            <Table.Td pl="xl">AI Selection (Approach + Color)</Table.Td>
            <Table.Td style={{ textAlign: 'right' }}>
              {breakdown.textGeneration.aiSelection.count}
            </Table.Td>
            <Table.Td style={{ textAlign: 'right' }}>
              {formatCost(breakdown.textGeneration.aiSelection.costPer)}
            </Table.Td>
            <Table.Td style={{ textAlign: 'right' }}>
              {formatCost(breakdown.textGeneration.aiSelection.total)}
            </Table.Td>
          </Table.Tr>
          <Table.Tr>
            <Table.Td pl="xl">Main Content (Poetic + Factual)</Table.Td>
            <Table.Td style={{ textAlign: 'right' }}>
              {breakdown.textGeneration.mainContent.count}
            </Table.Td>
            <Table.Td style={{ textAlign: 'right' }}>
              {formatCost(breakdown.textGeneration.mainContent.costPer)}
            </Table.Td>
            <Table.Td style={{ textAlign: 'right' }}>
              {formatCost(breakdown.textGeneration.mainContent.total)}
            </Table.Td>
          </Table.Tr>
          {breakdown.textGeneration.roomProfiles.count > 0 && (
            <Table.Tr>
              <Table.Td pl="xl">Room Profiles (24 per style)</Table.Td>
              <Table.Td style={{ textAlign: 'right' }}>
                {breakdown.textGeneration.roomProfiles.count}
              </Table.Td>
              <Table.Td style={{ textAlign: 'right' }}>
                {formatCost(breakdown.textGeneration.roomProfiles.costPer)}
              </Table.Td>
              <Table.Td style={{ textAlign: 'right' }}>
                {formatCost(breakdown.textGeneration.roomProfiles.total)}
              </Table.Td>
            </Table.Tr>
          )}
          <Table.Tr>
            <Table.Td>
              <Text fw={600} size="sm">
                Text Generation Subtotal
              </Text>
            </Table.Td>
            <Table.Td colSpan={2}></Table.Td>
            <Table.Td style={{ textAlign: 'right' }}>
              <Text fw={600}>{formatCost(breakdown.textGeneration.subtotal)}</Text>
            </Table.Td>
          </Table.Tr>

          {/* Image Generation Section */}
          {(breakdown.imageGeneration.generalImages.count > 0 ||
            breakdown.imageGeneration.roomImages.count > 0) && (
            <>
              <Table.Tr>
                <Table.Td colSpan={4}>
                  <Text fw={600} size="sm">
                    Image Generation
                  </Text>
                </Table.Td>
              </Table.Tr>
              {breakdown.imageGeneration.generalImages.count > 0 && (
                <Table.Tr>
                  <Table.Td pl="xl">General Images (3 per style)</Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>
                    {breakdown.imageGeneration.generalImages.count}
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>
                    {formatCost(breakdown.imageGeneration.generalImages.costPer)}
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>
                    {formatCost(breakdown.imageGeneration.generalImages.total)}
                  </Table.Td>
                </Table.Tr>
              )}
              {breakdown.imageGeneration.roomImages.count > 0 && (
                <Table.Tr>
                  <Table.Td pl="xl">Room Images (24 rooms × 3 per style)</Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>
                    {breakdown.imageGeneration.roomImages.count}
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>
                    {formatCost(breakdown.imageGeneration.roomImages.costPer)}
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>
                    {formatCost(breakdown.imageGeneration.roomImages.total)}
                  </Table.Td>
                </Table.Tr>
              )}
              <Table.Tr>
                <Table.Td>
                  <Text fw={600} size="sm">
                    Image Generation Subtotal
                  </Text>
                </Table.Td>
                <Table.Td colSpan={2}></Table.Td>
                <Table.Td style={{ textAlign: 'right' }}>
                  <Text fw={600}>{formatCost(breakdown.imageGeneration.subtotal)}</Text>
                </Table.Td>
              </Table.Tr>
            </>
          )}

          {/* Grand Total */}
          <Table.Tr>
            <Table.Td>
              <Text fw={700} size="md">
                Grand Total
              </Text>
            </Table.Td>
            <Table.Td colSpan={2}></Table.Td>
            <Table.Td style={{ textAlign: 'right' }}>
              <Group gap="xs" justify="flex-end">
                <Badge size="lg" color="blue" variant="filled">
                  {formatCost(breakdown.grandTotal)}
                </Badge>
              </Group>
            </Table.Td>
          </Table.Tr>
        </Table.Tbody>
      </Table>

      <Text size="xs" c="dimmed" ta="center">
        * Costs are estimates based on Gemini API pricing. Actual costs may vary.
      </Text>
    </Stack>
  )
}
