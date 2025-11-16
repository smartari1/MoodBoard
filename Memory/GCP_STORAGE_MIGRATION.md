# GCP Storage Migration Guide

**Migration Date:** November 16, 2025
**Status:** ✅ Complete

## Overview

MoodB has been migrated from Cloudflare R2 to Google Cloud Storage (GCS) for all image and asset storage. This document outlines what was changed, how to configure it, and how to use it.

## What Changed

### 1. Infrastructure
- **Created GCP Storage Bucket:** `gs://moodb-assets/`
  - Location: `US` (multi-region)
  - Storage class: `STANDARD`
  - Access: Public read (uniform bucket-level access)
  - CORS: Configured for web uploads

### 2. Code Changes

#### New Files
- `src/lib/storage/gcp-storage.ts` - New GCP Storage service (replaces r2.ts)
  - `uploadImageToGCP()` - Upload images to GCS
  - `deleteImageFromGCP()` - Delete images from GCS
  - `imageExistsInGCP()` - Check if image exists
  - `generateStorageKey()` - Generate storage path
  - `getGCPPublicUrl()` - Get public URL for images
  - `extractKeyFromUrl()` - Extract key from URL

#### Updated Files
- `src/app/api/upload/image/route.ts` - Updated to use GCP Storage
- `src/hooks/useImageUpload.ts` - Updated import to gcp-storage
- `src/components/ui/ImageUpload.tsx` - Updated import to gcp-storage
- `src/lib/validations/upload.ts` - Updated comments to mention GCS
- `env.example` - Updated with GCP environment variables

#### Removed Files
- `src/lib/storage/r2.ts` - Deleted (replaced by gcp-storage.ts)

#### Dependencies
- **Added:** `@google-cloud/storage` (^7.15.0)
- **Removed:** `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`

### 3. Storage Structure

The folder structure remains the same as it was with R2:

```
moodb-assets/
├── categories/
│   └── {categoryId}/
│       └── {timestamp}-{uuid}-{filename}
├── sub-categories/
│   └── {subCategoryId}/
│       └── {timestamp}-{uuid}-{filename}
├── styles/
│   └── {styleId}/
│       ├── {timestamp}-{uuid}-{filename}           # Main style images
│       └── rooms/
│           └── {roomType}/
│               └── {timestamp}-{uuid}-{filename}   # Room profile images
├── approaches/
│   └── {approachId}/
│       └── {timestamp}-{uuid}-{filename}
├── projects/
│   └── {projectId}/
│       └── rooms/
│           └── {roomId}/
│               └── {timestamp}-{uuid}-{filename}
└── materials/
    └── {organizationId}/
        └── {materialId}/
            └── {timestamp}-{uuid}-{filename}
```

## Environment Configuration

### Required Environment Variables

Add these to your `.env.local` file (for local development) and Vercel environment variables (for production):

```bash
# GCP Project ID
GCP_PROJECT_ID="event-canvas-prod"

# GCP Storage Bucket Name
GCP_BUCKET_NAME="moodb-assets"

# GCP Public URL for assets
GCP_PUBLIC_URL="https://storage.googleapis.com/moodb-assets"

# GCP Service Account Key (JSON string)
# For production: Paste the entire JSON key as a minified string
GCP_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"event-canvas-prod",...}'
```

### Local Development Setup

For local development, you have two options:

#### Option 1: Use GOOGLE_APPLICATION_CREDENTIALS (Recommended)

1. Download your service account key JSON file from GCP Console
2. Save it securely (e.g., `~/.gcp/moodb-service-account.json`)
3. Set the environment variable:
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"
   ```

4. Add to your `.env.local`:
   ```bash
   GCP_PROJECT_ID="event-canvas-prod"
   GCP_BUCKET_NAME="moodb-assets"
   GCP_PUBLIC_URL="https://storage.googleapis.com/moodb-assets"
   ```

#### Option 2: Use GCP_SERVICE_ACCOUNT_KEY

1. Download your service account key JSON file
2. Minify it (remove newlines and extra spaces)
3. Add to `.env.local`:
   ```bash
   GCP_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"event-canvas-prod",...}'
   ```

### Production Setup (Vercel)

1. Go to Vercel Project Settings → Environment Variables
2. Add the following variables:
   - `GCP_PROJECT_ID` = `event-canvas-prod`
   - `GCP_BUCKET_NAME` = `moodb-assets`
   - `GCP_PUBLIC_URL` = `https://storage.googleapis.com/moodb-assets`
   - `GCP_SERVICE_ACCOUNT_KEY` = Paste the entire JSON key (minified, no newlines)

3. Redeploy your application

## Service Account Setup

### Create Service Account (If Not Already Created)

1. Go to [GCP Console → IAM & Admin → Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts)
2. Create a new service account:
   - Name: `moodb-storage`
   - Description: `Service account for MoodB storage operations`
3. Grant permissions:
   - **Storage Object Admin** (`roles/storage.objectAdmin`) on `moodb-assets` bucket
4. Create and download JSON key
5. Store securely and add to environment variables

### Permissions Required

The service account needs these permissions:
- `storage.objects.create` - Upload files
- `storage.objects.delete` - Delete files
- `storage.objects.get` - Read file metadata
- `storage.objects.list` - List files (if needed)

## Public Access Configuration

The bucket is configured for public read access, which means:
- All uploaded images are publicly readable
- No authentication required to view images
- URLs are in format: `https://storage.googleapis.com/moodb-assets/{path}`

To verify public access:
```bash
gsutil iam get gs://moodb-assets
```

You should see `allUsers` with `roles/storage.objectViewer`.

## Image Upload Flow

### Edit Mode (Entity Exists)
1. User selects image(s) in ImageUpload component
2. `entityId` is provided to ImageUpload
3. Image is immediately uploaded to GCS via `/api/upload/image`
4. GCS returns public URL: `https://storage.googleapis.com/moodb-assets/{path}`
5. URL is stored in form state
6. On form submit, URL is sent to backend and saved to database

### Create Mode (Entity Doesn't Exist)
1. User selects image(s) in ImageUpload component
2. `entityId` is empty
3. Image is stored as blob URL locally (preview only)
4. Files tracked in `pendingFiles` state
5. On form submit:
   - Entity is created first (gets an ID)
   - Blob URLs are filtered out
   - Pending files are uploaded with the new entity ID
   - Database is updated with final URLs

## Migration Checklist

- [x] Create GCP Storage bucket
- [x] Configure bucket permissions (public read)
- [x] Configure CORS settings
- [x] Install `@google-cloud/storage` package
- [x] Create `gcp-storage.ts` service
- [x] Update API routes to use GCP Storage
- [x] Update hooks and components
- [x] Remove R2 code and dependencies
- [x] Update environment variable examples
- [x] Update Memory files (technical-plan.md, project.md)
- [ ] Set up GCP service account (if not done)
- [ ] Configure production environment variables in Vercel
- [ ] Test image upload in development
- [ ] Test image upload in production
- [ ] Migrate existing R2 images to GCS (if needed)

## Testing

### Local Testing

1. Ensure environment variables are set
2. Start development server: `npm run dev`
3. Navigate to admin area (e.g., `/admin/styles/create`)
4. Upload an image
5. Verify:
   - Image uploads successfully
   - URL starts with `https://storage.googleapis.com/moodb-assets/`
   - Image is publicly accessible
   - Image appears in preview

### Production Testing

1. Deploy to Vercel
2. Verify environment variables are set
3. Test image upload in production
4. Check GCP Console → Storage Browser to see uploaded files

## Monitoring

Monitor your GCP Storage usage:
1. Go to [GCP Console → Cloud Storage](https://console.cloud.google.com/storage)
2. Select `moodb-assets` bucket
3. Check storage metrics, bandwidth, and costs

## Cost Optimization

GCP Storage pricing (as of 2025):
- **Storage:** ~$0.020 per GB/month (Standard, Multi-region)
- **Bandwidth:** ~$0.12 per GB (North America)
- **Operations:** Class A (writes) ~$0.05 per 10,000 ops, Class B (reads) ~$0.004 per 10,000 ops

Tips to optimize costs:
1. Compress images before upload (client-side)
2. Use image optimization (WebP, AVIF formats)
3. Implement lifecycle policies to move old images to Nearline/Coldline storage
4. Enable CDN caching to reduce egress bandwidth
5. Monitor usage regularly

## Rollback Plan

If you need to rollback to R2:

1. Restore `src/lib/storage/r2.ts` from git history
2. Reinstall AWS SDK: `npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner`
3. Revert changes to API routes, hooks, and components
4. Update environment variables back to R2 credentials
5. Redeploy

## Troubleshooting

### Issue: "Failed to upload image"
- **Check:** Environment variables are set correctly
- **Check:** Service account has proper permissions
- **Check:** Bucket exists and is accessible
- **Check:** Network connectivity to GCP

### Issue: "Image URL returns 404"
- **Check:** Bucket has public read access configured
- **Check:** File was uploaded successfully (check GCP Console)
- **Check:** URL format is correct: `https://storage.googleapis.com/moodb-assets/{path}`

### Issue: "Permission denied"
- **Check:** Service account key is valid and not expired
- **Check:** Service account has `Storage Object Admin` role on bucket
- **Check:** `GCP_SERVICE_ACCOUNT_KEY` is properly formatted JSON

## Additional Resources

- [GCP Cloud Storage Documentation](https://cloud.google.com/storage/docs)
- [Node.js Client Library](https://googleapis.dev/nodejs/storage/latest/)
- [GCP Pricing Calculator](https://cloud.google.com/products/calculator)
- [Best Practices for GCS](https://cloud.google.com/storage/docs/best-practices)

## Questions?

For any questions about this migration, refer to:
- This document
- `src/lib/storage/gcp-storage.ts` (implementation)
- `Memory/technical-plan.md` (architecture)
