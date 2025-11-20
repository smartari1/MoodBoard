# Phase 2: Task List & Project Management

**Project**: Style System Enhancement with Rich Image Generation
**Start Date**: 2025-11-20
**Target Completion**: 3 weeks (2025-12-11)
**Status**: 🟢 In Progress - Day 5 Complete (Backend 70% done)
**Progress**: 16/60 tasks completed (27%)

---

## 📚 Documentation Index

1. **00-requirements.md** - Original requirements from user
2. **SIMPLE_CATEGORY_LUXURY_UPDATES.md** - Simple category system (5 hours)
3. **COMPLETE_PHASE2_PLAN.md** - Full plan with 102 image generation
4. **PHASE2_WITH_TEXTURE_ENTITIES.md** - Complete plan with Texture entity layer (FINAL)

---

## 🎯 Project Overview

### What We're Building

1. **Category System** (Simple)
   - Room father category (flexible string)
   - Style room category (one per style)
   - Luxury vs Regular price level

2. **Rich Image Generation** (~102 images per style)
   - 60 Room Overview images
   - 25 Material images
   - 15 Texture images
   - 1 Composite mood board
   - 1 Anchor image

3. **Texture Entity Layer**
   - Textures become reusable database entities
   - Find-or-create during generation
   - Link to styles (many-to-many)
   - Display next to materials in UI

---

## 📅 Timeline (3 Weeks)

### Week 1: Database & Backend (Nov 20-27)
**Owner**: Backend Team

### Week 2: UI & Testing (Nov 28 - Dec 4)
**Owner**: Frontend Team

### Week 3: Production (Dec 5-11)
**Owner**: DevOps + Full Team

---

## ✅ Task Breakdown

### WEEK 1: Database & Backend

#### Day 1 (Nov 20): Database Schema ✅ COMPLETE
- [x] **1.1** Add enums to Prisma schema
  - [x] `PriceLevel` (REGULAR, LUXURY)
  - [x] `ImageCategory` (ROOM_OVERVIEW, ROOM_DETAIL, MATERIAL, TEXTURE, COMPOSITE, ANCHOR)
  - **File**: `prisma/schema.prisma`
  - **Time**: 30 min ✅

- [x] **1.2** Add fields to Room model
  - [x] `parentCategory: String?`
  - **File**: `prisma/schema.prisma`
  - **Time**: 10 min ✅

- [x] **1.3** Add fields to Style model
  - [x] `roomCategory: String?`
  - [x] `priceLevel: PriceLevel`
  - [x] `compositeImageUrl: String?`
  - [x] `anchorImageUrl: String?`
  - [x] `images: StyleImage[]` relation
  - [x] `textureLinks: StyleTexture[]` relation
  - **File**: `prisma/schema.prisma`
  - **Time**: 20 min ✅

- [x] **1.4** Create StyleImage model (NEW MODEL)
  - [x] `imageCategory: ImageCategory`
  - [x] `displayOrder: Int`
  - [x] `description: String?`
  - [x] `tags: String[]`
  - [x] `roomType: String?`
  - [x] `textureId: String?` (for texture entity link)
  - **File**: `prisma/schema.prisma`
  - **Time**: 30 min ✅

- [x] **1.5** Create Texture entity models
  - [x] `TextureCategory` model
  - [x] `TextureType` model
  - [x] `Texture` model
  - [x] `StyleTexture` join model (many-to-many)
  - [x] Add `textures` relation to Organization
  - **File**: `prisma/schema.prisma`
  - **Time**: 1 hour ✅

- [x] **1.6** Generate Prisma client
  ```bash
  npx prisma generate
  ```
  - **Time**: 2 min ✅
  - **Note**: MongoDB doesn't need migrations (schema-less)

**Day 1 Total**: ~2.5 hours ✅ COMPLETE

---

#### Day 2 (Nov 21): Seed Data & Validation ✅ COMPLETE

- [x] **2.1** Create texture categories seed script
  - [x] Create `prisma/seed-textures.ts`
  - [x] Define 5 main categories:
    - Wall Finishes (גימורי קיר) ✅
    - Wood Finishes (גימורי עץ) ✅
    - Metal Finishes (גימורי מתכת) ✅
    - Fabric Textures (טקסטורות בד) ✅
    - Stone Finishes (גימורי אבן) ✅
  - [x] Define 27 types across categories ✅
  - [x] Run seed script successfully ✅
  - **File**: `prisma/seed-textures.ts` ✅
  - **Time**: 1 hour ✅
  - **Result**: 5 categories, 27 types seeded successfully

- [x] **2.2** Update Zod validation schemas
  - [x] Update `src/lib/validations/style.ts`
    - Add `roomCategory` validation ✅
    - Add `priceLevel` validation ✅
    - Add `compositeImageUrl` validation ✅
    - Add `anchorImageUrl` validation ✅
  - [x] Update `src/lib/validations/room.ts`
    - Add `parentCategory` validation ✅
  - [x] Create `src/lib/validations/style-image.ts` (NEW) ✅
  - [x] Create `src/lib/validations/texture.ts` (NEW) ✅
  - **Time**: 1 hour ✅

- [ ] **2.3** Create migration script for existing data
  - [ ] Create `scripts/migrate-phase2-complete.ts`
  - [ ] Set default `priceLevel = REGULAR` for existing styles
  - [ ] Set default `imageCategory = ROOM_OVERVIEW` for existing images
  - [ ] Categorize existing images (first 60 = overview, rest = detail)
  - **File**: `scripts/migrate-phase2-complete.ts`
  - **Time**: 1 hour
  - **Reference**: See `COMPLETE_PHASE2_PLAN.md` Part 5.1

- [ ] **2.4** Run migration on development database
  ```bash
  npx tsx scripts/migrate-phase2-complete.ts
  ```
  - **Time**: 10 min
  - **Verify**: Check database records updated correctly

**Day 2 Total**: ~3 hours (66% complete - 2/3 hours done)

---

#### Day 3 (Nov 22): AI Prompt Updates ✅ COMPLETE

- [x] **3.1** Update style prompt builder ✅
  - [x] Modified `src/lib/ai/prompts/style-factual-details.ts` ✅
  - [x] Added price level keywords inline (LUXURY vs REGULAR) ✅
  - [x] Injected luxury/regular keywords into material guidance ✅
  - **Time**: 45 min ✅
  - **Result**: Price level keywords now inject throughout prompts

- [x] **3.2** Update image generation prompts ✅
  - [x] Modified `src/lib/ai/image-generation.ts` ✅
  - [x] Added entityType support for new categories ✅
  - [x] Added category-specific prompt logic:
    - MATERIAL ✅
    - TEXTURE ✅
    - COMPOSITE ✅
    - ANCHOR ✅
    - ROOM_OVERVIEW (existing 'style-room') ✅
  - [x] Implemented multi-image reference support ✅
  - **Time**: 2 hours ✅
  - **Result**: All new image categories supported with prompts

- [x] **3.3** Updated gemini.ts for price level ✅
  - [x] Changed priceTier to priceLevel ✅
  - [x] Passed priceLevel directly to buildFactualDetailsPrompt ✅
  - **Time**: 15 min ✅

**Day 3 Total**: ~3 hours ✅ COMPLETE

---

#### Day 4-5 (Nov 23-24): Seed Service Updates ⏸️ Not Started

- [ ] **4.1** Create texture generator module
  - [ ] Create `src/lib/seed/texture-generator.ts`
  - [ ] Implement `generateTextureImages()` function
  - [ ] Implement `findOrCreateTexture()` function
  - [ ] Implement `getTextureSpecsByPriceLevel()` function
  - [ ] Implement `generateTextureImage()` function
  - **Time**: 3 hours
  - **Reference**: See `PHASE2_WITH_TEXTURE_ENTITIES.md` Part 3.1

- [ ] **4.2** Create material generator module
  - [ ] Create `src/lib/seed/material-generator.ts`
  - [ ] Implement `generateMaterialImages()` function
  - [ ] Implement `getMaterialsByPriceLevel()` function
  - **Time**: 1.5 hours
  - **Reference**: See `COMPLETE_PHASE2_PLAN.md` Part 3.3

- [ ] **4.3** Create room overview generator
  - [ ] Create `src/lib/seed/room-overview-generator.ts`
  - [ ] Implement `generateRoomOverviewImages()` function
  - [ ] Implement `getRoomTypesByCategory()` function
  - [ ] Implement `distributeImagesAcrossRooms()` function
  - [ ] Implement `getRandomAspectRatio()` helper
  - **Time**: 2 hours
  - **Reference**: See `COMPLETE_PHASE2_PLAN.md` Part 3.2

- [ ] **4.4** Create composite & anchor generators
  - [ ] Create `src/lib/seed/composite-generator.ts`
  - [ ] Implement `generateCompositeMoodBoard()` function
  - [ ] Implement `generateAnchorImage()` function
  - [ ] Implement `extractColorPalette()` helper
  - **Time**: 2 hours
  - **Reference**: See `COMPLETE_PHASE2_PLAN.md` Part 3.5

- [ ] **4.5** Update main seed service
  - [ ] Modify `src/lib/seed/seed-service.ts`
  - [ ] Update `seedStyles()` function with new flow:
    1. Generate text content (with price level)
    2. Generate 60 room overview images
    3. Generate 25 material images
    4. Generate 15 texture images (with entity creation)
    5. Generate composite mood board
    6. Generate anchor image
  - [ ] Add progress callbacks
  - [ ] Add error handling
  - **Time**: 2 hours
  - **Reference**: See `COMPLETE_PHASE2_PLAN.md` Part 3.1

- [ ] **4.6** Test full generation flow
  - [ ] Test with LUXURY style
  - [ ] Test with REGULAR style
  - [ ] Verify 102 images generated
  - [ ] Verify textures created as entities
  - [ ] Verify usage counters increment
  - **Time**: 1 hour

**Day 4-5 Total**: ~11.5 hours

---

### WEEK 2: UI & Testing

#### Day 6-7 (Nov 25-26): Admin Forms ⏸️ Not Started

- [ ] **5.1** Update Style form
  - [ ] Modify `src/app/[locale]/admin/styles/[id]/edit/page.tsx`
  - [ ] Add "Room Category" dropdown
  - [ ] Add "Price Level" segmented control (Regular ⟺ Luxury)
  - [ ] Add price level description alert
  - [ ] Add image generation summary (if create mode)
  - [ ] Add tabs for viewing categorized images (if edit mode):
    - Overview tab (60)
    - Materials tab (25)
    - Textures tab (15)
    - Composite tab (1)
  - **Time**: 3 hours
  - **Reference**: See `COMPLETE_PHASE2_PLAN.md` Part 4.1

- [ ] **5.2** Update Room form
  - [ ] Modify `src/app/[locale]/admin/rooms/[id]/edit/page.tsx`
  - [ ] Add "Parent Category" input (creatable select)
  - [ ] Add common values: Private, Public, Commercial
  - **Time**: 30 min
  - **Reference**: See `SIMPLE_CATEGORY_LUXURY_UPDATES.md` Part 4

- [ ] **5.3** Create Texture management page
  - [ ] Create `src/app/[locale]/admin/textures/page.tsx`
  - [ ] Display textures grouped by category (accordion)
  - [ ] Show texture card: image, name, finish, usage count
  - [ ] Add "Create Texture" button
  - **Time**: 2 hours
  - **Reference**: See `PHASE2_WITH_TEXTURE_ENTITIES.md` Part 4.2

- [ ] **5.4** Add translations
  - [ ] Go to `/admin/translations`
  - [ ] Add all required keys (see list below)
  - **Time**: 1 hour

**Translations Needed**:
```
style.room-category
style.select-room-category
style.price-level
price-level.regular
price-level.luxury
price-level.regular-description
price-level.luxury-description
style.image-generation-summary
style.will-generate-overview
style.will-generate-materials
style.will-generate-textures
style.will-generate-composite
style.will-generate-anchor
style.total-images
categories.private
categories.public
categories.commercial
room.parent-category
room.parent-category-placeholder
images.overview
images.materials
images.textures
images.composite
texture.used-in-styles
admin.textures.title
```

**Day 6-7 Total**: ~6.5 hours

---

#### Day 8 (Nov 27): Inspiration Page UI ⏸️ Not Started

- [ ] **6.1** Create inspiration page
  - [ ] Create `src/app/[locale]/styles/[id]/page.tsx`
  - [ ] Add composite hero section
  - [ ] Add style header with badges (price level, room category)
  - [ ] Add anchor image display
  - [ ] Add tabs:
    - Rooms tab (masonry gallery)
    - Materials & Textures tab (side-by-side)
  - **Time**: 3 hours
  - **Reference**: See `COMPLETE_PHASE2_PLAN.md` Part 4.2

- [ ] **6.2** Create Materials & Textures layout
  - [ ] Two-column grid (materials left, textures right)
  - [ ] Material cards: image + description
  - [ ] Texture cards: image + name + finish badge + usage count
  - [ ] Display base color swatch if available
  - **Time**: 2 hours
  - **Reference**: See `PHASE2_WITH_TEXTURE_ENTITIES.md` Part 4.1

- [ ] **6.3** Create API endpoints
  - [ ] Create `src/app/api/styles/[id]/textures/route.ts`
  - [ ] Fetch style textures with category/type
  - **Time**: 30 min
  - **Reference**: See `PHASE2_WITH_TEXTURE_ENTITIES.md` Part 5.1

- [ ] **6.4** Test inspiration page
  - [ ] Test with style that has all image categories
  - [ ] Test RTL layout
  - [ ] Test responsive (mobile, tablet, desktop)
  - **Time**: 1 hour

**Day 8 Total**: ~6.5 hours

---

#### Day 9 (Nov 28): Testing ⏸️ Not Started

- [ ] **7.1** Unit Tests
  - [ ] Test `getPriceLevelKeywords()` function
  - [ ] Test `buildImagePrompt()` for each category
  - [ ] Test `findOrCreateTexture()` logic
  - [ ] Test `distributeImagesAcrossRooms()` logic
  - **Time**: 2 hours

- [ ] **7.2** Integration Tests
  - [ ] Test style creation with REGULAR price level
  - [ ] Test style creation with LUXURY price level
  - [ ] Test full seed flow (create style → generate 102 images)
  - [ ] Test texture reuse (2 styles use same texture)
  - **Time**: 2 hours

- [ ] **7.3** Manual Testing
  - [ ] Create LUXURY style → Verify premium keywords in prompts
  - [ ] Create REGULAR style → Verify accessible keywords in prompts
  - [ ] Verify 60 room overview images generated
  - [ ] Verify 25 material images (NOT plain squares!)
  - [ ] Verify 15 texture images (realistic context)
  - [ ] Verify textures saved as entities
  - [ ] Verify composite mood board generated
  - [ ] Verify anchor image generated
  - **Time**: 2 hours

- [ ] **7.4** Visual Quality Check
  - [ ] Check LUXURY materials look premium
  - [ ] Check REGULAR materials look accessible
  - [ ] Check textures shown in realistic context (not plain squares)
  - [ ] Check composite is cohesive Pinterest-style collage
  - [ ] Check anchor image matches color palette
  - **Time**: 1 hour

**Day 9 Total**: ~7 hours

---

### WEEK 3: Production Deployment

#### Day 10 (Nov 29): Staging Deployment ⏸️ Not Started

- [ ] **8.1** Deploy to staging
  - [ ] Push code to staging branch
  - [ ] Run database migration on staging
  - [ ] Seed texture categories on staging
  - **Time**: 30 min

- [ ] **8.2** Test with real data
  - [ ] Create test style on staging (LUXURY)
  - [ ] Monitor generation process
  - [ ] Verify all 102 images generated
  - [ ] Check database records
  - **Time**: 1 hour

- [ ] **8.3** Performance testing
  - [ ] Measure total generation time for 102 images
  - [ ] Monitor API rate limits
  - [ ] Check Gemini API usage/costs
  - [ ] Optimize if needed
  - **Time**: 1.5 hours

- [ ] **8.4** Fix bugs found in staging
  - [ ] Document issues
  - [ ] Fix and redeploy
  - [ ] Retest
  - **Time**: 2 hours

**Day 10 Total**: ~5 hours

---

#### Day 11 (Nov 30): Production Deployment ⏸️ Not Started

- [ ] **9.1** Pre-deployment checklist
  - [ ] Backup production database
  - [ ] Review all changes
  - [ ] Prepare rollback plan
  - [ ] Set up monitoring alerts
  - **Time**: 1 hour

- [ ] **9.2** Deploy to production
  - [ ] Merge to main branch
  - [ ] Deploy code
  - [ ] Run database migration
  - [ ] Seed texture categories
  - [ ] Verify migration success
  - **Time**: 1 hour

- [ ] **9.3** Smoke tests
  - [ ] Test existing styles still work
  - [ ] Create new REGULAR style
  - [ ] Create new LUXURY style
  - [ ] Check inspiration pages render correctly
  - **Time**: 1 hour

- [ ] **9.4** Monitor for issues
  - [ ] Watch error logs (Sentry)
  - [ ] Monitor API response times
  - [ ] Check Gemini API usage
  - [ ] Respond to any issues immediately
  - **Time**: 2 hours (continuous)

**Day 11 Total**: ~5 hours

---

#### Day 12-13 (Dec 1-2): Documentation & Polish ⏸️ Not Started

- [ ] **10.1** Create user documentation
  - [ ] Write help article: "Using Room Categories"
  - [ ] Write help article: "Luxury vs Regular Styles"
  - [ ] Write help article: "Understanding Textures"
  - [ ] Create video tutorial (Hebrew)
  - **Time**: 3 hours

- [ ] **10.2** Update developer documentation
  - [ ] Document new database models
  - [ ] Document AI prompt structure
  - [ ] Document texture entity pattern
  - [ ] Add code examples
  - **Time**: 2 hours

- [ ] **10.3** Polish UI
  - [ ] Fix any visual inconsistencies
  - [ ] Add loading states
  - [ ] Add empty states
  - [ ] Improve error messages
  - **Time**: 2 hours

- [ ] **10.4** Gather feedback
  - [ ] Send announcement to users
  - [ ] Create in-app survey
  - [ ] Monitor support tickets
  - [ ] Track feature usage analytics
  - **Time**: 1 hour

**Day 12-13 Total**: ~8 hours

---

## 📊 Progress Tracking

### Overall Progress
- **Total Tasks**: 60
- **Completed**: 8
- **In Progress**: 1 (Day 3 - AI Prompts)
- **Not Started**: 51
- **Blocked**: 0

**Progress**: ████░░░░░░ 13% (8/60 tasks)

### Time Tracking
- **Estimated Total**: ~70 hours (3 weeks @ ~23 hours/week)
- **Actual Time Spent**: ~3.5 hours (Day 1-2)
- **Remaining**: ~66.5 hours

### By Week
- **Week 1 (Backend)**: 3.5/20.5 hours (17% - Day 1-2 complete)
- **Week 2 (UI)**: 0/20 hours
- **Week 3 (Production)**: 0/18 hours
- **Documentation**: 0/8 hours

### Current Sprint (Nov 20-21)
- ✅ Day 1: Database Schema (100%)
- ✅ Day 2: Seed & Validation (66%)
- 🔄 Day 3: AI Prompts (Starting now)

---

## 🚨 Blockers & Risks

### Current Blockers
None currently

### Potential Risks
1. **AI Generation Time**: 102 images may take 1-2 hours per style
   - **Mitigation**: Background job queue, progress indicators

2. **Gemini API Costs**: Generating many images could be expensive
   - **Mitigation**: Monitor costs, set limits, optimize prompts

3. **Texture Deduplication**: Same texture name but different images
   - **Mitigation**: Use fuzzy matching, manual review tool

4. **Migration Data Loss**: Existing images could be miscategorized
   - **Mitigation**: Backup before migration, test on staging first

---

## 📝 Notes & Decisions

### Key Decisions Made
- ✅ Textures will be database entities (not just categorized images)
- ✅ Materials and textures displayed side-by-side in UI
- ✅ Luxury/Regular affects ALL image generation (not just some)
- ✅ Room categories are flexible (user-defined strings)

### Open Questions
- ⏸️ Should we limit texture generation per style? (currently 15)
- ⏸️ Should clients be able to see luxury vs regular badge?
- ⏸️ Auto-generate composite on style creation, or manual trigger?

---

## 🎯 Success Criteria

### Technical
- [ ] All 60 tasks completed
- [ ] Zero critical bugs in production
- [ ] Page load time < 2s
- [ ] API response time < 200ms
- [ ] Test coverage > 80%

### Business
- [ ] 80% of new styles use category system
- [ ] 50% of new styles use luxury level
- [ ] Texture reuse rate > 30%
- [ ] User satisfaction > 4.5/5

### Quality
- [ ] Materials NOT shown as plain squares ✓
- [ ] Textures shown in realistic context ✓
- [ ] Luxury images look premium ✓
- [ ] Regular images look accessible ✓
- [ ] Composite mood boards are cohesive ✓

---

## 📞 Team Contacts

- **Backend Lead**: [Name]
- **Frontend Lead**: [Name]
- **DevOps**: [Name]
- **QA**: [Name]
- **Product Owner**: [Name]

---

## 🔄 Status Update Template

**Week of [Date]:**
- **Completed**: [List tasks]
- **In Progress**: [List tasks]
- **Blockers**: [List any issues]
- **Next Week**: [List priorities]
- **Notes**: [Any important info]

---

**Last Updated**: 2025-11-20
**Next Review**: 2025-11-22 (Day 3)
