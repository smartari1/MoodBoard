'use client'

import dynamic from 'next/dynamic'
import { Skeleton, Paper, Stack, Group, Box, SimpleGrid } from '@mantine/core'

/**
 * Loading skeleton for ImageUpload component
 */
function ImageUploadSkeleton() {
  return (
    <Stack gap="sm">
      <Skeleton height={14} width={100} radius="sm" />
      <Paper
        withBorder
        p="xl"
        radius="md"
        style={{
          borderStyle: 'dashed',
          backgroundColor: 'var(--mantine-color-gray-0)',
        }}
      >
        <Stack align="center" gap="xs" py="md">
          <Skeleton height={40} width={40} radius="xl" />
          <Skeleton height={16} width={150} radius="sm" />
          <Skeleton height={12} width={200} radius="sm" />
        </Stack>
      </Paper>
    </Stack>
  )
}

/**
 * Loading skeleton for ImageUpload with existing images
 */
function ImageUploadWithImagesSkeleton({ imageCount = 4 }: { imageCount?: number }) {
  return (
    <Stack gap="sm">
      <Skeleton height={14} width={100} radius="sm" />
      <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="sm">
        {Array.from({ length: imageCount }).map((_, i) => (
          <Skeleton key={i} height={120} radius="md" />
        ))}
        <Paper
          withBorder
          p="md"
          radius="md"
          style={{
            borderStyle: 'dashed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 120,
          }}
        >
          <Skeleton height={24} width={24} radius="xl" />
        </Paper>
      </SimpleGrid>
    </Stack>
  )
}

/**
 * Loading skeleton for RichTextEditor component
 */
function RichTextEditorSkeleton() {
  return (
    <Stack gap="xs">
      <Skeleton height={14} width={80} radius="sm" />
      <Paper withBorder radius="md">
        {/* Toolbar skeleton */}
        <Group gap="xs" p="xs" style={{ borderBottom: '1px solid var(--mantine-color-gray-3)' }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} height={28} width={28} radius="sm" />
          ))}
        </Group>
        {/* Editor area skeleton */}
        <Box p="md">
          <Stack gap="xs">
            <Skeleton height={16} width="90%" radius="sm" />
            <Skeleton height={16} width="75%" radius="sm" />
            <Skeleton height={16} width="85%" radius="sm" />
            <Skeleton height={16} width="60%" radius="sm" />
          </Stack>
        </Box>
      </Paper>
    </Stack>
  )
}

/**
 * Loading skeleton for IconSelector component
 */
function IconSelectorSkeleton() {
  return (
    <Stack gap="xs">
      <Skeleton height={14} width={100} radius="sm" />
      <Group gap="xs">
        <Skeleton height={36} style={{ flex: 1 }} radius="sm" />
        <Skeleton height={36} width={36} radius="sm" />
      </Group>
    </Stack>
  )
}

/**
 * Lazy-loaded ImageUpload component
 * Use this instead of direct import for better initial page load
 */
export const LazyImageUpload = dynamic(
  () => import('./ImageUpload').then((mod) => mod.ImageUpload),
  {
    loading: () => <ImageUploadSkeleton />,
    ssr: false,
  }
)

/**
 * Lazy-loaded RichTextEditor component
 * Use this instead of direct import for better initial page load
 */
export const LazyRichTextEditor = dynamic(
  () => import('./RichTextEditor').then((mod) => mod.RichTextEditor),
  {
    loading: () => <RichTextEditorSkeleton />,
    ssr: false,
  }
)

/**
 * Lazy-loaded IconSelector component
 * Use this instead of direct import for better initial page load
 */
export const LazyIconSelector = dynamic(
  () => import('./IconSelector').then((mod) => mod.IconSelector),
  {
    loading: () => <IconSelectorSkeleton />,
    ssr: false,
  }
)

// Export skeletons for custom usage
export {
  ImageUploadSkeleton,
  ImageUploadWithImagesSkeleton,
  RichTextEditorSkeleton,
  IconSelectorSkeleton,
}
