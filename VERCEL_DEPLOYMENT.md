# Vercel Deployment Guide for MoodB

This guide covers deploying MoodB to Vercel with all necessary configurations and considerations.

## Prerequisites

- Vercel account (free tier is sufficient for testing)
- MongoDB Atlas cluster (free tier available)
- Cloudflare R2 bucket (or AWS S3) for file storage
- Environment variables configured

## Quick Start

1. **Connect Repository**
   ```bash
   # Install Vercel CLI (optional)
   npm i -g vercel
   
   # Login to Vercel
   vercel login
   
   # Link project
   vercel link
   ```

2. **Set Environment Variables**
   See [Environment Variables](#environment-variables) section below

3. **Deploy**
   ```bash
   vercel --prod
   ```

   Or push to your main branch if auto-deployment is enabled.

## Environment Variables

Configure these in Vercel Dashboard → Project Settings → Environment Variables:

### Required Variables

```bash
# Database
DATABASE_URL="mongodb+srv://username:password@cluster.mongodb.net/moodb?retryWrites=true&w=majority&maxPoolSize=10"

# Authentication
NEXTAUTH_URL="https://your-domain.vercel.app"
NEXTAUTH_SECRET="your-secret-key-here-generate-with-openssl-rand-base64-32"

# Application
NEXT_PUBLIC_APP_URL="https://your-domain.vercel.app"
NEXT_PUBLIC_DEFAULT_LOCALE="he"
NODE_ENV="production"
```

### Optional Variables

```bash
# Google OAuth (if using)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Storage (Cloudflare R2)
R2_ACCOUNT_ID="your_account_id"
R2_ACCESS_KEY_ID="your_access_key"
R2_SECRET_ACCESS_KEY="your_secret_key"
R2_BUCKET_NAME="moodb-assets"
R2_PUBLIC_URL="https://assets.moodb.com"

# Monitoring (Sentry)
NEXT_PUBLIC_SENTRY_DSN="your_sentry_dsn"
SENTRY_AUTH_TOKEN="your_sentry_token"
SENTRY_ORG="your_org"
SENTRY_PROJECT="moodb"

# Analytics (PostHog)
NEXT_PUBLIC_POSTHOG_KEY="your_posthog_key"
NEXT_PUBLIC_POSTHOG_HOST="https://app.posthog.com"
```

### MongoDB Connection String Notes

**Important**: For Vercel serverless functions, use a connection string with connection pooling:

```bash
# Good - includes maxPoolSize
DATABASE_URL="mongodb+srv://user:pass@cluster.mongodb.net/moodb?retryWrites=true&w=majority&maxPoolSize=10"

# Also ensure MongoDB Atlas allows connections from Vercel IPs (0.0.0.0/0 for production)
```

## Build Configuration

The project is configured with:

- **Build Command**: `pnpm build`
- **Install Command**: `pnpm install`
- **Output Directory**: `.next` (default for Next.js)

### Prisma Setup

Prisma client is automatically generated during:
1. `postinstall` script (runs after `pnpm install`)

**Important**: Prisma generation happens in `postinstall`, NOT in the build script. This ensures:
- Prisma client is cached properly by Vercel
- Build process is faster and more reliable
- No duplicate generation attempts

### Build Optimizations

The project includes several build optimizations:

1. **Memory Allocation**: Set via `NODE_OPTIONS` in `vercel.json` build environment (6144 MB)
2. **Prisma Caching**: Vercel automatically caches `node_modules/.prisma` between builds
3. **TypeScript**: Uses `skipLibCheck: true` for faster compilation
4. **Bundle Optimization**: Source maps disabled in production, optimized imports for Mantine

### Environment Variables for Build

These are set in `vercel.json`:
- `NODE_OPTIONS`: `--max-old-space-size=6144` (increases memory for build)
- `NEXT_TELEMETRY_DISABLED`: `1` (disables Next.js telemetry)

**Note**: You can also set `NODE_OPTIONS` in Vercel Dashboard → Settings → Environment Variables for all environments if needed.

## Serverless Function Configuration

### Function Timeouts

API routes have a maximum duration of 30 seconds (configured in `vercel.json`):

```json
{
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 30
    }
  }
}
```

For longer-running operations, consider:
- Breaking into smaller chunks
- Using background jobs (Vercel Cron Jobs)
- Moving to Edge Functions where appropriate

### MongoDB Connection Pooling

Prisma is configured to work with serverless:
- Each function invocation gets a fresh connection if needed
- Connections are pooled and reused when possible
- Automatic disconnection on function end

**Note**: Ensure your MongoDB Atlas cluster has sufficient connection limits:
- Free tier: 500 connections
- M10+: 1000+ connections

## Known Limitations & Considerations

### Socket.io (Real-time Features)

Socket.io requires persistent HTTP connections, which are challenging in serverless environments. The current implementation:

- Works for basic use cases
- May need alternative solutions for production:
  - **Option 1**: Use Vercel Pro with persistent connections
  - **Option 2**: Use external WebSocket service (Pusher, Ably, etc.)
  - **Option 3**: Use Server-Sent Events (SSE) or polling

**Current Status**: Socket.io route exists but may not work optimally on Vercel's serverless platform.

### File Uploads

File uploads are configured for Cloudflare R2. Ensure:
- R2 bucket has CORS configured
- Public URL is accessible
- Upload route handles large files appropriately

### Image Optimization

Next.js Image component is configured for:
- Cloudflare R2 domains (`**.r2.cloudflarestorage.com`)
- Custom CDN (`assets.moodb.com`)

Ensure these domains are whitelisted in `next.config.mjs`.

## Deployment Checklist

Before deploying to production:

- [ ] All environment variables set in Vercel
- [ ] MongoDB Atlas cluster allows connections from Vercel (0.0.0.0/0)
- [ ] MongoDB connection string includes `maxPoolSize=10`
- [ ] `NEXTAUTH_URL` matches your Vercel domain
- [ ] `NEXT_PUBLIC_APP_URL` matches your Vercel domain
- [ ] Google OAuth redirect URIs updated (if using OAuth)
- [ ] Cloudflare R2 CORS configured (if using R2)
- [ ] Sentry project created and DSN added (if using Sentry)
- [ ] Domain configured in Vercel (if using custom domain)
- [ ] SSL certificate enabled (automatic with Vercel)

## Monitoring & Debugging

### Vercel Logs

View logs in Vercel Dashboard:
```bash
# Or via CLI
vercel logs [deployment-url]
```

### Common Issues

1. **Infinite Build Times / Build Crashes**
   - **Root Cause**: Usually memory exhaustion or Prisma generation issues
   - **Solution**: 
     - Verify `NODE_OPTIONS` is set in `vercel.json` build.env (should be `--max-old-space-size=6144`)
     - Clear build cache: Deploy → Settings → Clear build cache
     - Check build logs for memory errors (OOM - Out of Memory)
     - Ensure Prisma generates only in `postinstall`, not in build script
   - **If persists**: Consider upgrading to Vercel Pro plan for more resources

2. **Prisma Client Not Found**
   - Ensure `postinstall` script runs: `"postinstall": "prisma generate"`
   - Check build logs for Prisma generation
   - Verify Prisma is in `dependencies`, not `devDependencies`
   - Clear build cache and redeploy

3. **Database Connection Errors**
   - Verify MongoDB Atlas IP whitelist includes Vercel IPs (0.0.0.0/0 for production)
   - Check connection string format
   - Ensure `maxPoolSize=10` is in connection string
   - Verify database is not paused or sleeping

4. **Environment Variables Not Loading**
   - Verify variables are set for correct environment (Production/Preview/Development)
   - Restart deployment after adding variables
   - Check variable names match exactly (case-sensitive)
   - Ensure sensitive variables are not in `vercel.json` (use Dashboard instead)

5. **Build Failures**
   - Check build logs in Vercel Dashboard for specific errors
   - Ensure all dependencies are in `dependencies` (not `devDependencies`)
   - Verify Node.js version compatibility (should be auto-detected)
   - Check for TypeScript errors: `tsc --noEmit` locally
   - Verify no large files in `node_modules` (check `.gitignore`)

6. **Slow Build Times**
   - First build is always slower (caching setup)
   - Subsequent builds should be faster (cached `node_modules` and `.prisma`)
   - If consistently slow:
     - Check for unnecessary dependencies
     - Verify `skipLibCheck: true` in `tsconfig.json`
     - Consider using Vercel Pro for faster builds

## Performance Optimization

### Recommended Vercel Plan

- **Free Tier**: Good for development/testing
- **Pro Tier**: Recommended for production (better performance, longer timeouts)

### Caching Strategy

Next.js automatically handles:
- Static page caching
- API route caching (based on headers)
- Image optimization caching

### Database Query Optimization

- Use Prisma connection pooling
- Implement query result caching where appropriate
- Use database indexes (already configured in schema)

## Security Considerations

### Environment Variables

- Never commit `.env.local` or `.env` files
- Use Vercel's environment variable encryption
- Rotate secrets regularly

### Headers

Security headers are configured in `next.config.mjs`:
- HSTS
- X-Frame-Options
- X-Content-Type-Options
- CSP (Content Security Policy)

### Authentication

- NextAuth.js is configured with secure defaults
- Session tokens are HTTP-only
- CSRF protection enabled

## Custom Domain Setup

1. Add domain in Vercel Dashboard → Domains
2. Configure DNS records as instructed
3. SSL certificate is automatically provisioned
4. Update `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` to match custom domain

## Continuous Deployment

Vercel automatically deploys:
- **Production**: Commits to `main` branch
- **Preview**: Pull requests and other branches

Configure in Vercel Dashboard → Git if needed.

## Rollback

To rollback to a previous deployment:

1. Go to Vercel Dashboard → Deployments
2. Find the deployment to rollback to
3. Click "..." → "Promote to Production"

## Support

For issues:
1. Check Vercel logs
2. Review MongoDB Atlas logs
3. Check Next.js build output
4. Review environment variables

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Prisma Serverless Guide](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-vercel)
- [MongoDB Atlas Connection Strings](https://www.mongodb.com/docs/atlas/connection-string/)

