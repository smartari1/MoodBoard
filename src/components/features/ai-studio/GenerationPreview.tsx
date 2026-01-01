'use client'

import {
  ActionIcon,
  Badge,
  Box,
  Button,
  ColorSwatch,
  Divider,
  Group,
  Image,
  Loader,
  Paper,
  Progress,
  Stack,
  Text,
  Textarea,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core'
import {
  IconCategory,
  IconPalette,
  IconTexture,
  IconBox,
  IconDoor,
  IconDimensions,
  IconSparkles,
  IconAlertCircle,
  IconCheck,
  IconX,
} from '@tabler/icons-react'
import { usePathname } from 'next/navigation'
import { useMemo } from 'react'

import { useAIStudio } from '@/hooks/useAIStudio'
import { useCreditBalance, useHasCredits } from '@/hooks/useCredits'

interface GenerationPreviewProps {
  onGenerate: () => void
}

/**
 * GenerationPreview - Summary panel before generation
 * Shows selected items, room spec, and generate button
 */
export function GenerationPreview({ onGenerate }: GenerationPreviewProps) {
  const pathname = usePathname()
  const locale = (pathname?.split('/')[1] || 'he') as 'he' | 'en'

  const {
    input,
    selectedItems,
    isGenerating,
    generationProgress,
    generationError,
    previewImageUrl,
    setCustomPrompt,
    canGenerate,
  } = useAIStudio()

  const { data: creditBalance, isLoading: creditsLoading } = useCreditBalance()
  const { hasCredits } = useHasCredits(1)

  // Validation checks
  const validationItems = useMemo(() => {
    const items = [
      {
        label: 'קטגוריה',
        valid: !!input.categoryId,
        value: selectedItems.category?.name[locale] || null,
      },
      {
        label: 'תת-קטגוריה',
        valid: !!input.subCategoryId,
        value: selectedItems.subCategory?.name[locale] || null,
      },
      {
        label: 'צבעים',
        valid: input.colorIds.length > 0,
        value: input.colorIds.length > 0 ? `${input.colorIds.length} צבעים` : null,
      },
      {
        label: 'סוג חדר',
        valid: !!input.roomSpec.roomTypeId,
        value: input.roomSpec.roomTypeName?.[locale] || null,
      },
    ]
    return items
  }, [input, selectedItems, locale])

  const allValid = validationItems.every((item) => item.valid)
  const canStartGeneration = canGenerate() && hasCredits

  return (
    <Stack gap="lg">
      {/* Preview Title */}
      <Group gap="sm">
        <ThemeIcon size="lg" radius="xl" color="teal" variant="light">
          <IconSparkles size={20} />
        </ThemeIcon>
        <Title order={4}>תצוגה מקדימה</Title>
      </Group>

      {/* Preview Image */}
      {previewImageUrl ? (
        <Paper radius="md" style={{ overflow: 'hidden' }}>
          <Image
            src={previewImageUrl}
            alt="Preview"
            h={200}
            fit="cover"
            radius="md"
          />
        </Paper>
      ) : (
        <Paper
          p="xl"
          radius="md"
          style={{
            backgroundColor: 'var(--mantine-color-gray-1)',
            border: '2px dashed var(--mantine-color-gray-3)',
            minHeight: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Stack align="center" gap="xs">
            <IconSparkles size={48} color="var(--mantine-color-gray-5)" />
            <Text size="sm" c="dimmed" ta="center">
              התמונה שתיווצר תופיע כאן
            </Text>
          </Stack>
        </Paper>
      )}

      {/* Validation Checklist */}
      <Paper p="md" radius="md" withBorder>
        <Text size="sm" fw={600} mb="sm">
          דרישות מינימום
        </Text>
        <Stack gap="xs">
          {validationItems.map((item) => (
            <Group key={item.label} gap="xs" wrap="nowrap">
              <ThemeIcon
                size="xs"
                radius="xl"
                color={item.valid ? 'teal' : 'gray'}
                variant={item.valid ? 'filled' : 'light'}
              >
                {item.valid ? <IconCheck size={10} /> : <IconX size={10} />}
              </ThemeIcon>
              <Text size="xs" c={item.valid ? undefined : 'dimmed'}>
                {item.label}
              </Text>
              {item.value && (
                <Badge size="xs" variant="light" color="gray">
                  {item.value}
                </Badge>
              )}
            </Group>
          ))}
        </Stack>
      </Paper>

      {/* Selected Elements Summary */}
      {(selectedItems.colors.length > 0 ||
        selectedItems.textures.length > 0 ||
        selectedItems.materials.length > 0) && (
        <Paper p="md" radius="md" withBorder>
          <Text size="sm" fw={600} mb="sm">
            מרכיבים נבחרים
          </Text>
          <Stack gap="sm">
            {/* Colors */}
            {selectedItems.colors.length > 0 && (
              <Group gap="xs">
                <IconPalette size={14} color="var(--mantine-color-teal-6)" />
                <Group gap={4}>
                  {selectedItems.colors.map((color) => (
                    <Tooltip key={color.id} label={color.name[locale]}>
                      <ColorSwatch color={color.hex} size={20} />
                    </Tooltip>
                  ))}
                </Group>
              </Group>
            )}

            {/* Textures */}
            {selectedItems.textures.length > 0 && (
              <Group gap="xs" wrap="nowrap">
                <IconTexture size={14} color="var(--mantine-color-cyan-6)" />
                <Text size="xs" lineClamp={1}>
                  {selectedItems.textures.map((t) => t.name[locale]).join(', ')}
                </Text>
              </Group>
            )}

            {/* Materials */}
            {selectedItems.materials.length > 0 && (
              <Group gap="xs" wrap="nowrap">
                <IconBox size={14} color="var(--mantine-color-orange-6)" />
                <Text size="xs" lineClamp={1}>
                  {selectedItems.materials.map((m) => m.name[locale]).join(', ')}
                </Text>
              </Group>
            )}
          </Stack>
        </Paper>
      )}

      {/* Room Summary */}
      {input.roomSpec.roomTypeId && (
        <Paper p="md" radius="md" withBorder>
          <Text size="sm" fw={600} mb="sm">
            פרטי החדר
          </Text>
          <Stack gap="xs">
            <Group gap="xs">
              <IconDoor size={14} />
              <Text size="xs">{input.roomSpec.roomTypeName?.[locale]}</Text>
            </Group>
            <Group gap="xs">
              <IconDimensions size={14} />
              <Text size="xs">
                {input.roomSpec.dimensions.width}x{input.roomSpec.dimensions.length}x
                {input.roomSpec.dimensions.height} מטר
              </Text>
            </Group>
            {input.roomSpec.windows.count > 0 && (
              <Text size="xs" c="dimmed">
                {input.roomSpec.windows.count} חלונות{' '}
                {input.roomSpec.windows.size === 'floor-to-ceiling' ? 'מרצפה לתקרה' : ''}
              </Text>
            )}
          </Stack>
        </Paper>
      )}

      {/* Custom Prompt */}
      <Paper p="md" radius="md" withBorder>
        <Text size="sm" fw={600} mb="sm">
          פרומפט מותאם (אופציונלי)
        </Text>
        <Textarea
          placeholder="הוסף הנחיות מיוחדות ליצירת התמונה..."
          value={input.customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          minRows={2}
          maxRows={4}
          maxLength={500}
        />
        <Text size="xs" c="dimmed" ta="left" mt={4}>
          {input.customPrompt.length}/500
        </Text>
      </Paper>

      <Divider />

      {/* Credit Balance */}
      <Group justify="space-between">
        <Text size="sm" c="dimmed">
          עלות יצירה:
        </Text>
        <Badge size="lg" variant="light" color="teal">
          1 קרדיט
        </Badge>
      </Group>

      <Group justify="space-between">
        <Text size="sm" c="dimmed">
          יתרת קרדיטים:
        </Text>
        {creditsLoading ? (
          <Loader size="xs" />
        ) : (
          <Badge
            size="lg"
            variant="filled"
            color={hasCredits ? 'teal' : 'red'}
          >
            {creditBalance?.balance || 0}
          </Badge>
        )}
      </Group>

      {/* Error Message */}
      {generationError && (
        <Paper p="sm" radius="md" bg="red.0">
          <Group gap="xs">
            <IconAlertCircle size={16} color="var(--mantine-color-red-6)" />
            <Text size="sm" c="red.7">
              {generationError}
            </Text>
          </Group>
        </Paper>
      )}

      {/* Generation Progress */}
      {isGenerating && (
        <Stack gap="xs">
          <Group justify="space-between">
            <Text size="sm" fw={500}>
              יוצר תמונה...
            </Text>
            <Text size="sm" c="dimmed">
              {Math.round(generationProgress)}%
            </Text>
          </Group>
          <Progress
            value={generationProgress}
            size="lg"
            radius="xl"
            color="teal"
            animated
          />
        </Stack>
      )}

      {/* Generate Button */}
      <Button
        size="lg"
        fullWidth
        color="teal"
        leftSection={<IconSparkles size={20} />}
        onClick={onGenerate}
        loading={isGenerating}
        disabled={!canStartGeneration}
      >
        {isGenerating ? 'יוצר...' : 'ייצור תמונה'}
      </Button>

      {/* Validation Hints */}
      {!allValid && (
        <Text size="xs" c="dimmed" ta="center">
          יש להשלים את כל הדרישות לפני יצירת תמונה
        </Text>
      )}

      {!hasCredits && allValid && (
        <Text size="xs" c="red" ta="center">
          אין מספיק קרדיטים. יש לרכוש קרדיטים נוספים.
        </Text>
      )}
    </Stack>
  )
}
