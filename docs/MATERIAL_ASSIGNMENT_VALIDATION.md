# Material Assignment Validation & Image Generation Constraints

## Overview
This document explains:
1. How material assignment works in the MoodB AI style generation system
2. How we ensure only existing materials from the database are assigned to room profiles
3. Critical image generation constraints (no humans policy)

## Problem (Before Fix)

**Symptoms:**
- Warnings during AI seed generation:
  ```
  ⚠️  No match for material: עץ אלון מולבן
  ⚠️  No match for material: שיש קררה
  ⚠️  No match for material: מתכת מוזהבת
  ```

**Root Cause:**
The AI was generating material names based on general interior design knowledge without knowing which materials exist in the database. When the converter tried to match these names using fuzzy matching (80% similarity threshold), many failed, resulting in:
1. Warning messages cluttering the logs
2. Materials being silently skipped from room profiles
3. Incomplete room profile data

## Solution (Current Behavior)

### How It Works

1. **Material List Fetching** (`src/lib/seed/seed-service.ts:1097-1109`)
   - Before generating room profiles, we fetch all available materials from the database
   - Only `name` (Hebrew + English) and `sku` fields are fetched (lightweight query)
   - Log message shows how many materials are available for AI selection

2. **AI Prompt Enhancement** (`src/lib/ai/prompts/room-profile.ts:66-72`)
   - The list of available materials is injected into the AI prompt
   - Materials are formatted clearly with both Hebrew and English names plus SKU
   - **CRITICAL instructions** tell the AI to ONLY use materials from the provided list
   - Example format:
     ```
     **AVAILABLE MATERIALS IN DATABASE** (IMPORTANT - USE ONLY THESE):
       1. עץ מלא / Solid Wood (SKU: MAT-001)
       2. שיש / Marble (SKU: MAT-002)
       3. אבן טבעית / Natural Stone (SKU: MAT-003)

     ⚠️ CRITICAL: You MUST only use materials from the list above. Do NOT invent new material names.
     Use the exact Hebrew and English names as shown.
     ```

3. **Generation Process** (`src/lib/ai/gemini.ts:576-599`)
   - `generateRoomProfileContent()` accepts optional `availableMaterials` parameter
   - `batchGenerateRoomProfiles()` accepts and forwards materials to individual generations
   - Materials are passed through the entire generation pipeline

4. **Validation & Conversion** (`src/lib/seed/room-profile-converter.ts:66-105`)
   - The converter still performs fuzzy matching as a fallback
   - If AI follows instructions correctly, all materials should match exactly (100% success rate)
   - Fuzzy matching (80% threshold) handles minor variations or typos
   - Warnings are still logged if matches fail (now should be very rare)

## Benefits

1. **No More Missing Materials**
   - AI only suggests materials that exist in the database
   - Room profiles have complete material data
   - No silent data loss

2. **Cleaner Logs**
   - Warnings about unmatched materials should be rare or non-existent
   - When they do appear, they indicate a real issue (AI not following instructions or database sync problem)

3. **Better AI Quality**
   - AI has context about available materials
   - Can make more informed decisions based on actual inventory
   - Material suggestions are immediately actionable

4. **Debugging Support**
   - Log message shows how many materials are available: `📦 Loaded 13 available materials for AI selection`
   - If warnings still appear, check:
     - Is the material database properly seeded?
     - Is the AI model following instructions?
     - Are there typos in AI-generated material names?

## File Changes

### Modified Files
1. **`src/lib/ai/prompts/room-profile.ts`**
   - Added `availableMaterials` to `RoomProfileContext` interface
   - Injected materials list into AI prompt
   - Added critical instructions to use only listed materials
   - Added `formatMaterialsList()` helper function

2. **`src/lib/ai/gemini.ts`**
   - Added `availableMaterials` parameter to `generateRoomProfileContent()`
   - Added `availableMaterials` parameter to `batchGenerateRoomProfiles()`
   - Forwarded materials to prompt builder

3. **`src/lib/seed/seed-service.ts`**
   - Added database query to fetch available materials (line 1097-1103)
   - Added progress log message (line 1105-1109)
   - Passed materials to `generateRoomProfileContent()` call (line 1134)

### Unchanged (But Still Used)
- **`src/lib/seed/room-profile-converter.ts`**: Still performs fuzzy matching as validation/fallback

## Testing

To verify the fix is working:

1. **Run the seed process** and watch for material warnings:
   ```bash
   # Before fix: Many warnings
   ⚠️  No match for material: עץ אלון מולבן
   ⚠️  No match for material: שיש קררה

   # After fix: Should see this log + no (or very few) warnings
   📦 Loaded 13 available materials for AI selection
   ```

2. **Check generated room profiles** in the database:
   ```typescript
   // Room profiles should have materials with valid IDs
   const style = await prisma.style.findFirst({
     where: { slug: 'some-style' },
     select: { roomProfiles: true }
   })

   // Verify materials have materialId (not null)
   console.log(style.roomProfiles[0].materials)
   // Should output: [{ materialId: "...", application: {...}, finish: "..." }]
   ```

## Future Improvements

1. **Dynamic Material Categories**
   - Could filter materials by category (e.g., only flooring materials for floor surfaces)
   - Provide context-specific material lists based on room type

2. **Material Metadata**
   - Include material finish options in the prompt
   - Include typical applications for each material
   - Help AI make more informed selections

3. **Validation Layer**
   - Add schema validation to reject room profiles with non-existent material IDs
   - Catch issues before database insertion

## Troubleshooting

### Still Seeing Material Warnings?

1. **Check material database**:
   ```bash
   npx tsx -e "import { PrismaClient } from '@prisma/client'; const p = new PrismaClient(); p.material.findMany().then(m => console.log(m.length + ' materials found'))"
   ```

2. **Check if AI is ignoring instructions**:
   - Look at the warning message - what material did it try to use?
   - Is it a reasonable material that should be in the database?
   - If yes: Add it to the database
   - If no: AI is being creative - may need to strengthen prompt instructions

3. **Check prompt injection**:
   - Add debug logging to see if materials are being included in the prompt:
     ```typescript
     console.log('Materials passed to AI:', availableMaterials?.length || 0)
     ```

## Related Files

- Material seeding: `prisma/seeds/seed-material-categories.ts`
- Material model: `prisma/schema.prisma` (line 746-768)
- Material API: `src/app/api/admin/materials/route.ts`

---

# Image Generation Constraints

## Critical Constraint: No Humans Policy

### Overview
All AI-generated images in MoodB must **NEVER** include humans, human figures, portraits, or artwork depicting humans. This applies to all entity types and all image variations.

### Why This Matters

1. **Professional Focus**: Interior design images should focus on the design, not on people
2. **Brand Consistency**: Ensures all images maintain a consistent, professional aesthetic
3. **Universal Appeal**: Avoids cultural, diversity, or representation issues
4. **Design Clarity**: Removes distractions from the core design elements
5. **Legal Safety**: Avoids potential rights/likeness issues with AI-generated human figures

### Implementation

**Location**: `src/lib/ai/image-generation.ts`

The constraint is added to **ALL** image prompt types:
- ✅ Style images (wide-angle, detail-shot, furniture-arrangement)
- ✅ Style-room images (room-specific applications)
- ✅ Category images
- ✅ Sub-category images
- ✅ Approach images
- ✅ Room type images

**Exact Constraint Text** (added to every prompt):
```
🚫 CRITICAL CONSTRAINT: DO NOT include any humans, human figures, portraits, or drawings/artwork depicting humans in the image. Focus ONLY on interior design elements, architecture, furniture, materials, and decor. No people should be visible anywhere in the scene.
```

### What This Means

**Excluded from all images:**
- ❌ People standing, sitting, or visible in the scene
- ❌ Human reflections in mirrors or windows
- ❌ Portraits on walls (paintings, photographs, artwork)
- ❌ Human sculptures or statues
- ❌ Mannequins or human-shaped forms
- ❌ Human figures in any artwork or decorative elements

**Allowed in images:**
- ✅ Furniture, even if designed for human use (chairs, beds, etc.)
- ✅ Abstract art on walls
- ✅ Landscape paintings or artwork without people
- ✅ Decorative objects, vases, sculptures (non-human)
- ✅ All architectural and interior design elements
- ✅ Plants, flowers, natural elements
- ✅ Geometric or abstract patterns
- ✅ Lighting fixtures, textiles, materials

### Enforcement

The constraint is:
1. **Positioned prominently** in each prompt before the final "Style:" section
2. **Uses warning emoji (🚫)** to draw AI attention
3. **Uses "CRITICAL CONSTRAINT"** language to emphasize importance
4. **Repeated across all 8 prompt variations** to ensure consistency
5. **Explicit and specific** about what to exclude

### Testing & Verification

**When generating images, verify:**
1. No human figures are visible in any part of the image
2. Wall art does not depict people
3. Mirrors/reflections don't show humans
4. Sculptures are abstract/non-human

**If humans appear in generated images:**
1. Report the issue - this indicates AI not following instructions
2. Regenerate the image with the same prompt
3. If problem persists, strengthen the constraint language in the prompt

### Future Improvements

1. **Post-generation validation**: Add automated detection to reject images with humans
2. **Stronger model instructions**: If needed, add additional emphasis or examples
3. **Custom fine-tuned model**: Train a model specifically for human-free interior design

### Related Code

- **Image generation prompts**: `src/lib/ai/image-generation.ts` (lines 91-434)
- **Image generation API**: `src/lib/ai/image-generation.ts` (function `generateImages`)
- **Seed service usage**: `src/lib/seed/seed-service.ts` (calls image generation)

### Compliance Checklist

When reviewing generated images:
- [ ] No people visible in the scene
- [ ] No human portraits/photos on walls
- [ ] No human sculptures or figures
- [ ] No reflections of people in mirrors/windows
- [ ] All artwork is abstract or non-human
- [ ] Focus is purely on interior design elements

---

## Summary

This document covers two critical AI generation policies:
1. **Material Validation**: Ensures AI only suggests materials that exist in the database
2. **No Humans Policy**: Ensures all generated images are purely focused on interior design

Both policies work together to ensure high-quality, consistent, professional output from the AI generation system.
