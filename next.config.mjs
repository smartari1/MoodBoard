import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin()

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Performance optimizations
  compress: true,
  
  // Disable React Compiler for faster builds
  reactCompiler: false,
  
  // Experimental features
  experimental: {
    optimizePackageImports: ['@mantine/core', '@mantine/hooks', '@tabler/icons-react'],
    optimizeCss: true,
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
  
  // Headers for security
  async headers() {
    return [
      {
        source: '/:path*',
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
  
  // Output optimization  
  // Note: standalone mode commented out as it may cause issues with Vercel's native integration
  // output: 'standalone',
  
  // Reduce bundle analysis overhead
  productionBrowserSourceMaps: false,
  
  // Optimize page generation
  generateBuildId: async () => {
    return process.env.VERCEL_GIT_COMMIT_SHA || 'development'
  },
  
  // TypeScript optimization
  typescript: {
    // Don't run type checking during build (Vercel runs it separately)
    ignoreBuildErrors: false,
  },
  
}

export default withNextIntl(nextConfig)

