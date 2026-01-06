'use client'

import { Box } from '@mantine/core'
import { ImageWithFallback } from '@/components/ui/ImageWithFallback'
import styles from './MasonryGrid.module.css'

interface MasonryImageProps {
  src: string
  alt: string
  onClick?: () => void
}

export function MasonryImage({ src, alt, onClick }: MasonryImageProps) {
  return (
    <Box
      className={styles.masonryItem}
      onClick={onClick}
      tabIndex={0}
      role="button"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick?.()
        }
      }}
    >
      <ImageWithFallback
        src={src}
        alt={alt}
        fit="cover"
        width="100%"
        radius={12}
        maxRetries={3}
        retryDelay={1000}
      />
    </Box>
  )
}
