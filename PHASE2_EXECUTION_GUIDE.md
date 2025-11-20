# Phase 2 Execution Guide: The Developer's Bible (High Resolution)

This document contains the **exact code changes** required to implement Phase 2.
Follow it step-by-step to ensure zero breakage.

---

## 1. Database Schema (`prisma/schema.prisma`)

**Action:** Open `prisma/schema.prisma` and apply these specific changes.

### 1.1. Enums
Add these at the top of the file (or with other enums):

```prisma
enum PriceTier {
  AFFORDABLE
  LUXURY
}

enum GenerationStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}
```

### 1.2. New Composite Types
Add these new types to support the structured gallery and views.

```prisma
type StyleGalleryItem {
  id                 String   @default(uuid())
  url                String
  type               String   // 'scene', 'material', 'color'
  
  // For Scenes
  sceneName          String?  // 'entry', 'living', 'dining', 'kitchen', 'master_bed', 'bath'
  complementaryColor String?  // e.g., "#800020" (Bordeaux)
  
  // For Materials/Colors
  linkedAssetId      String?  @db.ObjectId // Ref to Material.id or Color.id
  
  // Metadata
  prompt             String?
  createdAt          DateTime @default(now())
}

type RoomView {
  id           String           @default(uuid())
  url          String?          // Nullable if pending
  orientation  String           // 'main', 'opposite', 'left', 'right'
  prompt       String?
  status       GenerationStatus @default(PENDING)
  createdAt    DateTime         @default(now())
}
```

### 1.3. Model Updates

**Update `model Style`:**
Replace `images String[]` with `gallery StyleGalleryItem[]` and add `priceTier`.

```prisma
model Style {
  // ... existing fields ...
  
  priceTier   PriceTier @default(AFFORDABLE) // New field
  
  // CHANGED: Was images String[]
  gallery     StyleGalleryItem[] 
  
  // ... existing fields ...
}
```

**Update `type RoomProfile`:**
Replace `images String[]` with `views RoomView[]`.

```prisma
type RoomProfile {
  // ... existing fields ...
  
  // CHANGED: Was images String[]
  views    RoomView[]
}
```

**Update `type DetailedContent`:**
Add the new structural fields.

```prisma
type DetailedContent {
  // ... existing fields ...

  executiveSummary  String?   // Part B
  requiredMaterials String[]  // Raw list from AI
  requiredColors    String[]  // Raw list from AI
}
```

**Update `model Material`:**
Add abstract fields.

```prisma
model Material {
  // ...
  sku             String?          // Now optional
  isAbstract      Boolean          @default(false)
  generationStatus GenerationStatus @default(COMPLETED)
  aiDescription   String?
  // ...
}
```

**Action:** Run `npx prisma generate` immediately after saving.

---

## 2. Data Migration (`scripts/migrate-phase2.ts`)

**Action:** Create this file to prevent data loss.

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Starting Phase 2 Migration...')
  
  // 1. Migrate Styles
  const styles = await prisma.style.findMany()
  for (const style of styles) {
    // Check if already migrated (simple check: if gallery has items but images was empty, or logic specific to your DB state)
    // Actually, since we renamed the field in schema, Prisma might not return 'images' in the type.
    // You might need to use @ts-ignore or raw query if the column name changed in Mongo (it usually stays as is).
    // In Mongo, if you rename in schema, the data is still there under the old key until overwritten.
    
    // Strategy: We assume 'images' data needs to move to 'gallery'.
    // Since we can't access 'images' via typed client easily if removed from schema, 
    // we treat the existing string array as a source for the new gallery.
    
    const oldImages = (style as any).images || []
    
    if (oldImages.length > 0 && style.gallery.length === 0) {
      const galleryItems = oldImages.map((url: string) => ({
        id: crypto.randomUUID(),
        url,
        type: 'scene',
        sceneName: 'legacy',
        createdAt: new Date()
      }))
      
      await prisma.style.update({
        where: { id: style.id },
        data: {
          gallery: galleryItems,
          priceTier: 'AFFORDABLE' // Default
        }
      })
      console.log(`✅ Migrated Style: ${style.slug}`)
    }
  }
  
  // 2. Migrate Room Profiles
  // Similar logic: Iterate styles, iterate roomProfiles, convert images -> views
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

---

## 3. Service Logic (`src/lib/seed/seed-service.ts`)

**Action:** Refactor `seedStyles` to use the 4-Act structure.

### Act 1: The New Prompt Structure
In `src/lib/ai/gemini.ts`, update the prompt to request this JSON:

```json
{
  "partA": {
    "introduction": "...",
    "description": "...",
    "history": "...",
    "philosophy": "..."
  },
  "partB": {
    "executiveSummary": "..."
  },
  "production": {
    "materials": ["Oak Wood", "Velvet", "Brass"],
    "colors": ["Sage Green", "Cream"]
  }
}
```

### Act 2: Asset Stubbing (The "Director")
Add this function to `seed-service.ts`:

```typescript
async function ensureAssetsExist(
  materialNames: string[],
  colorNames: string[],
  styleContext: string
): Promise<{ materialIds: string[], colorIds: string[] }> {
  
  const materialIds = []
  
  for (const name of materialNames) {
    // Fuzzy search
    const existing = await prisma.material.findFirst({
      where: { 
        name: { en: { contains: name, mode: 'insensitive' } } 
      }
    })
    
    if (existing) {
      materialIds.push(existing.id)
    } else {
      // Create Abstract
      const newMat = await prisma.material.create({
        data: {
          name: { en: name, he: await translate(name) },
          slug: slugify(name),
          categoryId: await guessCategory(name), // defaults to 'general'
          isAbstract: true,
          generationStatus: 'PENDING',
          aiDescription: `Material for ${styleContext}: ${name}`
        }
      })
      materialIds.push(newMat.id)
    }
  }
  // ... same for colors
  return { materialIds, colorIds }
}
```

### Act 3: The Golden Scenes
Hardcode this configuration constant in `seed-service.ts`:

```typescript
const GOLDEN_SCENES = [
  { name: 'entry', promptSuffix: 'Exterior entrance, wide angle', complement: 'style-dependent' },
  { name: 'living', promptSuffix: 'Living room, cozy', complement: 'style-dependent' },
  // ... etc
]
```

---

## 4. UI Updates (`src/components/features/style-system/`)

**Action:** Fix the breaking changes in `DetailedContentViewer.tsx`.

1.  **Locate:** `images.map(...)`
2.  **Replace with:** `(style.gallery || []).filter(item => item.type === 'scene').map(...)`
3.  **Add Tab:**
    ```tsx
    <Tabs.Tab value="summary">Executive Summary</Tabs.Tab>
    <Tabs.Panel value="summary">
      <Text>{content.he.executiveSummary}</Text>
      <Title order={5}>Production List</Title>
      <List>
        {content.he.requiredMaterials.map(m => <List.Item>{m}</List.Item>)}
      </List>
    </Tabs.Panel>
    ```

---

## 5. Execution Checklist

1.  [ ] **Schema:** Apply changes to `prisma/schema.prisma`.
2.  [ ] **Generate:** Run `npx prisma generate`.
3.  [ ] **Migrate:** Run the migration script to save existing data.
4.  [ ] **Refactor:** Update `gemini.ts` prompts.
5.  [ ] **Logic:** Implement `ensureAssetsExist` in `seed-service.ts`.
6.  [ ] **UI:** Fix compilation errors in `DetailedContentViewer` caused by type changes.
7.  [ ] **Test:** Run `npm run seed:content -- --limit 1 --dry-run` to verify the flow.

This guide is your map. Follow it precisely.
