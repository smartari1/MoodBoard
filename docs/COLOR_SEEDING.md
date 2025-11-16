# Color Seeding Documentation

**Date**: 2025-11-16
**Status**: ✅ Complete - 20 colors seeded with AI descriptions

## Overview

The MoodB color system includes a curated collection of interior design colors organized by category. Each color has AI-generated professional descriptions in both Hebrew and English.

## Seeded Colors

### Monochromatic Colors (Neutrals) - 7 colors
1. **לבן / White** - `#FFFFFF`
2. **לבן שבור / Off-White** - `#FAF9F6`
3. **קרם / Cream** - `#FFFDD0`
4. **בז' / Beige** - `#F5F5DC`
5. **שמנת / Ivory** - `#FFFFF0`
6. **אופוויט / Eggshell** - `#F0EAD6`
7. **שחור / Black** - `#000000`

### Dominant Colors (Accent) - 8 colors
8. **כחול נייבי / Navy Blue** - `#000080` (Primary)
9. **כחול / Blue** - `#0000FF` (Primary)
10. **ירוק מרווה / Sage Green** - `#9CAF88`
11. **ירוק בקבוק / Bottle Green** - `#006A4E`
12. **בורדו / Burgundy** - `#800020`
13. **ורוד עתיק / Antique Pink** - `#E8C4C4`
14. **כאמל / Camel** - `#C19A6B`
15. **טורקיז / Turquoise** - `#40E0D0`

### Metallic Colors - 5 colors
16. **זהב / Gold** - `#FFD700`
17. **כסף / Silver** - `#C0C0C0`
18. **ברונזה / Bronze** - `#CD7F32`
19. **רוזגולד / Rose Gold** - `#B76E79`
20. **חלודה / Rust** - `#B7410E`

## Database Schema

Each color has:
- **name**: `{ he: string, en: string }` - Bilingual name
- **description**: `{ he: string, en: string }` - AI-generated professional description
- **hex**: `string` - Unique color code (e.g., `#FFFFFF`)
- **pantone**: `string?` - Optional Pantone code
- **category**: `neutral | accent | semantic | metallic`
- **role**: `primary | secondary` (optional)
- **usage**: `number` - How many styles use this color
- **organizationId**: `null` - Global colors (not org-specific)

## Usage

### Seed All Colors
```bash
# Seed all 20 colors with AI descriptions
npm run seed:colors

# Force update existing colors
npm run seed:colors -- --force

# Verbose output
npm run seed:colors -- --verbose
```

### Test/Development
```bash
# Dry run (no database changes)
npm run seed:colors -- --dry-run

# Limit to first N colors
npm run seed:colors -- --limit 5

# Quick mode (skip AI descriptions)
npm run seed:colors -- --quick
```

### Combine Options
```bash
# Test first 3 colors with verbose output
npm run seed:colors -- --limit 3 --dry-run --verbose

# Force update all with descriptions
npm run seed:colors -- --force --verbose
```

## AI-Generated Descriptions

Each color description includes:
1. **Visual characteristics** - What the color looks like
2. **Usage in interior design** - Where and how it's typically used
3. **Mood and atmosphere** - Feelings it creates
4. **Complementary styles** - Which design styles it works best with
5. **Recommended spaces** - Which rooms suit this color

### Example Description

**White (#FFFFFF)**
> White is a pure neutral, offering a clean, bright, and expansive aesthetic that visually enlarges spaces. It functions as a fundamental architectural element, reflecting light and enhancing luminosity, making it ideal for small rooms or for fostering an atmosphere of serenity and calm. White harmonizes effortlessly with a vast array of colors and materials, from natural wood to polished metals, and excels in minimalist, Scandinavian, modern, and even bohemian design styles.

## File Structure

```
src/lib/
├── seed/
│   ├── colors-data.ts       # Color definitions with hex codes
│   └── seed-colors.ts       # Seeding service
└── ai/
    └── gemini.ts            # generateColorDescription()

scripts/
└── seed-colors.ts           # CLI script

package.json                 # npm script: "seed:colors"
```

## Seeding Results

```
📊 Seeding Results:

Action           Count
───────────────  ───────
Created          19
Updated          1
Skipped          0
───────────────  ───────
Total            20

⏱️  Completed in 68.55s
```

## Color Categories Breakdown

- **Neutral**: 7 colors (35%)
- **Accent**: 8 colors (40%)
- **Metallic**: 5 colors (25%)

## API Integration

Colors are stored globally (`organizationId: null`) and can be used across all organizations. Styles can reference colors via the `colors` relation.

### Query Colors
```typescript
// Get all neutral colors
const neutrals = await prisma.color.findMany({
  where: { category: 'neutral' },
  orderBy: { order: 'asc' },
})

// Get color by hex
const white = await prisma.color.findUnique({
  where: { hex: '#FFFFFF' },
})

// Get colors with usage stats
const popular = await prisma.color.findMany({
  orderBy: { usage: 'desc' },
  take: 10,
})
```

## Performance

- **Time per color**: ~3.4 seconds (including AI generation)
- **Total time**: ~68 seconds for 20 colors
- **Rate limiting**: 1 second delay between requests
- **API calls**: 1 per color (Gemini Flash Lite)

## Future Enhancements

1. Add more color variations
2. Add Pantone codes
3. Add color psychology descriptions
4. Add complementary color suggestions
5. Add color palette generation
6. Add color harmony rules
7. Add seasonal color collections

## Troubleshooting

### API Quota Exceeded
If you see quota errors:
```bash
# Use quick mode (no AI)
npm run seed:colors -- --quick

# Or wait and try again later
npm run seed:colors -- --limit 5
```

### Duplicate Hex Codes
Each hex code must be unique. The system will update existing colors with the same hex.

### Missing Descriptions
If descriptions fail to generate, the color is still created without descriptions. Run again with `--force` to regenerate.

## Validation

Check colors in Prisma Studio:
```bash
npm run db:studio
# Navigate to: Colors table
```

Or query programmatically:
```bash
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const colors = await prisma.color.findMany();
console.log(\`Total colors: \${colors.length}\`);
await prisma.\$disconnect();
"
```

---

**Last Updated**: 2025-11-16
**Status**: ✅ Production ready - All colors seeded with professional AI descriptions
