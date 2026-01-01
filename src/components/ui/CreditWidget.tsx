'use client'

import {
  IconBolt,
  IconCrown,
  IconRocket,
} from '@tabler/icons-react'
import { Box, Group, RingProgress, Stack, Text, ThemeIcon, Tooltip } from '@mantine/core'
import { useCreditBalance } from '@/hooks/useCredits'

// Plan credit limits
const PLAN_CREDITS = {
  free: 20,
  pro: 100,
  enterprise: 500,
} as const

export function CreditWidget() {
  const { data: creditBalance, isLoading: creditsLoading } = useCreditBalance()

  const credits = creditBalance?.balance ?? 0
  const maxCredits = creditBalance?.monthlyCredits ?? PLAN_CREDITS.free
  const currentPlan = maxCredits === 500 ? 'enterprise' : maxCredits === 100 ? 'pro' : 'free'
  const creditPercentage = maxCredits > 0 ? Math.min((credits / maxCredits) * 100, 100) : 0

  return (
    <>
      <Tooltip
        label={`${credits} מתוך ${maxCredits} קרדיטים זמינים בחבילת ${getPlanLabel(currentPlan)}`}
        position="top"
        withArrow
      >
        <Box
          p="md"
          style={{
            background: `linear-gradient(135deg, ${getGradientColors(currentPlan).from} 0%, ${getGradientColors(currentPlan).to} 100%)`,
            borderRadius: 'var(--mantine-radius-lg)',
            cursor: 'pointer',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          <Group justify="space-between" align="center" wrap="nowrap">
            {/* Left side - Ring Progress with credits count */}
            <Group gap="sm" wrap="nowrap">
              <Box pos="relative">
                <RingProgress
                  size={56}
                  thickness={5}
                  roundCaps
                  sections={[
                    {
                      value: creditPercentage,
                      color: getProgressColor(credits, maxCredits),
                    },
                  ]}
                  label={
                    <Text
                      size="xs"
                      fw={700}
                      ta="center"
                      c="white"
                      style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
                    >
                      {creditsLoading ? '...' : credits}
                    </Text>
                  }
                />
                {credits <= 3 && credits > 0 && (
                  <Box
                    pos="absolute"
                    top={-2}
                    right={-2}
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      backgroundColor: '#ff6b6b',
                      border: '2px solid white',
                      animation: 'creditPulse 2s infinite',
                    }}
                  />
                )}
              </Box>

              <Stack gap={2}>
                <Text size="sm" fw={600} c="white" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
                  קרדיטים
                </Text>
                <Text size="xs" c="rgba(255,255,255,0.85)">
                  {credits}/{maxCredits} נותרו
                </Text>
              </Stack>
            </Group>

            {/* Right side - Plan badge */}
            <ThemeIcon
              size={36}
              radius="xl"
              variant="white"
              color={getPlanColor(currentPlan)}
              style={{
                backgroundColor: 'rgba(255,255,255,0.95)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              }}
            >
              {getPlanIcon(currentPlan)}
            </ThemeIcon>
          </Group>

          {/* Plan label */}
          <Group justify="space-between" mt="xs">
            <Text size="xs" c="rgba(255,255,255,0.75)" fw={500}>
              חבילת {getPlanLabel(currentPlan)}
            </Text>
            {credits === 0 && (
              <Text size="xs" c="rgba(255,255,255,0.9)" fw={600}>
                שדרג עכשיו
              </Text>
            )}
          </Group>
        </Box>
      </Tooltip>

      {/* CSS for pulse animation */}
      <style jsx global>{`
        @keyframes creditPulse {
          0% {
            box-shadow: 0 0 0 0 rgba(255, 107, 107, 0.7);
          }
          70% {
            box-shadow: 0 0 0 6px rgba(255, 107, 107, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(255, 107, 107, 0);
          }
        }
      `}</style>
    </>
  )
}

function getPlanLabel(plan: string): string {
  switch (plan) {
    case 'free':
      return 'חינם'
    case 'pro':
      return 'פרו'
    case 'enterprise':
      return 'ארגוני'
    default:
      return plan
  }
}

function getPlanColor(plan: string): string {
  switch (plan) {
    case 'enterprise':
      return 'violet'
    case 'pro':
      return 'teal'
    default:
      return 'gray'
  }
}

function getPlanIcon(plan: string) {
  switch (plan) {
    case 'enterprise':
      return <IconCrown size={20} />
    case 'pro':
      return <IconRocket size={20} />
    default:
      return <IconBolt size={20} />
  }
}

function getGradientColors(plan: string): { from: string; to: string } {
  switch (plan) {
    case 'enterprise':
      return { from: '#7c3aed', to: '#a855f7' } // Violet gradient
    case 'pro':
      return { from: '#0d9488', to: '#14b8a6' } // Teal gradient
    default:
      return { from: '#475569', to: '#64748b' } // Slate gradient
  }
}

function getProgressColor(credits: number, maxCredits: number): string {
  const percentage = (credits / maxCredits) * 100
  if (percentage > 50) return 'rgba(255,255,255,0.9)'
  if (percentage > 20) return '#fbbf24' // Yellow/amber
  return '#ef4444' // Red
}
