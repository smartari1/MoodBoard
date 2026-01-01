/**
 * Dashboard Layout Component
 * Provides main app layout with navigation
 *
 * FIX: Removed duplicate auth checking to improve performance
 * The server layout (dashboard/layout.tsx) already validates authentication
 * No need to check again on the client side
 */

'use client'

import { AppShell, Burger, Group, Avatar, Menu, Text } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { useAuth } from '@/hooks/use-auth'
import { SidebarNavigation } from './SidebarNavigation'
import { Logo } from './Logo'
import { signOut } from 'next-auth/react'
import { IconLogout, IconUser } from '@tabler/icons-react'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { CreditBalance } from '@/components/ui/CreditBalance'
import { useRouting } from '@/hooks/useRouting'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [opened, { toggle }] = useDisclosure()
  const { user } = useAuth()
  const { locale } = useRouting()

  // FIX: Removed isLoading, isAuthenticated checks, and useEffect redirect
  // Server layout already validates auth - no need for duplicate checking
  // This eliminates:
  // 1. Duplicate useSession() call
  // 2. Loading screen flash
  // 3. Unnecessary re-renders

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 250,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
      styles={{
        main: {
          backgroundColor: '#f7f7ed', // MoodB brand background
        },
      }}
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Logo />
          </Group>

          <Group gap="sm">
            <CreditBalance locale={locale} />
            <LanguageSwitcher currentLocale={locale} variant="button" />

            {user && (
              <Menu shadow="md" width={200}>
                <Menu.Target>
                  <Avatar
                    src={user.imageUrl}
                    alt={user.fullName || user.email}
                    style={{ cursor: 'pointer' }}
                  />
                </Menu.Target>

                <Menu.Dropdown>
                  <Menu.Label>
                    <Text size="sm" fw={500}>{user.fullName || user.email}</Text>
                    <Text size="xs" c="dimmed">{user.email}</Text>
                  </Menu.Label>
                  <Menu.Divider />
                  <Menu.Item leftSection={<IconUser size={16} />}>
                    Profile
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<IconLogout size={16} />}
                    onClick={() => signOut({ callbackUrl: '/sign-in' })}
                  >
                    Sign out
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            )}
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <SidebarNavigation />
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  )
}

