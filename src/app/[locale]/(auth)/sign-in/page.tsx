'use client'

import { signIn } from 'next-auth/react'
import { Container, Paper, Title, Text, Stack, Button, Loader, Center, Box } from '@mantine/core'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useRouter } from 'next/navigation'
import { Logo } from '@/components/layouts'
import { useTranslations } from 'next-intl'
import { IconBrandGoogle } from '@tabler/icons-react'

export default function SignInPage() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()
  const locale = pathname?.split('/')[1] || 'he'
  const t = useTranslations('auth')
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [hasRedirected, setHasRedirected] = useState(false)
  
  // Redirect if already authenticated - only once with delay to prevent loops
  useEffect(() => {
    if (!isLoading && isAuthenticated && !hasRedirected) {
      setHasRedirected(true)
      const redirectUrl = searchParams.get('redirect_url') || `/${locale}/dashboard`
      
      // Add a small delay to ensure auth state is properly synced
      const timer = setTimeout(() => {
        // Use router.replace instead of window.location to work better with middleware
        router.replace(redirectUrl)
      }, 100)
      
      return () => clearTimeout(timer)
    }
  }, [isAuthenticated, isLoading, searchParams, locale, hasRedirected, router])

  const handleSignIn = async () => {
    setIsSigningIn(true)
    try {
      const redirectUrl = searchParams.get('redirect_url') || `/${locale}/dashboard`
      await signIn('google', {
        callbackUrl: redirectUrl,
        redirect: true,
      })
      // When redirect: true, signIn doesn't return a value
      // The redirect happens automatically
    } catch (error) {
      console.error('Sign in error:', error)
      setIsSigningIn(false)
    }
  }

  if (isLoading) {
    return (
      <Center h="100vh" bg="#f7f7ed">
        <Loader size="lg" color="brand" />
      </Center>
    )
  }

  if (isAuthenticated) {
    // Show loading while redirecting
    return (
      <Center h="100vh" bg="#f7f7ed">
        <Loader size="lg" color="brand" />
      </Center>
    )
  }
  
  return (
    <Box
      style={{
        minHeight: '100vh',
        backgroundColor: '#f7f7ed',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}
    >
      <Container size="sm" w="100%" style={{ maxWidth: '450px' }}>
        <Stack gap="xl" align="center">
          <Logo />
          
          <Paper
            shadow="xl"
            p="xl"
            radius="md"
            withBorder
            style={{
              width: '100%',
              backgroundColor: '#ffffff'
            }}
          >
            <Stack gap="md">
              <div>
                <Title order={2} ta="center" c="brand" mb="xs" fw={600} style={{ fontFamily: 'inherit' }}>
                  {t('signIn') || 'התחבר'}
                </Title>
                <Text c="dimmed" size="sm" ta="center" style={{ fontFamily: 'inherit' }}>
                  {t('welcomeBack') || 'ברוך שובך! התחבר כדי להמשיך'}
                </Text>
              </div>

              <Button
                onClick={handleSignIn}
                leftSection={<IconBrandGoogle size={20} />}
                size="lg"
                fullWidth
                color="brand"
                variant="filled"
                loading={isSigningIn}
                styles={{
                  root: {
                    backgroundColor: '#df2538',
                    '&:hover': {
                      backgroundColor: '#c51f2f',
                    },
                  },
                }}
              >
                {t('signInWithGoogle') || 'התחבר באמצעות Google'}
              </Button>
            </Stack>
          </Paper>

          <Text size="sm" c="dimmed" ta="center">
            {t('dontHaveAccount') || 'אין לך חשבון?'}{' '}
            <a 
              href={`/${locale}/sign-up`}
              style={{ 
                color: '#df2538', 
                textDecoration: 'none', 
                fontWeight: 500,
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#c51f2f'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#df2538'}
            >
              {t('signUp') || 'הירשם'}
            </a>
          </Text>
        </Stack>
      </Container>
    </Box>
  )
}
