/**
 * Admin Layout Component
 * Provides admin-specific layout with navigation
 *
 * FIX: Removed useAdminGuard to eliminate duplicate session checking
 * The server layout (admin/layout.tsx) already validates admin access
 * No need to check again on the client side
 */

'use client'

import { useAuth } from '@/hooks/use-auth'
import { AppShell, Burger, Collapse, Container, Group, NavLink, Stack, Text } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import {
  IconBox,
  IconBuilding,
  IconCheck,
  IconChevronDown,
  IconChevronRight,
  IconDoor,
  IconLanguage,
  IconLayoutDashboard,
  IconPalette,
  IconSeeding,
  IconSparkles,
  IconUsers,
} from '@tabler/icons-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ImageViewerProvider } from '@/contexts/ImageViewerContext'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { useRouting } from '@/hooks/useRouting'

interface AdminLayoutProps {
  children: React.ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const t = useTranslations('admin')
  const { locale, pathname, isActive, prefetch } = useRouting()
  const { user } = useAuth()

  // Mobile navbar state
  const [mobileNavbarOpened, { toggle: toggleMobileNavbar, close: closeMobileNavbar }] = useDisclosure()

  // Check if style system section should be open - memoize to avoid recalculation
  const isStyleSystemActive = isActive('/admin/style-system')
  const [styleSystemOpen, setStyleSystemOpen] = useState(isStyleSystemActive)

  // Memoize navigation items to prevent recreation on every render
  const navItems = useMemo(() => [
    {
      label: t('navigation.dashboard'),
      icon: IconLayoutDashboard,
      href: `/${locale}/admin`,
      translationKey: 'dashboard',
    },
  ], [t, locale])

  const styleSystemItems = useMemo(() => [
    {
      label: t('navigation.categories'),
      icon: IconPalette,
      href: `/${locale}/admin/categories`,
    },
    {
      label: t('navigation.subCategories'),
      icon: IconPalette,
      href: `/${locale}/admin/sub-categories`,
    },
    {
      label: t('navigation.approaches'),
      icon: IconSparkles,
      href: `/${locale}/admin/style-system/approaches`,
    },
    {
      label: t('navigation.roomCategories'),
      icon: IconBuilding,
      href: `/${locale}/admin/style-system/room-categories`,
    },
    {
      label: t('navigation.roomTypes'),
      icon: IconDoor,
      href: `/${locale}/admin/style-system/room-types`,
    },
    {
      label: t('navigation.styles'),
      icon: IconPalette,
      href: `/${locale}/admin/styles`,
    },
  ], [t, locale])

  const otherItems = useMemo(() => [
    {
      label: t('navigation.approvals'),
      icon: IconCheck,
      href: `/${locale}/admin/styles/approvals`,
    },
    {
      label: t('navigation.colors'),
      icon: IconPalette,
      href: `/${locale}/admin/colors`,
    },
    {
      label: t('navigation.materials'),
      icon: IconBox,
      href: `/${locale}/admin/materials`,
    },
    {
      label: t('navigation.materialSettings'),
      icon: IconBox,
      href: `/${locale}/admin/materials/settings`,
    },
    {
      label: t('navigation.organizations'),
      icon: IconBuilding,
      href: `/${locale}/admin/organizations`,
    },
    {
      label: t('navigation.users'),
      icon: IconUsers,
      href: `/${locale}/admin/users`,
    },
    {
      label: t('navigation.translations'),
      icon: IconLanguage,
      href: `/${locale}/admin/translations`,
    },
    {
      label: t('navigation.seedStyles'),
      icon: IconSeeding,
      href: `/${locale}/admin/seed-styles`,
    },
  ], [t, locale])

  // FIX: Removed isLoading check and isAdmin check - server already validated
  // This eliminates duplicate session fetching and improves performance

  return (
    <AppShell
      padding="md"
      styles={{
        main: {
          backgroundColor: '#f7f7ed',
          minHeight: '100vh',
        },
      }}
      header={{ height: { base: 60, sm: 0 } }}
      navbar={{
        width: 250,
        breakpoint: 'sm',
        collapsed: { mobile: !mobileNavbarOpened },
      }}
    >
      {/* Mobile Header with Burger Menu */}
      <AppShell.Header hiddenFrom="sm" style={{ backgroundColor: '#ffffff' }}>
        <Group h="100%" px="md" justify="space-between">
          <Text fw={700} size="lg" c="brand">
            MoodB Admin
          </Text>
          <Group gap="xs">
            <LanguageSwitcher currentLocale={locale} variant="button" />
            <Burger
              opened={mobileNavbarOpened}
              onClick={toggleMobileNavbar}
              size="sm"
              aria-label="Toggle navigation"
            />
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md" style={{ backgroundColor: '#ffffff' }}>
        <Stack gap="md">
          {/* Admin Header */}
          <Group gap="sm" mb="lg" justify="space-between">
            <div>
              <Text fw={700} size="lg" c="brand">
                MoodB Admin
              </Text>
              <Text size="xs" c="dimmed">
                {user?.email}
              </Text>
            </div>
            <LanguageSwitcher currentLocale={locale} variant="button" />
          </Group>

          {/* Navigation */}
          <Stack gap="xs">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href.replace(`/${locale}`, ''), true)

              return (
                <NavLink
                  key={item.href}
                  component={Link}
                  href={item.href}
                  label={item.label}
                  leftSection={<Icon size={20} />}
                  active={active}
                  variant="subtle"
                  color="brand"
                  onClick={closeMobileNavbar}
                  onMouseEnter={() => prefetch(item.href.replace(`/${locale}`, ''))}
                />
              )
            })}

            {/* Style System Section */}
            <NavLink
              label={t('navigation.styleSystem')}
              leftSection={<IconPalette size={20} />}
              rightSection={
                styleSystemOpen ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />
              }
              onClick={() => setStyleSystemOpen(!styleSystemOpen)}
              variant="subtle"
              color="brand"
              active={isStyleSystemActive}
            />
            <Collapse in={styleSystemOpen}>
              <Stack gap={2} ml="md">
                {styleSystemItems.map((item) => {
                  const Icon = item.icon
                  const active = isActive(item.href.replace(`/${locale}`, ''))

                  return (
                    <NavLink
                      key={item.href}
                      component={Link}
                      href={item.href}
                      label={item.label}
                      leftSection={<Icon size={18} />}
                      active={active}
                      variant="subtle"
                      color="brand"
                      onClick={closeMobileNavbar}
                      onMouseEnter={() => prefetch(item.href.replace(`/${locale}`, ''))}
                    />
                  )
                })}
              </Stack>
            </Collapse>

            {/* Other Items */}
            {otherItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href.replace(`/${locale}`, ''))

              return (
                <NavLink
                  key={item.href}
                  component={Link}
                  href={item.href}
                  label={item.label}
                  leftSection={<Icon size={20} />}
                  active={active}
                  variant="subtle"
                  color="brand"
                  onClick={closeMobileNavbar}
                  onMouseEnter={() => prefetch(item.href.replace(`/${locale}`, ''))}
                />
              )
            })}
          </Stack>

          {/* Back to Dashboard */}
          <NavLink
            component={Link}
            href={`/${locale}/dashboard`}
            label={t('navigation.backToDashboard')}
            variant="subtle"
            mt="auto"
            onClick={closeMobileNavbar}
          />
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        <ImageViewerProvider>
          <Container size="xl">{children}</Container>
        </ImageViewerProvider>
      </AppShell.Main>
    </AppShell>
  )
}

