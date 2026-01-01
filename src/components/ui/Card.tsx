'use client'

import { Card, CardProps } from '@mantine/core'
import { forwardRef, MouseEventHandler } from 'react'

// Extend CardProps to support polymorphic component prop and event handlers
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface MoodBCardProps extends Omit<CardProps, 'onMouseEnter' | 'onMouseLeave'> {
  component?: any
  href?: string
  onMouseEnter?: MouseEventHandler<any>
  onMouseLeave?: MouseEventHandler<any>
}

export const MoodBCard = forwardRef<HTMLDivElement, MoodBCardProps>(
  ({ children, component, ...props }, ref) => {
    return (
      <Card
        ref={ref as any}
        component={component}
        shadow="sm"
        padding="lg"
        radius="md"
        withBorder
        {...props}
      >
        {children}
      </Card>
    )
  }
)

MoodBCard.displayName = 'MoodBCard'

