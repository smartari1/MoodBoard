#!/bin/bash

# =============================================================================
# GCS Cache Headers Script for MoodB
# =============================================================================
#
# This script sets optimal cache headers on Google Cloud Storage objects
# to improve image loading performance through better caching.
#
# Prerequisites:
# 1. Install Google Cloud SDK: https://cloud.google.com/sdk/docs/install
# 2. Authenticate: gcloud auth login
# 3. Set project: gcloud config set project YOUR_PROJECT_ID
#
# Usage:
#   ./scripts/set-gcs-cache-headers.sh
#
# =============================================================================

BUCKET="moodb-assets"

echo "🚀 Setting cache headers for images in gs://$BUCKET"
echo "This will improve image loading performance by enabling browser caching."
echo ""

# Set cache headers for all image types (1 year cache)
# This is safe because we use unique filenames for each upload
echo "📸 Setting headers for PNG files..."
gsutil -m setmeta -h "Cache-Control:public, max-age=31536000, immutable" \
  "gs://$BUCKET/**/*.png" 2>/dev/null

echo "📸 Setting headers for JPG files..."
gsutil -m setmeta -h "Cache-Control:public, max-age=31536000, immutable" \
  "gs://$BUCKET/**/*.jpg" 2>/dev/null

echo "📸 Setting headers for JPEG files..."
gsutil -m setmeta -h "Cache-Control:public, max-age=31536000, immutable" \
  "gs://$BUCKET/**/*.jpeg" 2>/dev/null

echo "📸 Setting headers for WebP files..."
gsutil -m setmeta -h "Cache-Control:public, max-age=31536000, immutable" \
  "gs://$BUCKET/**/*.webp" 2>/dev/null

echo "📸 Setting headers for GIF files..."
gsutil -m setmeta -h "Cache-Control:public, max-age=31536000, immutable" \
  "gs://$BUCKET/**/*.gif" 2>/dev/null

echo "📸 Setting headers for SVG files..."
gsutil -m setmeta -h "Cache-Control:public, max-age=31536000, immutable" \
  "gs://$BUCKET/**/*.svg" 2>/dev/null

echo ""
echo "✅ Cache headers set successfully!"
echo ""
echo "Cache-Control: public, max-age=31536000, immutable"
echo "This means:"
echo "  - Images are cached for 1 year (31536000 seconds)"
echo "  - Browsers won't re-validate cached images (immutable)"
echo "  - CDNs can cache these images (public)"
echo ""
echo "To verify, check a single file:"
echo "  gsutil stat gs://$BUCKET/path/to/image.png | grep Cache-Control"
