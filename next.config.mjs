import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

/** @type {import('next').NextConfig} */
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_BUILD === '1'

// Force disable turbopack
process.env.TURBOPACK = '0'
process.env.NEXT_PRIVATE_SKIP_TURBOPACK = '1'

const nextConfig = {
  reactStrictMode: true,

  // Disables uploading sourcemaps in prod builds
  productionBrowserSourceMaps: false,

  // Skip type checking during build (run in CI instead)
  typescript: {
    ignoreBuildErrors: true,
  },

  // Skip ESLint during build (run in CI instead)
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Images
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.r2.cloudflarestorage.com',
      },
      {
        protocol: 'https',
        hostname: 'assets.moodb.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  
  // Stable build id for multi-region deploys on Vercel
  generateBuildId: async () => {
    return process.env.VERCEL_GIT_COMMIT_SHA || String(Date.now())
  },
  
  // Headers for security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ]
  },
  
  // Environment variables validation
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_DEFAULT_LOCALE: process.env.NEXT_PUBLIC_DEFAULT_LOCALE || 'he',
  },
}

export default withNextIntl(nextConfig)

