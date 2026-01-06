'use client'

import { Box } from '@mantine/core'
import { ReactNode } from 'react'
import styles from './MasonryGrid.module.css'

interface MasonryGridProps {
  children: ReactNode
  className?: string
}

export function MasonryGrid({ children, className }: MasonryGridProps) {
  return (
    <Box className={`${styles.masonryGrid} ${className || ''}`}>
      {children}
    </Box>
  )
}
