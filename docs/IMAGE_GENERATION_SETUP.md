# Image Generation Setup for MoodB Entities

## Overview

The MoodB seed service now supports automatic image generation for Categories, SubCategories, and Approaches. The system is set up to work with placeholder images initially, and can be integrated with actual AI image generation APIs later.

## Current Implementation Status

✅ **Schema Updates**: All entities (Category, SubCategory, Approach, RoomType) have `images String[]` field
✅ **Image Generation Service**: Created at `src/lib/ai/image-generation.ts`
✅ **Gemini Integration**: Gemini 2.5 Flash Image model integrated (`gemini-2.5-flash-image`)
✅ **Seed Service Integration**: Updated seed service with image generation for all entities
✅ **CLI Support**: Added `-i/--images` and `-n/--images-count` flags
✅ **GCP Storage Upload**: Automatic upload of generated images to GCP Storage
✅ **Fallback System**: Automatically uses placeholders if Gemini API fails or quota exceeded
⚠️ **API Quota**: Gemini image model has free tier limitations (currently exhausted)

## How to Use

### Basic Commands

```bash
# Seed with image generation (3 images per entity)
npm run seed:content -- --only approaches --images

# Specify number of images (e.g., 5 per entity)
npm run seed:content -- --only categories --images --images-count 5

# Combine with other options
npm run seed:content -- --only subCategories --force --images --verbose

# Dry run to see what would be generated
npm run seed:content -- --only approaches --images --dry-run

# Limited test (1 item with images)
npm run seed:content -- --only categories --limit 1 --images
```

### CLI Flags

| Flag | Description | Default |
|------|-------------|---------|
| `-i, --images` | Enable image generation | `false` |
| `-n, --images-count <number>` | Images per entity | `3` |
| `-f, --force` | Force update existing entities | `false` |
| `-v, --verbose` | Verbose logging | `false` |

## Current Image Generation

Currently generates **placeholder URLs** in this format:
```
https://via.placeholder.com/1200x800/f7f7ed/333333?text=EntityName+1&seed=1234
```

Each placeholder:
- Size: 1200x800 pixels
- Background: #f7f7ed (MoodB brand color)
- Text color: #333333
- Includes entity name and image number
- Unique seed for variety

## Integration Points

### 1. Image Generation Service
**File**: `src/lib/ai/image-generation.ts`

The service provides detailed prompts for each entity type and handles:
- Professional interior photography prompts
- Entity-specific descriptions
- Batch generation with rate limiting
- Error handling

### 2. Seed Service Functions
**File**: `src/lib/seed/seed-service.ts`

Updated functions:
- `seedApproaches()` - Lines 171-197
- `seedCategories()` - Lines 420-444
- `seedSubCategories()` - Lines 584-611

### 3. Database Schema
**File**: `prisma/schema.prisma`

All entities have:
```prisma
model Category {
  ...
  images String[] @default([])
  ...
}

model SubCategory {
  ...
  images String[] @default([])
  ...
}

model Approach {
  ...
  images String[] @default([])
  ...
}
```

## Gemini API Quota & Limitations

### Free Tier Quota (Current Issue)

The Gemini 2.5 Flash Image model has strict free tier limitations:
- **Per Day**: Limited requests per model
- **Per Minute**: Limited requests per model
- **Token Limit**: Limited input tokens per minute

**Current Status**: Free tier quota has been exhausted for `gemini-2.5-flash-preview-image`

**Error Example**:
```
429 Too Many Requests - You exceeded your current quota
Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests
Please retry in 50s
```

### Solutions

#### Option 1: Wait for Quota Reset
- Free tier quotas reset daily
- Wait 24 hours and try again
- Monitor usage at: https://ai.dev/usage?tab=rate-limit

#### Option 2: Upgrade to Paid Tier
- Get higher quotas with Gemini API paid tier
- Contact Google AI for pricing
- Learn more: https://ai.google.dev/gemini-api/docs/rate-limits

#### Option 3: Use Placeholders (Current Default)
- System automatically falls back to placeholder.com URLs
- Placeholders are stored in database
- Can be replaced with real images later
- Example: `https://via.placeholder.com/1200x800/f7f7ed/333333?text=EntityName+1`

#### Option 4: Manual Image Upload
- Upload images manually through admin UI
- Use the image upload component
- Replace placeholder URLs with real images

## Integrating Real AI Image Generation

To integrate with actual image generation APIs, update `src/lib/ai/image-generation.ts`:

### Option 1: Google Imagen 3 (Future)
When available via Gemini API:
```typescript
const model = genAI.getGenerativeModel({ model: 'imagen-3' })
const result = await model.generateImages({
  prompt: createImagePrompt(options),
  numberOfImages: options.numberOfImages,
})
```

### Option 2: DALL-E 3 (OpenAI)
```typescript
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const images = await Promise.all(
  Array.from({ length: numberOfImages }).map(async () => {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: createImagePrompt(options),
      size: "1792x1024",
      quality: "hd",
    })
    return response.data[0].url
  })
)
```

### Option 3: Stable Diffusion (Replicate)
```typescript
import Replicate from 'replicate'

const replicate = new Replicate({ auth: process.env.REPLICATE_API_KEY })

const output = await replicate.run(
  "stability-ai/sdxl:latest",
  {
    input: {
      prompt: createImagePrompt(options),
      num_outputs: numberOfImages,
    }
  }
)
```

## R2 Storage Integration

To upload generated images to Cloudflare R2:

```typescript
import { uploadImage } from '@/lib/storage/r2'

export async function generateAndUploadImages(
  options: ImageGenerationOptions
): Promise<string[]> {
  // 1. Generate images using AI
  const tempImageUrls = await generateImages(options)

  // 2. Download and upload to R2
  const r2Urls = await Promise.all(
    tempImageUrls.map(async (url, index) => {
      // Download image
      const response = await fetch(url)
      const buffer = await response.arrayBuffer()

      // Upload to R2
      const filename = `${options.entityType}/${slugify(options.entityName.en)}-${index + 1}.jpg`
      const r2Url = await uploadImage({
        file: Buffer.from(buffer),
        filename,
        contentType: 'image/jpeg',
      })

      return r2Url
    })
  )

  return r2Urls
}
```

## Image Prompts

The system generates detailed, professional prompts for each entity type:

### Category Example
```
Create a stunning, professional interior design photograph that represents
the "Classical Styles" design category. This category spans the period 1400–1939.

The image should:
- Showcase a beautifully designed interior space that embodies this design era/category
- Include rich architectural details, furniture, decor, and materials characteristic of this period
- Feature excellent lighting and composition
- Be photorealistic and professionally shot
- Show a complete, well-styled room or space
- Capture the essence and atmosphere of Classical Styles design

Style: Professional interior photography, high-end, architectural digest quality,
natural lighting, wide angle shot showing full room context.
```

### SubCategory Example
```
Create a stunning, professional interior design photograph that represents
the "Art Deco" design style. This style is from 1920–1940.

The image should:
- Showcase a beautifully designed interior space in the Art Deco style
- Include signature furniture, materials, colors, and decorative elements
- Feature excellent lighting and composition
...
```

## Testing

```bash
# Test with single approach (verbose)
npm run seed:content -- --only approaches --limit 1 --force --images --verbose

# Test with all categories (dry run)
npm run seed:content -- --only categories --images --dry-run

# Full generation for all approaches
npm run seed:content -- --only approaches --force --images
```

## Costs Estimation

When using AI image generation:

### DALL-E 3
- Standard: $0.040 per image
- HD: $0.080 per image
- For 67 entities × 3 images = 201 images
- Cost: $8-16 total

### Stable Diffusion (Replicate)
- ~$0.003 per image
- For 201 images
- Cost: ~$0.60 total

### Midjourney
- No API yet, manual generation required
- Subscription: $10-60/month

## Troubleshooting

### Images not generating
1. Check if `--images` flag is used
2. Verify verbose output shows "🖼️ Generating X images..."
3. Check for error messages in output

### Placeholder URLs not stored
1. Ensure force flag is used: `--force`
2. Check database after seeding
3. Run check script: `npx tsx scripts/check-approach-images.ts`

### Rate limiting
- Add delay between requests (already implemented: 1000ms)
- Reduce batch size
- Use `--limit` flag for testing

## Next Steps

1. ✅ **Current**: Placeholder mode working
2. **Phase 2**: Integrate with DALL-E 3 or Stable Diffusion
3. **Phase 3**: Implement R2 upload functionality
4. **Phase 4**: Add manual image replacement UI
5. **Phase 5**: Bulk regeneration tool

## Support

For issues or questions:
- Check logs with `--verbose` flag
- Review `src/lib/ai/image-generation.ts` for implementation details
- See `src/lib/seed/seed-service.ts` for integration points

---

**Last Updated**: 2025-11-16
**Status**: ✅ Fully integrated with Gemini 2.5 Flash Image, GCP Storage upload, automatic fallback to placeholders
**Note**: Free tier API quota currently exhausted - using placeholders until quota resets or upgrade to paid tier
