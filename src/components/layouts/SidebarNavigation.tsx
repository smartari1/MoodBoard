'use client'

import { useTranslations } from 'next-intl'
import Link from 'next/link'
import {
  IconLayoutDashboard,
  IconFolder,
  IconUsers,
  IconPalette,
  IconCoins,
  IconBox,
  IconSettings,
} from '@tabler/icons-react'
import { NavLink, Stack } from '@mantine/core'
import { useRouting } from '@/hooks/useRouting'
import type { Icon } from '@tabler/icons-react'

interface NavItem {
  label: string
  icon: Icon
  href: string
  translationKey: string
}

export function SidebarNavigation() {
  const t = useTranslations('navigation')
  const { localizedHref, isActive, prefetch } = useRouting()

  const navItems: NavItem[] = [
    {
      label: t('dashboard'),
      icon: IconLayoutDashboard,
      href: '/dashboard',
      translationKey: 'dashboard',
    },
    {
      label: t('projects'),
      icon: IconFolder,
      href: '/projects',
      translationKey: 'projects',
    },
    {
      label: t('clients'),
      icon: IconUsers,
      href: '/clients',
      translationKey: 'clients',
    },
    {
      label: t('styles'),
      icon: IconPalette,
      href: '/styles',
      translationKey: 'styles',
    },
    {
      label: t('materials'),
      icon: IconBox,
      href: '/materials',
      translationKey: 'materials',
    },
    {
      label: t('budget'),
      icon: IconCoins,
      href: '/budget',
      translationKey: 'budget',
    },
    {
      label: t('settings'),
      icon: IconSettings,
      href: '/settings',
      translationKey: 'settings',
    },
  ]

  return (
    <Stack gap="xs" p="md">
      {navItems.map((item) => {
        const Icon = item.icon
        const fullHref = localizedHref(item.href)
        const active = isActive(item.href)

        return (
          <NavLink
            key={item.href}
            component={Link}
            href={fullHref}
            label={item.label}
            leftSection={<Icon size={20} />}
            active={active}
            variant="subtle"
            color="brand"
            onMouseEnter={() => prefetch(item.href)}
          />
        )
      })}
    </Stack>
  )
}

