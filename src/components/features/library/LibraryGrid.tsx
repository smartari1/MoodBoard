'use client'

import { SimpleGrid } from '@mantine/core'

interface LibraryGridProps {
  children: React.ReactNode
  cols?: { base: number; sm?: number; md?: number; lg?: number; xl?: number }
  spacing?: 'sm' | 'md' | 'lg' | 'xl'
}

export function LibraryGrid({
  children,
  cols = { base: 1, sm: 2, md: 3, lg: 4 },
  spacing = 'xl',
}: LibraryGridProps) {
  return (
    <SimpleGrid cols={cols} spacing={spacing}>
      {children}
    </SimpleGrid>
  )
}
