# Content Seeding Guide

## Overview

The MoodB Content Seeding System automatically generates comprehensive, detailed content for all style engine entities using Google's Gemini AI. This includes:

- **Categories** (7 major design eras)
- **Sub-Categories** (5 contemporary sub-categories)
- **Styles** (~60 individual design styles)
- **Approaches** (4 design philosophies)
- **Room Types** (24 different room types)

## Features

✨ **AI-Powered Content Generation**
- Generates detailed descriptions in both Hebrew and English
- Includes historical context, characteristics, visual elements
- Provides color and material guidance
- Creates comprehensive applications and use cases

📊 **Batch Processing**
- Processes multiple entities efficiently
- Rate limiting to avoid API throttling
- Progress tracking and reporting

🎯 **Flexible Options**
- Seed all entities or specific types
- Limit items for testing
- Dry run mode
- Skip or force update existing entities

## Prerequisites

1. **Gemini API Key**

   You need a Google Gemini API key. Get one from: https://makersuite.google.com/app/apikey

2. **Environment Variables**

   Add to your `.env.local`:
   ```env
   GEMINI_API_KEY="your-gemini-api-key-here"
   DATABASE_URL="your-mongodb-url"
   ```

3. **Database Schema**

   Ensure your database is up to date:
   ```bash
   npm run db:push
   ```

## Installation

Dependencies are already installed if you've run `npm install`. The system uses:

- `@google/generative-ai` - Gemini AI SDK
- `commander` - CLI framework
- `chalk` - Terminal colors
- `ora` - Progress spinners
- `tsx` - TypeScript execution

## Usage

### Basic Commands

```bash
# Seed all content (categories, sub-categories, approaches, room types)
npm run seed:content

# Seed only specific entity types
npm run seed:content -- --only categories
npm run seed:content -- --only approaches roomTypes

# Limit items (useful for testing)
npm run seed:content -- --limit 5

# Dry run (test without saving to database)
npm run seed:content -- --dry-run

# Force update existing entities
npm run seed:content -- --force

# Verbose output
npm run seed:content -- --verbose

# Combine options
npm run seed:content -- --only categories --limit 3 --dry-run --verbose
```

### Command Options

| Option | Description | Default |
|--------|-------------|---------|
| `-o, --only <types...>` | Only seed specific types | All types |
| `-l, --limit <number>` | Limit items per type | Unlimited |
| `-s, --skip-existing` | Skip existing entities | `true` |
| `-f, --force` | Force update existing | `false` |
| `-d, --dry-run` | Don't save to database | `false` |
| `-v, --verbose` | Detailed logging | `false` |
| `-h, --help` | Show help | - |

### Entity Types

Available entity types for `--only` option:

- `categories` - Design era categories (Ancient World, Classical, etc.)
- `subCategories` - Contemporary design sub-categories
- `approaches` - Design philosophies (Eclectic, Fusion, etc.)
- `roomTypes` - Room categories (Living Room, Kitchen, etc.)
- `styles` - Individual design styles (coming soon)

## Examples

### Example 1: Test Run

Test the system with a small sample:

```bash
npm run seed:content -- --only approaches --limit 2 --dry-run --verbose
```

This will:
- Process only 2 approaches
- Show detailed logs
- Not save to database
- Display what would be created

### Example 2: Seed Room Types

Seed all 24 room types:

```bash
npm run seed:content -- --only roomTypes
```

### Example 3: Update All Categories

Force update all categories with fresh content:

```bash
npm run seed:content -- --only categories --force
```

### Example 4: Full Production Seed

Seed everything (first time setup):

```bash
npm run seed:content
```

## Output

The script provides detailed progress information:

```
🎨 MoodB Content Seeder

Generating detailed content using Gemini AI...

────────────────────────────────────────────────────────────

📖 Parsing data from markdown file...
✅ Data parsed successfully
🎨 Seeding 4 approaches...
🤖 Generating content for approach: אקלקטי / Eclectic (1/4 - 25%)
✅ Created approach: אקלקטי
...

────────────────────────────────────────────────────────────

📊 Seeding Results:

Entity           Created  Updated  Skipped  Total
───────────────  ───────  ───────  ───────  ───────
Categories       7        0        0        7
SubCategories    5        0        0        5
Approaches       4        0        0        4
Room Types       24       0        0        24

⏱️  Completed in 145.32s

✨ Seeding completed successfully!
```

## Database Schema

The system adds detailed content to entities using the `detailedContent` field:

```prisma
type LocalizedDetailedContent {
  he DetailedContent
  en DetailedContent
}

type DetailedContent {
  introduction    String?   // Brief overview
  description     String?   // Full description
  period          String?   // Time period
  characteristics String[]  // Key features
  visualElements  String[]  // Visual elements
  philosophy      String?   // Design philosophy
  colorGuidance   String?   // Color recommendations
  materialGuidance String?  // Material recommendations
  applications    String[]  // Use cases
  historicalContext String? // Historical background
  culturalContext String?   // Cultural influences
}
```

## Content Structure

### For Categories

Generated content includes:
- **Introduction** (2-3 sentences) - Brief overview
- **Description** (5-8 sentences) - Comprehensive description
- **Period** - Historical time period
- **Characteristics** (5+ items) - Key defining features
- **Visual Elements** (3+ items) - Common visual elements
- **Historical Context** (3-5 sentences) - Historical evolution
- **Cultural Context** (2-4 sentences) - Cultural influences
- **Applications** (3+ items) - Common applications

### For Sub-Categories

Generated content includes:
- **Introduction** (2-3 sentences)
- **Description** (4-6 sentences)
- **Characteristics** (4+ items)
- **Visual Elements** (4+ items)
- **Color Guidance** (2-3 sentences)
- **Material Guidance** (2-3 sentences)
- **Applications** (3+ items)

### For Styles

Generated content includes:
- **Introduction** (2-3 sentences)
- **Description** (6-10 sentences) - Very detailed
- **Period** - Exact years
- **Characteristics** (6+ items)
- **Visual Elements** (4+ items)
- **Color Guidance** (3-4 sentences)
- **Material Guidance** (3-4 sentences)
- **Historical Context** (4-6 sentences)
- **Cultural Context** (3-5 sentences)
- **Applications** (4+ items)

### For Approaches

Generated content includes:
- **Introduction** (2-3 sentences)
- **Description** (5-8 sentences)
- **Philosophy** (3-5 sentences) - Core design philosophy
- **Characteristics** (5+ items) - Design principles
- **Visual Elements** (3+ items)
- **Color Guidance** (2-3 sentences)
- **Material Guidance** (2-3 sentences)
- **Applications** (3+ items)

### For Room Types

Generated content includes:
- **Introduction** (2-3 sentences)
- **Description** (4-6 sentences)
- **Characteristics** (4+ items) - Functional features
- **Visual Elements** (3+ items) - Common design elements
- **Color Guidance** (2-3 sentences)
- **Material Guidance** (2-3 sentences)
- **Applications** (3+ items) - Typical uses

## Source Data

The system parses structured data from:
```
docs/all-base-data.md
```

This file contains:
- Room types organized by category
- Design styles organized by historical eras
- Contemporary design sub-categories
- Design approaches

## API Usage & Costs

### Gemini API Pricing (as of 2024)

- **Gemini 1.5 Pro**: $0.00025 per 1K characters input, $0.0005 per 1K characters output
- **Rate Limits**: 60 requests per minute

### Estimated Costs

For a full seed (all entities):

| Entity | Count | Est. Tokens | Est. Cost |
|--------|-------|-------------|-----------|
| Categories | 7 | ~35K | ~$0.02 |
| SubCategories | 5 | ~25K | ~$0.015 |
| Approaches | 4 | ~20K | ~$0.012 |
| Room Types | 24 | ~120K | ~$0.07 |
| **Total** | **40** | **~200K** | **~$0.12** |

**Note**: Costs are approximate and depend on response length.

## Error Handling

The system handles errors gracefully:

1. **API Errors**: Retries with exponential backoff
2. **Rate Limiting**: Built-in delays between batches
3. **Validation Errors**: Logged but doesn't stop the process
4. **Database Errors**: Individual entity errors are logged

All errors are reported in the final summary:

```
❌ 2 Errors:

  • category:ancient-world: Rate limit exceeded, retry later
  • approach:eclectic: JSON parsing failed
```

## Troubleshooting

### Issue: `GEMINI_API_KEY not found`

**Solution**: Add your API key to `.env.local`:
```env
GEMINI_API_KEY="your-api-key-here"
```

### Issue: Rate limit exceeded

**Solution**: The system has built-in rate limiting. If you still hit limits:
- Use `--limit` to process fewer items
- Wait a few minutes between runs
- Check your API quota

### Issue: JSON parsing errors

**Solution**: Gemini sometimes returns invalid JSON. The error will be logged but won't stop the process. You can:
- Re-run the script (it will skip successful ones)
- Use `--force` to regenerate failed entities

### Issue: Database connection errors

**Solution**:
- Verify `DATABASE_URL` in `.env.local`
- Ensure MongoDB is running and accessible
- Check network connectivity

### Issue: Out of memory

**Solution**:
- Use `--limit` to process in smaller batches
- Increase Node.js memory: `NODE_OPTIONS=--max-old-space-size=4096 npm run seed:content`

## Advanced Usage

### Custom Batch Size

Edit `src/lib/ai/gemini.ts` to adjust batch processing:

```typescript
export async function batchGenerate<T>(
  items: T[],
  generateFn: (item: T) => Promise<LocalizedDetailedContent>,
  options: {
    batchSize?: number      // Default: 5
    delayMs?: number        // Default: 1000ms
    onProgress?: (current: number, total: number) => void
  } = {}
)
```

### Extending Content Types

To add new content fields:

1. Update `prisma/schema.prisma`:
   ```prisma
   type DetailedContent {
     // ... existing fields
     newField String?
   }
   ```

2. Update `src/lib/ai/gemini.ts` prompts to include new field

3. Regenerate Prisma client:
   ```bash
   npm run db:generate
   ```

### Custom Prompts

Edit prompt templates in `src/lib/ai/gemini.ts`:

```typescript
const prompt = `
You are an expert interior design historian and content writer.
Generate comprehensive, detailed content for a design style CATEGORY.

[... your custom instructions ...]
`
```

## Next Steps

After seeding content:

1. **Review Generated Content**
   - Check database using Prisma Studio: `npm run db:studio`
   - Review content quality and accuracy

2. **Create Styles**
   - Styles require category, sub-category, approach, and color relationships
   - Create these manually or extend the seed script

3. **Add Images**
   - Upload images to R2 storage
   - Update entity `images` arrays

4. **Publish Content**
   - Update entity metadata to make content public
   - Set approval status if required

## Support

For issues or questions:
- Check `docs/TROUBLESHOOTING.md`
- Review error messages in console output
- Check Gemini API status: https://status.cloud.google.com/

## License

This seeding system is part of the MoodB project and follows the same license.
