# Simple Updates: Room Categories & Luxury/Regular Styles

## Overview

Three simple additions to the existing system:

1. **Room Father Category**: Add flexible parent category field to rooms
2. **Style Room Category**: Each style applies to one room category
3. **Luxury vs Regular**: Price level for styles that affects AI generation

---

## 1. Database Schema Changes

### Update Room Model
```prisma
model Room {
  // ... existing fields ...

  // NEW: Flexible parent category (user-defined values)
  parentCategory  String?  // e.g., "Private", "Public", "Commercial", etc.

  @@index([parentCategory])
}
```

### Update Style Model
```prisma
model Style {
  // ... existing fields ...

  // NEW: Which room category this style applies to (one category only)
  roomCategory  String?  // e.g., "Private", "Public", "Commercial"

  // NEW: Price level (affects AI prompts)
  priceLevel    PriceLevel  @default(REGULAR)

  @@index([roomCategory])
  @@index([priceLevel])
}

// NEW ENUM
enum PriceLevel {
  REGULAR   // עממי - Accessible, functional, standard materials
  LUXURY    // יוקרתי - Exclusive, high-end, custom-made
}
```

---

## 2. Migration Script

**File**: `scripts/migrate-categories-luxury.ts`

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting migration: Room Categories & Luxury/Regular...')

  // 1. Set default priceLevel for existing styles
  const stylesUpdated = await prisma.style.updateMany({
    where: { priceLevel: null },
    data: { priceLevel: 'REGULAR' }
  })
  console.log(`✓ Updated ${stylesUpdated.count} styles with default REGULAR price level`)

  // 2. Optionally set default room categories for existing styles
  // (Based on style name patterns or leave as null for user to set)
  const residentialStyles = await prisma.style.updateMany({
    where: {
      OR: [
        { name: { contains: 'מודרני' } },
        { name: { contains: 'מינימליסטי' } },
        { name: { contains: 'סקנדינבי' } },
      ]
    },
    data: { roomCategory: 'Private' }
  })
  console.log(`✓ Set 'Private' category for ${residentialStyles.count} residential styles`)

  // 3. Leave room.parentCategory as null - user will set via UI
  console.log('✓ Room parent categories ready for user assignment')

  console.log('Migration complete!')
}

main()
  .catch((e) => {
    console.error('Migration failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

**Run**:
```bash
npx tsx scripts/migrate-categories-luxury.ts
```

---

## 3. AI Prompt Changes

### Update Gemini Prompt Builder

**File**: `src/lib/ai/prompts/style-factual-details.ts` (or wherever prompts are built)

```typescript
export function buildStylePrompt(style: Style): string {
  const basePrompt = `Generate detailed content for the interior design style: ${style.name}`

  // Add price level modifiers
  const priceLevelKeywords = getPriceLevelKeywords(style.priceLevel)
  const priceLevelPrompt = `
Style Price Level: ${style.priceLevel}
Focus on: ${priceLevelKeywords}
`

  // Add room category context
  const roomCategoryPrompt = style.roomCategory
    ? `This style applies to: ${style.roomCategory} spaces`
    : ''

  return `
${basePrompt}
${priceLevelPrompt}
${roomCategoryPrompt}

[... rest of existing prompt ...]
`
}

function getPriceLevelKeywords(priceLevel: PriceLevel): string {
  if (priceLevel === 'LUXURY') {
    return 'Exclusive, High-end, Custom-made, Sophisticated, Precious materials, Designer pieces, Premium finishes, Bespoke elements'
  }

  // REGULAR
  return 'Accessible, Functional, Smart solutions, Standard materials, Cost-effective, Practical, Ready-made options, Value-focused'
}
```

### Update Image Generation Prompts

**File**: `src/lib/ai/image-generation.ts`

```typescript
export function buildImagePrompt(style: Style, room: Room): string {
  const priceLevelModifier = getPriceLevelImageModifier(style.priceLevel)

  return `
Generate a high-quality interior design image:
- Style: ${style.name}
- Room: ${room.name}
- Price Level: ${style.priceLevel}
- ${priceLevelModifier}

[... rest of existing prompt ...]
`
}

function getPriceLevelImageModifier(priceLevel: PriceLevel): string {
  if (priceLevel === 'LUXURY') {
    return 'Show high-end finishes, custom furniture, premium materials, designer lighting, sophisticated details. Emphasize luxury and exclusivity.'
  }

  // REGULAR
  return 'Show practical, accessible design with standard materials, functional furniture, smart space solutions. Emphasize comfort and value.'
}
```

### Update Seed Service

**File**: `src/lib/seed/seed-service.ts`

```typescript
export async function seedStyles(params: SeedStylesParams) {
  // ... existing code ...

  for (const styleName of styleNames) {
    // Determine price level (could be random, or based on style name, or user-selected)
    const priceLevel = determinePriceLevel(styleName) // 'LUXURY' or 'REGULAR'

    // Generate content with price level
    const detailedContent = await generateDetailedContent({
      name: styleName,
      priceLevel: priceLevel,
      roomCategory: params.roomCategory, // Pass through if provided
    })

    // Create style with new fields
    const style = await prisma.style.create({
      data: {
        name: styleName,
        priceLevel: priceLevel,
        roomCategory: params.roomCategory || null,
        // ... rest of existing fields ...
      }
    })

    // Generate images with price level context
    const images = await generateStyleImages(style)

    // ...
  }
}

function determinePriceLevel(styleName: string): PriceLevel {
  // Logic to determine if style should be luxury or regular
  const luxuryKeywords = ['יוקרתי', 'luxury', 'premium', 'designer', 'בוטיק']
  const isLuxury = luxuryKeywords.some(keyword =>
    styleName.toLowerCase().includes(keyword)
  )

  return isLuxury ? 'LUXURY' : 'REGULAR'
}
```

---

## 4. UI Changes

### Admin: Style Form

**File**: `src/app/[locale]/admin/styles/[id]/edit/page.tsx` (or style form component)

**Add Fields**:

```typescript
// 1. Room Category Selector (Dropdown)
<Select
  label={t('style.room-category')}
  value={formData.roomCategory || ''}
  onChange={(value) => setFormData({ ...formData, roomCategory: value })}
  data={[
    { value: 'Private', label: t('categories.private') },
    { value: 'Public', label: t('categories.public') },
    { value: 'Commercial', label: t('categories.commercial') },
    { value: 'Other', label: t('categories.other') },
  ]}
  clearable
  placeholder={t('style.select-room-category')}
/>

// 2. Price Level Selector (Radio buttons or Segment)
<SegmentedControl
  label={t('style.price-level')}
  value={formData.priceLevel}
  onChange={(value) => setFormData({ ...formData, priceLevel: value })}
  data={[
    { value: 'REGULAR', label: t('price-level.regular') }, // עממי
    { value: 'LUXURY', label: t('price-level.luxury') },   // יוקרתי
  ]}
/>

// Optional: Show explanation
<Text size="sm" color="dimmed">
  {formData.priceLevel === 'LUXURY'
    ? t('price-level.luxury-description')
    : t('price-level.regular-description')}
</Text>
```

### Admin: Room Form

**File**: `src/app/[locale]/admin/rooms/[id]/edit/page.tsx` (or room form component)

**Add Field**:

```typescript
// Parent Category Input (Free text or dropdown - user decides)
<TextInput
  label={t('room.parent-category')}
  value={formData.parentCategory || ''}
  onChange={(e) => setFormData({ ...formData, parentCategory: e.target.value })}
  placeholder={t('room.parent-category-placeholder')} // e.g., "Private, Public, Commercial"
  description={t('room.parent-category-description')}
/>

// OR if you want dropdown with common values + custom:
<Select
  label={t('room.parent-category')}
  value={formData.parentCategory || ''}
  onChange={(value) => setFormData({ ...formData, parentCategory: value })}
  data={[
    { value: 'Private', label: 'פרטי' },
    { value: 'Public', label: 'ציבורי' },
    { value: 'Commercial', label: 'מסחרי' },
  ]}
  searchable
  creatable
  getCreateLabel={(query) => `+ צור: ${query}`}
  onCreate={(query) => {
    const item = { value: query, label: query }
    return item
  }}
  clearable
/>
```

### Frontend: Style Display

**File**: `src/components/features/style-system/StyleCard.tsx` (or wherever styles are displayed)

**Show Badges**:

```typescript
<Card>
  <Badge color={style.priceLevel === 'LUXURY' ? 'gold' : 'blue'}>
    {style.priceLevel === 'LUXURY' ? 'יוקרתי' : 'עממי'}
  </Badge>

  {style.roomCategory && (
    <Badge variant="outline">{style.roomCategory}</Badge>
  )}

  {/* ... rest of card ... */}
</Card>
```

---

## 5. Validation

### Zod Schemas

**File**: `src/lib/validations/style.ts`

```typescript
import { z } from 'zod'

export const PriceLevelEnum = z.enum(['REGULAR', 'LUXURY'])

export const createStyleSchema = z.object({
  // ... existing fields ...

  roomCategory: z.string().optional().nullable(),
  priceLevel: PriceLevelEnum.default('REGULAR'),
})

export const updateStyleSchema = z.object({
  // ... existing fields ...

  roomCategory: z.string().optional().nullable(),
  priceLevel: PriceLevelEnum.optional(),
})
```

**File**: `src/lib/validations/room.ts`

```typescript
export const updateRoomSchema = z.object({
  // ... existing fields ...

  parentCategory: z.string().max(100).optional().nullable(),
})
```

---

## 6. Translation Keys

**Add to**: `/admin/translations`

```typescript
// Style translations
'style.room-category': { he: 'קטגוריית חדרים', en: 'Room Category' }
'style.select-room-category': { he: 'בחר קטגוריה', en: 'Select category' }
'style.price-level': { he: 'רמת מחיר', en: 'Price Level' }

'price-level.regular': { he: 'עממי', en: 'Regular' }
'price-level.luxury': { he: 'יוקרתי', en: 'Luxury' }

'price-level.regular-description': {
  he: 'עיצוב נגיש ופונקציונלי עם חומרים סטנדרטיים',
  en: 'Accessible, functional design with standard materials'
}
'price-level.luxury-description': {
  he: 'עיצוב יוקרתי עם חומרים יוקרתיים ואלמנטים מותאמים אישית',
  en: 'Luxury design with premium materials and custom elements'
}

// Room category options
'categories.private': { he: 'פרטי', en: 'Private' }
'categories.public': { he: 'ציבורי', en: 'Public' }
'categories.commercial': { he: 'מסחרי', en: 'Commercial' }
'categories.other': { he: 'אחר', en: 'Other' }

// Room translations
'room.parent-category': { he: 'קטגוריה אב', en: 'Parent Category' }
'room.parent-category-placeholder': { he: 'לדוגמה: פרטי, ציבורי, מסחרי', en: 'e.g., Private, Public, Commercial' }
'room.parent-category-description': {
  he: 'הזן קטגוריה או בחר מהרשימה',
  en: 'Enter a category or select from list'
}
```

---

## 7. API Updates (if needed)

If you have API routes that filter styles, add support for new fields:

### GET /api/styles
```typescript
// Support filtering by room category and price level
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const roomCategory = searchParams.get('roomCategory')
  const priceLevel = searchParams.get('priceLevel')

  const styles = await prisma.style.findMany({
    where: {
      ...(roomCategory && { roomCategory }),
      ...(priceLevel && { priceLevel: priceLevel as PriceLevel }),
    },
    // ...
  })

  return NextResponse.json(styles)
}
```

---

## 8. Testing

### Unit Tests

```typescript
// tests/lib/ai/prompts.test.ts
describe('AI Prompt with Price Level', () => {
  it('should include luxury keywords for LUXURY style', () => {
    const style = { name: 'Modern Luxury', priceLevel: 'LUXURY' }
    const prompt = buildStylePrompt(style)

    expect(prompt).toContain('Exclusive')
    expect(prompt).toContain('High-end')
    expect(prompt).toContain('Custom-made')
  })

  it('should include regular keywords for REGULAR style', () => {
    const style = { name: 'Modern', priceLevel: 'REGULAR' }
    const prompt = buildStylePrompt(style)

    expect(prompt).toContain('Accessible')
    expect(prompt).toContain('Functional')
    expect(prompt).toContain('Cost-effective')
  })
})
```

### Integration Tests

```typescript
// tests/api/styles.test.ts
describe('Style API with new fields', () => {
  it('should create style with room category and price level', async () => {
    const response = await fetch('/api/styles', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Modern Luxury',
        roomCategory: 'Private',
        priceLevel: 'LUXURY',
        // ... other fields
      })
    })

    expect(response.status).toBe(201)
    const style = await response.json()
    expect(style.roomCategory).toBe('Private')
    expect(style.priceLevel).toBe('LUXURY')
  })

  it('should filter styles by room category', async () => {
    const response = await fetch('/api/styles?roomCategory=Private')
    const styles = await response.json()

    expect(styles.every(s => s.roomCategory === 'Private')).toBe(true)
  })
})
```

---

## 9. Rollout Steps

### Step 1: Database Changes (5 min)
```bash
# 1. Update Prisma schema
# 2. Generate Prisma client
npx prisma generate

# 3. Create migration
npx prisma migrate dev --name add-room-category-and-price-level

# 4. Run migration script
npx tsx scripts/migrate-categories-luxury.ts
```

### Step 2: Backend Updates (1 hour)
- Update validation schemas
- Update AI prompt builders
- Update seed service
- Update API routes (if filtering needed)

### Step 3: UI Updates (2 hours)
- Add fields to Style form (room category + price level)
- Add field to Room form (parent category)
- Add badges to style cards
- Test form submissions

### Step 4: Testing (1 hour)
- Test style creation with new fields
- Test AI generation with luxury vs regular
- Verify prompts include correct keywords
- Test room category assignment

### Step 5: Deploy (30 min)
- Deploy to staging
- Test with real data
- Deploy to production
- Monitor for errors

**Total Time: ~5 hours**

---

## 10. Summary

### What Changed

✅ **Room Model**: Added `parentCategory` (flexible string field)
✅ **Style Model**: Added `roomCategory` (one category) + `priceLevel` (LUXURY/REGULAR enum)
✅ **AI Prompts**: Inject different keywords based on price level
✅ **UI Forms**: Added fields to admin forms
✅ **Validation**: Updated Zod schemas

### What Stayed Simple

- No complex categorization system
- No new tables (just 2 fields on existing models)
- Parent categories are user-defined (flexible)
- One category per style (not multiple)
- Clear luxury vs regular distinction

### Why This Works

1. **Flexible**: User can define any room categories they want
2. **Simple**: Just 2 new fields on existing models
3. **Powerful**: AI prompts adapt based on price level
4. **Fast**: ~5 hours to implement and deploy

---

## Next Steps

1. ✅ Approve this plan
2. 🔹 Run Prisma migration
3. 🔹 Update AI prompts
4. 🔹 Update UI forms
5. 🔹 Test and deploy

---

**Document Version**: 1.0
**Last Updated**: 2025-11-20
**Estimated Implementation Time**: 5 hours
**Status**: Ready to implement
