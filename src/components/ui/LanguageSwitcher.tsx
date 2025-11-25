/**
 * Language Switcher Component
 * Allows users to switch between supported locales (Hebrew/English)
 * Uses URL-based locale routing via next-intl
 */

'use client'

import { ActionIcon, Menu, Tooltip, Loader } from '@mantine/core'
import { IconLanguage } from '@tabler/icons-react'
import { locales, type Locale } from '@/i18n/request'
import { useRouting } from '@/hooks/useRouting'

interface LanguageSwitcherProps {
  currentLocale: string
  variant?: 'button' | 'menu'
}

const languageNames: Record<Locale, { native: string; english: string }> = {
  he: { native: 'עברית', english: 'Hebrew' },
  en: { native: 'English', english: 'English' },
}

export function LanguageSwitcher({
  currentLocale,
  variant = 'menu'
}: LanguageSwitcherProps) {
  const { switchLocale, isPending } = useRouting()

  if (variant === 'button') {
    return (
      <Tooltip label={languageNames[currentLocale as Locale]?.native || currentLocale}>
        <ActionIcon
          variant="subtle"
          size="lg"
          loading={isPending}
          onClick={() => {
            const nextLocale = currentLocale === 'he' ? 'en' : 'he'
            switchLocale(nextLocale as Locale)
          }}
        >
          {isPending ? <Loader size={16} /> : <IconLanguage size={20} />}
        </ActionIcon>
      </Tooltip>
    )
  }

  return (
    <Menu shadow="md" width={200} position="bottom-end">
      <Menu.Target>
        <ActionIcon
          variant="subtle"
          size="lg"
          aria-label="Switch language"
          loading={isPending}
        >
          {isPending ? <Loader size={16} /> : <IconLanguage size={20} />}
        </ActionIcon>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>שפה / Language</Menu.Label>
        {locales.map((locale) => (
          <Menu.Item
            key={locale}
            onClick={() => switchLocale(locale)}
            disabled={isPending}
            style={{
              backgroundColor: currentLocale === locale ? 'rgba(223, 37, 56, 0.1)' : undefined,
            }}
          >
            {languageNames[locale].native}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  )
}
