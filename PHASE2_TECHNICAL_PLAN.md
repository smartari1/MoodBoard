# Phase 2 Technical Plan: Deep Inspiration & Spatial Consistency

## 1. Overview & Objectives

The goal of Phase 2 is to transform the system from a simple "Style Manager" into a deep "Inspiration Engine."
Key shifts:
1.  **Structured Storytelling:** Strict separation between "Website Info" (Part A) and "Executive Summary" (Part B).
2.  **Spatial Consistency:** Generating 4 specific views (N/S/E/W) for each room using context chaining.
3.  **Visual Hierarchy:** "The Golden 6 Scenes" with specific complementary colors.
4.  **Asset Granularity:** Specific handling of Materials (Textures) and Colors (Swatches) vs. Room Scenes.
5.  **Price Tiering:** Distinct logic for "Luxury" (יוקרתי) vs. "Affordable" (עממי) aesthetics.
6.  **Robust Architecture:** "Lazy Creation" pattern to handle massive asset generation without crashes.

---

## 2. Database Schema Changes (Prisma)

We are moving from simple arrays (`String[]`) to structured Composite Types to hold metadata (prompt, angle, type).

### 2.1. Enums & Flags
Add support for the price tier and asset status.

```prisma
enum PriceTier {
  AFFORDABLE // עממי - Accessible, standard materials, cost-effective
  LUXURY     // יוקרתי - High-end, custom joinery, expensive materials
}

enum GenerationStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}
```

### 2.2. Style Entity Updates
Refining the Style model to hold the global gallery and tier.

```prisma
model Style {
  // ... existing fields ...
  
  priceTier   PriceTier @default(AFFORDABLE) // New field
  
  // REPLACES 'images String[]'
  // Holds the "Golden 6" scenes + references to materials/colors
  gallery     StyleGalleryItem[] 
  
  // ... existing relations ...
}

type StyleGalleryItem {
  id                 String   @default(uuid())
  url                String
  type               String   // 'scene', 'material', 'color'
  
  // For Scenes (The Golden 6)
  sceneName          String?  // 'entry', 'living', 'dining', 'kitchen', 'master_bed', 'bath'
  complementaryColor String?  // HEX or Name of the specific accent used
  
  // For Materials/Colors
  linkedAssetId      String?  @db.ObjectId // Ref to Material/Color ID
  
  // Metadata
  prompt             String?  // Important for re-generation or debugging
  createdAt          DateTime @default(now())
}
```

### 2.3. Detailed Content Updates
Structure the text generation to match the "Gold Instructions".

```prisma
type DetailedContent {
  // ... existing fields ...

  // New structural fields
  executiveSummary  String?   // Part B: strict summary format
  
  // Raw lists from AI (used to seed the asset generators)
  requiredMaterials String[]  // List of 25 materials to generate
  requiredColors    String[]  // List of 15 colors to generate
}
```

### 2.4. Room Profile Updates (The 4 Walls)
Transforming `RoomProfile` to hold spatial views.

```prisma
type RoomProfile {
  // ... existing fields ...

  // REPLACES 'images String[]'
  views    RoomView[]
}

type RoomView {
  id           String           @default(uuid())
  url          String?          // Can be null if status is PENDING
  orientation  String           // 'main', 'opposite', 'left', 'right'
  prompt       String?
  status       GenerationStatus @default(PENDING)
  createdAt    DateTime         @default(now())
}
```

### 2.5. Material & Color Entities (Stubbing)
Allow creating "Concept" materials that aren't real products yet.

```prisma
model Material {
  // ... existing fields ...
  
  // Make strict product fields optional for AI concepts
  sku             String? // Now optional (or use auto-generated ID)
  
  isAbstract      Boolean @default(false)
  generationStatus GenerationStatus @default(COMPLETED)
  
  // Context for image generation worker
  aiDescription   String? // "Rough oak texture with warm undertones"
}

// Same logic applies to model Color
```

---

## 3. The Engine Logic (Seed Service)

The seeding process will be broken down into distinct "Acts".

### Act 1: The Script (Text & Metadata)
*   **Input:** Style Name + `PriceTier`.
*   **Action:** Call Gemini with a strictly formatted prompt.
    *   *Luxury Mode:* Inject keywords: "Exclusive, High-end, Custom-made, Sophisticated, Precious materials".
    *   *Affordable Mode:* Inject keywords: "Accessible, Functional, Smart solutions, Standard materials, Cost-effective".
*   **Output:** JSON containing Part A, Part B, Material List, Color List.
*   **Save:** Update `Style` entity with text content.

### Act 2: The Asset Prep (Find or Stub)
*   **Action:** Iterate through the AI's `Material List` and `Color List`.
*   **Logic:**
    1.  Search DB for fuzzy match.
    2.  If found -> Add to `Style.gallery` (type: 'material').
    3.  If not found -> Create `Material` record with `isAbstract=true` and `status=PENDING`. Add to `Style.gallery`.
*   *Note:* This step is fast (database only). Image generation for these happens in Act 4 or Background Worker.

### Act 3: The Golden Scenes (Visuals Phase A)
*   **Action:** Loop through the 6 predefined "Golden Scenes" (Entry, Living, Dining, Kitchen, Bed, Bath).
*   **Aspect Ratio Strategy:**
    *   The "20 basic images" (Golden Scenes + general variations) MUST have **different aspect ratios** per image (e.g., 16:9, 4:3, 1:1, 9:16).
    *   Randomize or assign specific aspect ratios to each scene type (e.g., Entry=Vertical, Living=Horizontal).
*   **Config:** Load specific `ComplementaryColor` for each scene (e.g., Living = Bordeaux, Kitchen = Bottle Green).
*   **Generate:** Call Imagen/Gemini with specific aspect ratio config.
*   **Save:** Push to `Style.gallery` (type: 'scene').

### Act 4: The Spatial Walkthrough (Visuals Phase B - Deep Dive)
*   **Context:** This process takes time. Must save after *every single image* to prevent data loss.
*   **Aspect Ratio:** **STRICT** aspect ratio (e.g., 4:3 or 16:9) for all room views to ensure consistency in the viewer.
*   **Loop:** For each `RoomType` in the style:
    1.  **View 1 (Main):** Generate normally using Style + Room prompt.
    2.  **View 2 (Opposite):** Generate using "Opposite view of [View 1 description]...". **Must use Image-to-Image or consistent seed if available.**
    3.  **View 3/4 (Sides):** Continue the chain.
    4.  **Save:** Update `RoomProfile.views` immediately.

---

## 4. Migration Strategy

How to handle existing data without wiping the DB:

1.  **Backup:** Export current DB.
2.  **Schema Push:** Apply the new Prisma schema.
3.  **Migration Script (`scripts/migrate-phase2.ts`):**
    *   Iterate all existing Styles.
    *   Set default `priceTier = AFFORDABLE`.
    *   Convert `Style.images` (String[]) -> `Style.gallery` (Item[] with type='scene', default orientation).
    *   Convert `RoomProfile.images` (String[]) -> `RoomProfile.views` (Item[] with type='main' for the first, 'other' for rest).
    *   Initialize empty `executiveSummary` (to be filled by re-running text gen if needed).

---

## 5. UI Implications

### 5.1. Admin Dashboard
*   **Style Editor:** Add toggle for "Luxury/Affordable".
*   **Status Indicators:** Show progress bars for room generation (e.g., "Living Room: 1/4 views ready").
*   **Gallery Manager:** New component to separate Scenes vs. Materials vs. Colors.

### 5.2. Frontend (Client)
*   **Inspiration Page:**
    *   Display the "Golden 6" prominently.
    *   "Material Board" section (fetching from `gallery` where type='material').
    *   "Color Palette" section.
*   **Room Viewer:**
    *   New UI component: "360 Feel" (Simple carousel or grid of the 4 walls).
    *   Labels: "View 1", "Opposite View", etc.

---

## 6. Execution Steps

1.  **Update Prisma Schema:** Apply changes from Section 2.
2.  **Run Migration:** Ensure existing data fits new structure.
3.  **Update Types/Interfaces:** Fix TypeScript errors in frontend/backend.
4.  **Refactor `gemini.ts`:** Update prompts for Tiering + JSON structure.
5.  **Refactor `image-generation.ts`:** Add logic for spatial context prompts.
6.  **Update `seed-service.ts`:** Implement the 4-Act structure.
7.  **Test:** Run a single style generation in "Luxury" mode.

