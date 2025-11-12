import { prisma } from "@/lib/db/prisma"
import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"

export const authOptions: NextAuthOptions = {
  // No adapter - using JWT sessions only
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      // On sign in (when user object is available)
      if (user) {
        try {
          // Get user from database with organization
          const dbUser = await prisma.user.findUnique({
            where: { email: user.email! },
            include: {
              organization: true,
            },
          })

          if (dbUser) {
            token.id = dbUser.id
            token.role = dbUser.role
            token.organizationId = dbUser.organizationId
            token.organization = dbUser.organization
              ? {
                  id: dbUser.organization.id,
                  name: dbUser.organization.name,
                  slug: dbUser.organization.slug,
                }
              : null
          }
        } catch (error) {
          console.error('Error in jwt callback:', error)
        }
      }
      return token
    },
    async session({ session, token }) {
      // Add custom fields from token to session
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.organizationId = token.organizationId as string | null
        session.user.organization = token.organization as any
      }
      return session
    },
    async signIn({ user, account, profile }) {
      if (account?.provider === "google" && user.email) {
        try {
          // Check if user exists
          let existingUser = await prisma.user.findUnique({
            where: { email: user.email },
            include: { organization: true },
          })

          if (!existingUser) {
            // Create organization first
            const orgSlug = user.email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "-")

            const organization = await prisma.organization.create({
              data: {
                name: user.name || "My Studio",
                slug: orgSlug,
                settings: {
                  locale: "he",
                  currency: "ILS",
                  units: "metric",
                  brand: {
                    primaryColor: "#df2538",
                    backgroundColor: "#f7f7ed",
                  },
                },
              },
            })

            // Create user with organization
            existingUser = await prisma.user.create({
              data: {
                email: user.email,
                name: user.name,
                image: user.image,
                emailVerified: new Date(),
                organizationId: organization.id,
                role: "designer_owner",
                profile: {
                  firstName: user.name?.split(" ")[0] || "",
                  lastName: user.name?.split(" ").slice(1).join(" ") || "",
                  email: user.email,
                  avatar: user.image || undefined,
                },
                permissions: ["*"],
                lastActive: new Date(),
              },
              include: { organization: true },
            })

            // Create account record
            await prisma.account.create({
              data: {
                userId: existingUser.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                access_token: account.access_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
              },
            })
          } else {
            // Update last active time
            await prisma.user.update({
              where: { email: user.email },
              data: { lastActive: new Date() },
            })
          }

          return true
        } catch (error) {
          console.error("Error in signIn callback:", error)
          return false
        }
      }
      return true
    },
    async redirect({ url, baseUrl }) {
      // Handle redirect after sign in
      // Extract locale from URL if present
      const urlPath = url.startsWith('/') ? url : new URL(url).pathname
      const pathParts = urlPath.split('/').filter(Boolean)
      const locale = pathParts[0] === 'he' || pathParts[0] === 'en' ? pathParts[0] : 'he'
      
      // If url is relative, make it absolute
      if (url.startsWith("/")) {
        // Check if it already has locale prefix
        if (url.startsWith('/he/') || url.startsWith('/en/')) {
          return `${baseUrl}${url}`
        }
        // Otherwise add locale prefix
        return `${baseUrl}/${locale}${url}`
      }
      
      // If url is on same origin, allow it
      try {
        const urlObj = new URL(url)
        if (urlObj.origin === baseUrl) {
          return url
        }
      } catch {
        // Invalid URL, use default
      }
      
      // Otherwise redirect to dashboard with locale
      return `${baseUrl}/${locale}/dashboard`
    },
  },
  pages: {
    signIn: "/he/sign-in",
    error: "/he/error",
  },
  session: {
    strategy: "jwt",  // Changed to JWT for better middleware compatibility
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' 
        ? '__Secure-next-auth.session-token'
        : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        domain: process.env.NODE_ENV === 'production' 
          ? '.moodboard.co.il'  // Share cookie across subdomains
          : undefined,
      },
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  // Only enable debug logging when explicitly requested via AUTH_DEBUG env var
  // This prevents sensitive data (client secrets, tokens) from being logged
  debug: process.env.AUTH_DEBUG === "true",
}
