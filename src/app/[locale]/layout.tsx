import { MantineProvider } from "@/components/providers/MantineProvider";
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { locales } from '@/i18n/request'
import { SessionProvider } from '@/components/providers/SessionProvider'
import { QueryProvider } from '@/lib/providers/QueryProvider'
import { ImageViewerProvider } from '@/contexts/ImageViewerContext'

// Force dynamic rendering for faster builds (auth-required pages don't benefit from static generation)
export const dynamic = 'force-dynamic'
export const dynamicParams = true

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  
  // Ensure that the incoming `locale` is valid
  if (!locales.includes(locale as any)) {
    notFound()
  }

  // Providing all messages to the client
  // Pass locale explicitly for better performance and caching
  const messages = await getMessages({ locale })

  // Determine direction based on locale
  const direction = locale === 'he' ? 'rtl' : 'ltr'

  return (
    <SessionProvider>
      <QueryProvider>
        <div lang={locale} dir={direction}>
          <NextIntlClientProvider messages={messages}>
            <MantineProvider locale={locale}>
              <ImageViewerProvider>
                {children}
              </ImageViewerProvider>
            </MantineProvider>
          </NextIntlClientProvider>
        </div>
      </QueryProvider>
    </SessionProvider>
  );
}

