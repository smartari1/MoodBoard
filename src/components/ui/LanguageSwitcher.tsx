/**
 * Language Switcher Component
 * Allows users to switch between supported locales (Hebrew/English)
 * Uses URL-based locale routing via next-intl
 */

'use client'

import { usePathname, useRouter } from 'next/navigation'
import { ActionIcon, Menu, Tooltip } from '@mantine/core'
import { IconLanguage } from '@tabler/icons-react'
import { locales, type Locale } from '@/i18n/request'

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
  const router = useRouter()
  const pathname = usePathname()

  const switchLanguage = (newLocale: Locale) => {
    if (!pathname) return

    // Replace the current locale in the pathname with the new locale
    // pathname is like "/he/admin/styles" or "/en/dashboard"
    const segments = pathname.split('/')

    // segments[0] is empty, segments[1] is current locale
    if (segments.length >= 2 && locales.includes(segments[1] as Locale)) {
      segments[1] = newLocale
      const newPath = segments.join('/')
      router.push(newPath)
    } else {
      // Fallback: prepend locale
      router.push(`/${newLocale}${pathname}`)
    }
  }

  if (variant === 'button') {
    return (
      <Tooltip label={languageNames[currentLocale as Locale]?.native || currentLocale}>
        <ActionIcon
          variant="subtle"
          size="lg"
          onClick={() => {
            const nextLocale = currentLocale === 'he' ? 'en' : 'he'
            switchLanguage(nextLocale as Locale)
          }}
        >
          <IconLanguage size={20} />
        </ActionIcon>
      </Tooltip>
    )
  }

  return (
    <Menu shadow="md" width={200} position="bottom-end">
      <Menu.Target>
        <ActionIcon variant="subtle" size="lg" aria-label="Switch language">
          <IconLanguage size={20} />
        </ActionIcon>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>שפה / Language</Menu.Label>
        {locales.map((locale) => (
          <Menu.Item
            key={locale}
            onClick={() => switchLanguage(locale)}
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
