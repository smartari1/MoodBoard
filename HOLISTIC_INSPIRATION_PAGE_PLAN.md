# Holistic Inspiration Page: Technical Implementation Plan

## Executive Summary

This document outlines the technical implementation plan for transitioning MoodB's inspiration system from a **"room-centric"** approach to a **"holistic house"** approach. Instead of creating separate inspiration pages for each room, the system will now generate a single comprehensive inspiration page per project/house, containing all rooms, materials, textures, and AI-generated composite imagery.

**Key Source**: `/Memory/fixs-phase-2.md`

---

## Table of Contents

1. [Core Requirements](#core-requirements)
2. [Architecture Changes](#architecture-changes)
3. [Database Schema](#database-schema)
4. [API Design](#api-design)
5. [Component Architecture](#component-architecture)
6. [AI Integration](#ai-integration)
7. [Migration Strategy](#migration-strategy)
8. [Security & Authorization](#security--authorization)
9. [Performance Optimization](#performance-optimization)
10. [Testing Strategy](#testing-strategy)
11. [Localization](#localization)
12. [Rollout Plan](#rollout-plan)

---

## Core Requirements

### 1. Structural Change

**Before**: Individual inspiration page per room (e.g., `/project/123/room/living-room/inspiration`)
**After**: Single holistic inspiration page per project (e.g., `/project/123/inspiration`)

### 2. Image Categories & Quantities

| Category | Quantity | Description | Scope |
|----------|----------|-------------|-------|
| **Room Overview** | ~60 images | Covers all ~24 rooms in the house | Project-level |
| **Room Detail** | 3-5 per room | Detailed view of specific room | Room-specific |
| **Materials** | 25 images | Physical elements (flooring, tiles, handles, wood) | Project-level |
| **Textures** | 15 images | Surface characteristics (matte, glossy, colors) | Project-level |
| **Composite Mood Board** | 1 image | AI-generated Pinterest-style collage | Generated |
| **Anchor Image** | 1 image | Fruit on colors matching the page palette | Generated |

**Total**: ~100+ images per project inspiration page

### 3. Room Categorization System

**Hierarchy**: Super Category → Sub Category → Room Type

#### Super Categories
- **PRIVATE (פרטי)**: Residential spaces
- **PUBLIC (ציבורי)**: Commercial/institutional spaces

#### Sub Categories (Examples)
- **Private**: Regular House (בית רגיל), Villa (וילה), Apartment (דירה)
- **Public**: Synagogue (בית כנסת), Kindergarten (גן ילדים), Office (משרד), Clinic (מרפאה), Restaurant (מסעדה)

#### Business Rules
- **Main house rooms** (Living, Kitchen, Bedroom, Bathroom) get **full inspiration boards**
- **Public spaces** get **representative examples only** (configurable)
- Admin can override per room type
- Textures should be positioned near materials in the layout
- Can have many textures per inspiration page

### 4. Display Requirements

- **Materials & Textures**: NOT displayed as plain color squares, but as **mood board images** (e.g., fabric draping, wood pieces, realistic atmosphere shots)
- **Textures positioned near materials** in the layout
- **Composite Image**: Pinterest-style collage aggregating all choices to show the design language (helps 20% of designers) - **Awaiting example from user**
- **Anchor Image**: Fruit image on various colors matching the inspiration page palette

---

## Architecture Changes

### High-Level Flow

```
Project
  ↓
Inspiration Page (1 per project)
  ├── Composite Mood Board Image (AI-generated)
  ├── Anchor Fruit Image (AI-generated)
  ├── Room Overview Gallery (60 images)
  ├── Materials Gallery (25 images)
  ├── Textures Gallery (15 images - positioned near materials)
  └── Room Details
        └── Room 1 (3-5 detail images)
        └── Room 2 (3-5 detail images)
        └── ...
```

### Page Structure

#### Main Page: `/project/[id]/inspiration`
- **Hero Section**: Composite mood board image
- **Anchor Section**: Fruit image with color palette
- **Tabs/Sections**:
  1. Room Overview Gallery (~60 images covering all ~24 rooms)
  2. Materials & Elements (25 images + associated textures nearby)
  3. Colors & Textures (15 images, mood board style)
  4. Room Details (cards with drill-down)

#### Room Detail Page: `/project/[id]/inspiration/room/[roomId]`
- Room name and metadata
- 3-5 dedicated detail images
- Relevant materials/textures for this room
- Back to overview button

---

## Database Schema

### New Enums

```prisma
enum ImageCategory {
  ROOM_OVERVIEW     // ~60 images covering all rooms
  ROOM_DETAIL       // 3-5 images per room (drill-down)
  MATERIAL          // 25 physical material images
  TEXTURE           // 15 surface/color images
  COMPOSITE_MOODBOARD // 1 AI-generated composite
  ANCHOR            // 1 AI-generated fruit anchor
}

enum RoomSuperCategory {
  PRIVATE   // פרטי - Residential
  PUBLIC    // ציבורי - Commercial/Institutional
}
```

### New Tables

```prisma
model RoomSubCategory {
  id            String             @id @default(cuid())
  name          String             // Hebrew name
  nameEn        String?            // English name
  superCategory RoomSuperCategory  // PRIVATE or PUBLIC
  isActive      Boolean            @default(true)
  displayOrder  Int                @default(0)
  description   String?            // Optional description

  rooms         Room[]

  createdAt     DateTime           @default(now())
  updatedAt     DateTime           @updatedAt

  @@unique([superCategory, name])
  @@index([superCategory, isActive])
  @@index([displayOrder])
}

model InspirationPage {
  id                  String    @id @default(cuid())
  projectId           String    @unique
  project             Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)

  compositeImageUrl   String?   // AI-generated composite mood board
  anchorImageUrl      String?   // AI-generated fruit anchor

  generatedAt         DateTime?
  generationStatus    String?   // 'pending', 'processing', 'completed', 'failed'
  generationError     String?   // Error message if failed

  // Metadata for AI generation
  lastGenerationParams Json?    // Store parameters used for generation

  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  @@index([projectId])
  @@index([generationStatus])
}
```

### Modified Tables

```prisma
model Room {
  id                      String             @id @default(cuid())
  // ... existing fields ...

  // NEW FIELDS
  superCategory           RoomSuperCategory  @default(PRIVATE)
  subCategoryId           String?
  subCategory             RoomSubCategory?   @relation(fields: [subCategoryId], references: [id], onDelete: SetNull)
  inspirationPageEnabled  Boolean            @default(true)  // Controls if room gets detailed board

  // ... existing relations ...

  @@index([projectId, superCategory])
  @@index([superCategory, subCategoryId])
  @@index([inspirationPageEnabled])
}

model StyleImage {
  id              String          @id @default(cuid())
  url             String
  // ... existing fields ...

  // NEW FIELDS
  imageCategory   ImageCategory   @default(ROOM_OVERVIEW)
  displayOrder    Int             @default(0)  // Order within category

  // Metadata for better organization
  tags            String[]        @default([])
  description     String?         // Optional description for materials/textures

  // ... existing relations ...

  @@index([styleId, imageCategory, displayOrder])
  @@index([roomId, imageCategory, displayOrder])
  @@index([projectId, imageCategory])
}
```

### Migration Considerations

- Add `imageCategory` as **optional** initially, backfill with migration script
- Keep existing `roomId` relationships intact
- `inspirationPageEnabled` defaults to `true` for main rooms (living, kitchen, bedroom, bathroom)
- Create default sub-categories during migration

---

## API Design

### Inspiration Page APIs

#### `GET /api/projects/[id]/inspiration`
**Purpose**: Fetch full inspiration page data

**Query Parameters**:
- `includeImages`: boolean (default: true) - Include image arrays
- `includeRooms`: boolean (default: true) - Include room list

**Response**:
```typescript
{
  inspirationPage: {
    id: string
    compositeImageUrl: string | null
    anchorImageUrl: string | null
    generatedAt: Date | null
    generationStatus: 'pending' | 'processing' | 'completed' | 'failed' | null
  }
  images: {
    roomOverview: Image[]      // Max 60
    materials: Image[]         // Max 25
    textures: Image[]          // Max 15
  }
  rooms: {
    id: string
    name: string
    type: string
    superCategory: 'PRIVATE' | 'PUBLIC'
    subCategory: string | null
    imageCount: number          // Count of ROOM_DETAIL images
    thumbnail: string | null
    inspirationPageEnabled: boolean
  }[]
  stats: {
    totalImages: number
    totalRooms: number
    roomsWithDetails: number
  }
}
```

**Authorization**: Project member only
**Caching**: 5 minutes for project data

---

#### `POST /api/projects/[id]/inspiration/generate-composite`
**Purpose**: Trigger AI generation of composite mood board

**Request**:
```typescript
{
  includeRoomOverview: boolean    // Include overview images (default: true)
  includeMaterials: boolean        // Include materials (default: true)
  includeTextures: boolean         // Include textures (default: true)
  style?: 'pinterest-collage' | 'grid' | 'organic'  // Layout style
  maxImages?: number               // Limit images used (default: all)
}
```

**Response**:
```typescript
{
  jobId: string
  status: 'queued' | 'processing'
  estimatedTime: number  // seconds
  message: string
}
```

**Authorization**: Project owner or manager
**Rate Limit**: 5 requests per hour per project, 50 per day per organization

---

#### `GET /api/projects/[id]/inspiration/generation-status`
**Purpose**: Poll status of composite generation

**Response**:
```typescript
{
  jobId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress?: number       // 0-100
  imageUrl?: string       // Available when completed
  error?: string          // Available when failed
  createdAt: Date
  completedAt?: Date
}
```

---

#### `POST /api/projects/[id]/inspiration/generate-anchor`
**Purpose**: Generate fruit anchor image based on color palette

**Request**:
```typescript
{
  colorPalette?: string[]  // Array of hex colors (auto-extracted if not provided)
  fruitType?: string       // Optional: specific fruit ('apple', 'orange', 'pomegranate')
  style?: string           // Optional: 'realistic', 'artistic', 'minimal'
}
```

**Response**:
```typescript
{
  imageUrl: string
  generatedAt: Date
  colorsUsed: string[]
}
```

**Authorization**: Project owner or manager
**Rate Limit**: 10 requests per hour per project

---

#### `GET /api/projects/[id]/inspiration/room/[roomId]`
**Purpose**: Fetch specific room detail view

**Response**:
```typescript
{
  room: {
    id: string
    name: string
    type: string
    superCategory: 'PRIVATE' | 'PUBLIC'
    subCategory: {
      id: string
      name: string
      nameEn: string
    } | null
    inspirationPageEnabled: boolean
  }
  images: Image[]           // 3-5 ROOM_DETAIL images
  materials: Image[]        // Relevant materials (tagged or associated)
  textures: Image[]         // Relevant textures
  adjacentRooms: {          // For navigation
    id: string
    name: string
    thumbnail: string
  }[]
}
```

**Authorization**: Project member

---

### Image Management APIs

#### `POST /api/images/upload`
**Purpose**: Upload image with category assignment

**Request** (multipart/form-data):
```typescript
{
  file: File
  entityType: 'project' | 'room' | 'style'
  entityId: string
  imageCategory: ImageCategory
  displayOrder?: number
  description?: string      // For materials/textures
  tags?: string[]          // For better organization
}
```

**Validation**:
- Max file size: 10MB
- Allowed types: image/jpeg, image/png, image/webp
- Enforce category limits (60 overview, 25 materials, 15 textures)

**Response**:
```typescript
{
  id: string
  url: string
  imageCategory: ImageCategory
  displayOrder: number
  createdAt: Date
}
```

---

#### `PUT /api/images/bulk-categorize`
**Purpose**: Update image category for multiple images (bulk operation)

**Request**:
```typescript
{
  imageIds: string[]
  imageCategory: ImageCategory
  resetDisplayOrder?: boolean  // Recalculate order (default: false)
}
```

**Response**:
```typescript
{
  updated: number
  images: Image[]
  errors?: { imageId: string, error: string }[]
}
```

**Authorization**: Project member with edit permissions

---

#### `PUT /api/images/reorder`
**Purpose**: Update display order within category (drag-and-drop)

**Request**:
```typescript
{
  imageId: string
  newOrder: number
  imageCategory: ImageCategory
  projectId: string
}
```

**Logic**: Automatically shifts other images to maintain sequential order

---

### Admin APIs

#### `GET /api/admin/room-categories`
**Purpose**: List all super/sub categories

**Query Parameters**:
- `superCategory`: Filter by PRIVATE or PUBLIC
- `includeStats`: Include usage statistics

**Response**:
```typescript
{
  categories: {
    private: {
      superCategory: 'PRIVATE'
      subCategories: SubCategory[]
    }
    public: {
      superCategory: 'PUBLIC'
      subCategories: SubCategory[]
    }
  }
  stats?: {
    totalRooms: number
    roomsBySuperCategory: Record<string, number>
    roomsBySubCategory: Record<string, number>
  }
}
```

**Authorization**: Organization admin

---

#### `POST /api/admin/room-categories`
**Purpose**: Create new sub-category

**Request**:
```typescript
{
  name: string               // Hebrew name (required)
  nameEn: string             // English name (required)
  superCategory: 'PRIVATE' | 'PUBLIC'
  description?: string
  displayOrder?: number
}
```

**Validation**:
- Unique name within superCategory
- Name must not be empty
- NameEn must not be empty

**Response**:
```typescript
{
  id: string
  name: string
  nameEn: string
  superCategory: string
  displayOrder: number
  createdAt: Date
}
```

---

#### `PUT /api/admin/room-categories/[id]`
**Purpose**: Update sub-category

**Request**:
```typescript
{
  name?: string
  nameEn?: string
  description?: string
  displayOrder?: number
  isActive?: boolean
}
```

---

#### `GET /api/admin/room-types`
**Purpose**: List all room types with category info and inspiration board status

**Response**:
```typescript
{
  roomTypes: {
    id: string
    name: string
    type: string
    superCategory: 'PRIVATE' | 'PUBLIC'
    subCategory: {
      id: string
      name: string
    } | null
    inspirationPageEnabled: boolean
    usageCount: number        // How many projects use this room type
    avgImageCount: number     // Average ROOM_DETAIL images
  }[]
}
```

---

## Component Architecture

### Directory Structure

```
src/components/features/inspiration-page/
├── InspirationPageViewer.tsx          # Main container component
├── sections/
│   ├── CompositeImageSection.tsx      # AI composite display (hero)
│   ├── AnchorImageSection.tsx         # Fruit anchor display
│   ├── RoomOverviewSection.tsx        # Overview gallery section
│   ├── MaterialsSection.tsx           # Materials gallery
│   └── TexturesSection.tsx            # Textures gallery
├── galleries/
│   ├── ImageCategoryGallery.tsx       # Reusable gallery component
│   ├── MasonryGallery.tsx             # Masonry layout for mood board feel
│   └── GridGallery.tsx                # Standard grid layout
├── room/
│   ├── RoomCardGrid.tsx               # Room cards with drill-down
│   ├── RoomCard.tsx                   # Individual room card
│   └── RoomDetailView.tsx             # Full room detail page
├── generation/
│   ├── GenerateCompositeButton.tsx    # AI generation trigger
│   ├── GenerationProgress.tsx         # Progress indicator
│   └── GenerationModal.tsx            # Settings modal
├── admin/
│   ├── ImageCategorySelector.tsx      # Bulk categorization tool
│   ├── RoomCategoryManager.tsx        # Category management UI
│   └── InspirationPageSettings.tsx    # Configure room boards
└── shared/
    ├── ImagePreview.tsx               # Full-screen image preview
    ├── CategoryBadge.tsx              # Visual category indicator
    └── ImageUploadZone.tsx            # Upload with category selection
```

### Key Components

#### `InspirationPageViewer`
**Purpose**: Main holistic view container

**Props**:
```typescript
interface InspirationPageViewerProps {
  projectId: string
  initialData?: InspirationPageData
  editable?: boolean
  onImageUpload?: (category: ImageCategory, files: File[]) => void
}
```

**Features**:
- Tabs/sections for different image categories
- Lazy loading for galleries below the fold
- Real-time updates when images added (WebSocket or polling)
- Generate composite button (if permissions)
- Responsive layout (mobile, tablet, desktop)
- RTL support

**State Management**:
```typescript
const {
  data: inspirationData,
  isLoading,
  refetch,
} = useInspirationPage(projectId)

const [activeSection, setActiveSection] = useState<'overview' | 'materials' | 'textures' | 'rooms'>('overview')
const [selectedImage, setSelectedImage] = useState<string | null>(null)
```

---

#### `ImageCategoryGallery`
**Purpose**: Reusable image gallery with filtering and editing

**Props**:
```typescript
interface ImageCategoryGalleryProps {
  images: Image[]
  category: ImageCategory
  maxImages?: number
  layout?: 'grid' | 'masonry'
  onUpload?: (files: File[]) => void
  onReorder?: (imageId: string, newOrder: number) => void
  onDelete?: (imageId: string) => void
  editable?: boolean
  emptyState?: React.ReactNode
}
```

**Features**:
- Masonry layout for mood board feel (materials/textures)
- Grid layout for room images
- Drag-and-drop reordering (if editable)
- Click to preview full size
- Upload zone (if editable)
- Display order indicators
- Image count badge with limit warning
- Hover tooltips for materials/textures (show description)

**Optimization**:
- Virtualized scrolling for large galleries
- Lazy load images with blur placeholder
- Progressive image loading

---

#### `RoomCardGrid`
**Purpose**: Grid of room cards for navigation to detail views

**Props**:
```typescript
interface RoomCardGridProps {
  rooms: RoomSummary[]
  onRoomClick: (roomId: string) => void
  layout?: 'grid' | 'list'
  filterBy?: {
    superCategory?: RoomSuperCategory
    subCategory?: string
    hasDetails?: boolean
  }
}
```

**Features**:
- Card shows: thumbnail, name, type, image count, category badge
- Hover effect with image preview
- Badge for super/sub category
- Disabled state if no detail images (`imageCount === 0`)
- Filter controls (by category, with/without details)
- Sort options (by name, type, image count)

---

#### `CompositeImageSection`
**Purpose**: Display and manage AI-generated composite mood board

**Props**:
```typescript
interface CompositeImageSectionProps {
  compositeImageUrl?: string
  generationStatus?: GenerationStatus
  onGenerate: (params: GenerateParams) => void
  onRegenerate: () => void
  canGenerate: boolean
  projectId: string
}
```

**Features**:
- Hero-style display (full width, aspect ratio preserved)
- Generate/Regenerate button
- Progress indicator during generation with estimated time
- Error handling with retry button
- Download button (save to device)
- Share button (copy link, export)
- Settings cogwheel (open generation options)
- Fallback placeholder if not generated

**States**:
- `null`: Not generated yet (show placeholder + generate button)
- `pending/processing`: Show progress spinner + cancel button
- `completed`: Show image + regenerate button
- `failed`: Show error message + retry button

---

#### `GenerateCompositeButton`
**Purpose**: Trigger AI composite generation with options

**Props**:
```typescript
interface GenerateCompositeButtonProps {
  projectId: string
  onSuccess: (imageUrl: string) => void
  onError: (error: string) => void
  disabled?: boolean
  variant?: 'button' | 'card'
}
```

**Flow**:
1. User clicks button
2. Opens modal with options:
   - Toggle: Include room overview images
   - Toggle: Include materials
   - Toggle: Include textures
   - Style selector: Pinterest / Grid / Organic
   - Preview: Shows how many images will be used
3. User confirms
4. API call → Job created
5. Modal shows progress (polls status every 2s)
6. On completion: Close modal, refresh page, show success toast
7. On error: Show error message with retry button

**Rate Limiting**:
- Show remaining requests in UI
- Disable button if limit reached
- Show countdown timer if temporarily blocked

---

#### `RoomDetailView`
**Purpose**: Full-page view of single room with detail images

**Route**: `/project/[projectId]/inspiration/room/[roomId]`

**Features**:
- Room name and metadata (type, category)
- Large gallery of 3-5 detail images (hero carousel)
- Associated materials section (linked or tagged)
- Associated textures section
- Navigation: Previous/Next room buttons
- Back to overview button
- Share button (copy link to this room)
- Edit button (if permissions) → Upload more images

**Layout**:
```
[Back to Overview]                    [Edit]

Room Name (Type - Category)

[Large Image Carousel - 3-5 images]

Materials in This Room
[Material thumbnails with names]

Colors & Textures
[Texture thumbnails]

[← Previous Room]  [Next Room →]
```

---

### Component Modifications

#### `ImageUpload` Component
**Changes**:
- Add `imageCategory?: ImageCategory` prop
- Add `maxImages?: number` prop (enforces category limits)
- Pass category to upload API
- Show category badge on uploaded images
- Validate against limits before upload
- Show warning if approaching limit (e.g., "58/60 images")

```typescript
<ImageUpload
  value={images}
  onChange={setImages}
  imageCategory="ROOM_OVERVIEW"
  maxImages={60}
  entityType="project"
  entityId={projectId}
  onError={(error) => toast.error(error)}
/>
```

#### `ProjectSidebar` Component
**Changes**:
- Update navigation item: "Inspiration" (השראה) links to holistic page
- Remove individual room inspiration links
- Add badge/indicator if composite exists (✓ or color dot)
- Show image count per category as sub-items

#### `RoomForm` Component
**Changes**:
- Add super category selector (Private/Public)
- Add sub category dropdown (filtered by super category)
- Add "Enable Inspiration Board" toggle with tooltip explanation
- Show explanation: "Rooms with inspiration enabled get detailed 3-5 image views"
- Validation: Main rooms (living, kitchen, bedroom, bathroom) should default to enabled

---

## AI Integration

### Composite Mood Board Generation

**Service**: Gemini AI (existing integration at `src/lib/ai/gemini.ts`)
**Model**: Use vision-capable model for image understanding

**Input**:
- Array of image URLs (rooms, materials, textures)
- Style preference (pinterest-collage, grid, organic)
- Project metadata (name, style)

**Output**: Single Pinterest-style collage image

**Process**:
1. User triggers generation via button
2. API validates permissions and rate limits
3. API creates background job in queue (Inngest or SQS)
4. Job worker:
   a. Fetches all relevant images from categories
   b. Downloads images (or passes URLs if Gemini supports)
   c. Constructs prompt with instructions
   d. Calls Gemini AI API
   e. Uploads result to R2 bucket
   f. Updates `InspirationPage` record
   g. Sends webhook/notification to client (or client polls)
5. Client receives URL and displays image

**Prompt Template** (⚠️ To be refined with user example):
```
Create a cohesive Pinterest-style mood board collage that combines the following interior design images into a single aesthetic composition.

REQUIREMENTS:
- Seamlessly blend all images with artistic transitions
- Maintain visual balance and harmony across the composition
- Represent the overall design language of the space
- Include room images, materials, and textures in an appealing layout
- Use varied image sizes and orientations for visual interest
- Add subtle borders, shadows, or overlays for depth
- Size: 1920x1080px landscape format
- Style: {{style}} (pinterest-collage / grid / organic)

PROJECT CONTEXT:
- Project Name: {{projectName}}
- Style: {{styleName}}
- Color Palette: {{colorPalette}}

IMAGES TO COMBINE ({{imageCount}} total):
Room Overview Images ({{roomOverviewCount}}):
{{roomOverviewUrls}}

Material Images ({{materialCount}}):
{{materialUrls}}

Texture/Color Images ({{textureCount}}):
{{textureUrls}}

OUTPUT: A single high-quality composite image that a designer can show to a client to communicate the overall aesthetic vision.
```

**Queue System**:
- **Recommended**: Inngest (already used in project)
- **Timeout**: 5 minutes
- **Retry**: 2 attempts on failure with exponential backoff
- **Status tracking**: Store in `InspirationPage.generationStatus`
- **Progress updates**: Emit events for real-time UI updates

**Error Handling**:
- Rate limit errors → User-friendly message with retry time
- AI API errors → Log to Sentry, show generic error to user
- Timeout → Cancel job, allow retry
- Invalid images → Filter out and continue with valid ones

---

### Anchor Fruit Image Generation

**Service**: Gemini AI (image generation)
**Input**: Color palette (array of hex colors)
**Output**: Artistic fruit image on color backgrounds

**Process**:
1. Extract dominant colors from inspiration page images (if not provided)
   - Use client-side library (e.g., `node-vibrant`) or server-side
   - Extract 5-8 dominant colors
2. User triggers generation (or auto-generate on first page view)
3. Prompt Gemini with color palette
4. Upload result to R2 bucket
5. Store in `InspirationPage.anchorImageUrl`

**Prompt Template**:
```
Create an artistic still-life photograph of fresh, appealing fruit displayed on a surface with the following color palette incorporated into the background, lighting, or surface.

COLOR PALETTE:
{{colors}}  (e.g., #df2538, #f7f7ed, #8B4513, ...)

REQUIREMENTS:
- Feature vibrant, appetizing fruit (e.g., oranges, apples, pomegranates, figs)
- Incorporate the provided colors in background, lighting, surface, or accent elements
- Use natural, soft lighting with subtle shadows
- Have a luxurious, high-end aesthetic matching interior design mood boards
- Professional food photography style with artistic flair
- Composition should feel balanced and harmonious
- Size: 800x600px (landscape)
- Style: Photography-realistic with warm, inviting atmosphere

OUTPUT: A single elegant fruit image that serves as a visual anchor for the inspiration page, tying together the color palette.
```

**Color Extraction Logic**:
```typescript
async function extractColorPalette(images: string[]): Promise<string[]> {
  const palettes = await Promise.all(
    images.slice(0, 20).map(async (url) => {
      const vibrant = await Vibrant.from(url).getPalette()
      return [
        vibrant.Vibrant?.hex,
        vibrant.DarkVibrant?.hex,
        vibrant.LightVibrant?.hex,
        vibrant.Muted?.hex,
      ].filter(Boolean)
    })
  )

  // Flatten and deduplicate
  const allColors = palettes.flat()
  const uniqueColors = [...new Set(allColors)]

  // Return top 6-8 colors by frequency
  return uniqueColors.slice(0, 8)
}
```

---

## Migration Strategy

### Script: `scripts/migrate-holistic-inspiration.ts`

**Purpose**: Migrate existing room-based data to holistic inspiration page structure

#### Step 1: Create Default Sub-Categories
```typescript
const defaultSubCategories = [
  // Private categories
  { name: 'בית רגיל', nameEn: 'Regular House', superCategory: 'PRIVATE', displayOrder: 1 },
  { name: 'דירה', nameEn: 'Apartment', superCategory: 'PRIVATE', displayOrder: 2 },
  { name: 'וילה', nameEn: 'Villa', superCategory: 'PRIVATE', displayOrder: 3 },
  { name: 'פנטהאוז', nameEn: 'Penthouse', superCategory: 'PRIVATE', displayOrder: 4 },

  // Public categories
  { name: 'בית כנסת', nameEn: 'Synagogue', superCategory: 'PUBLIC', displayOrder: 1 },
  { name: 'גן ילדים', nameEn: 'Kindergarten', superCategory: 'PUBLIC', displayOrder: 2 },
  { name: 'משרד', nameEn: 'Office', superCategory: 'PUBLIC', displayOrder: 3 },
  { name: 'מרפאה', nameEn: 'Clinic', superCategory: 'PUBLIC', displayOrder: 4 },
  { name: 'מסעדה', nameEn: 'Restaurant', superCategory: 'PUBLIC', displayOrder: 5 },
  { name: 'בית מלון', nameEn: 'Hotel', superCategory: 'PUBLIC', displayOrder: 6 },
]

console.log('Creating default sub-categories...')
await prisma.roomSubCategory.createMany({
  data: defaultSubCategories,
  skipDuplicates: true
})
console.log('✓ Sub-categories created')
```

#### Step 2: Categorize Existing Rooms
```typescript
const roomTypeMapping: Record<string, {
  superCategory: RoomSuperCategory
  subCategory: string
  enabled: boolean
}> = {
  // Main rooms - full inspiration boards
  'living-room': { superCategory: 'PRIVATE', subCategory: 'בית רגיל', enabled: true },
  'kitchen': { superCategory: 'PRIVATE', subCategory: 'בית רגיל', enabled: true },
  'bedroom': { superCategory: 'PRIVATE', subCategory: 'בית רגיל', enabled: true },
  'master-bedroom': { superCategory: 'PRIVATE', subCategory: 'בית רגיל', enabled: true },
  'bathroom': { superCategory: 'PRIVATE', subCategory: 'בית רגיל', enabled: true },

  // Other private rooms
  'dining-room': { superCategory: 'PRIVATE', subCategory: 'בית רגיל', enabled: true },
  'hallway': { superCategory: 'PRIVATE', subCategory: 'בית רגיל', enabled: false },
  'closet': { superCategory: 'PRIVATE', subCategory: 'בית רגיל', enabled: false },
  'balcony': { superCategory: 'PRIVATE', subCategory: 'בית רגיל', enabled: false },

  // Public spaces - representative only
  'office': { superCategory: 'PUBLIC', subCategory: 'משרד', enabled: false },
  'clinic': { superCategory: 'PUBLIC', subCategory: 'מרפאה', enabled: false },
  'restaurant': { superCategory: 'PUBLIC', subCategory: 'מסעדה', enabled: false },
}

console.log('Updating existing rooms...')
const rooms = await prisma.room.findMany()
let updated = 0

for (const room of rooms) {
  const mapping = roomTypeMapping[room.type]
  if (mapping) {
    const subCategory = await prisma.roomSubCategory.findFirst({
      where: {
        name: mapping.subCategory,
        superCategory: mapping.superCategory
      }
    })

    await prisma.room.update({
      where: { id: room.id },
      data: {
        superCategory: mapping.superCategory,
        subCategoryId: subCategory?.id,
        inspirationPageEnabled: mapping.enabled,
      }
    })
    updated++
  }
}

console.log(`✓ Updated ${updated} rooms`)
```

#### Step 3: Categorize Existing Images
```typescript
console.log('Categorizing existing images...')

const projects = await prisma.project.findMany({
  include: {
    rooms: {
      include: { images: true }
    }
  }
})

for (const project of projects) {
  console.log(`Processing project: ${project.name}`)

  // Collect all images from all rooms
  const allImages = project.rooms.flatMap(r =>
    r.images.map(img => ({ ...img, roomId: r.id }))
  )

  console.log(`  Total images: ${allImages.length}`)

  // First 60 images → ROOM_OVERVIEW
  const overviewImages = allImages.slice(0, 60)
  if (overviewImages.length > 0) {
    await prisma.styleImage.updateMany({
      where: { id: { in: overviewImages.map(i => i.id) } },
      data: {
        imageCategory: 'ROOM_OVERVIEW',
        displayOrder: 0  // Will reindex later
      }
    })
    console.log(`  ✓ Set ${overviewImages.length} as ROOM_OVERVIEW`)
  }

  // Remaining images per room → ROOM_DETAIL
  for (const room of project.rooms) {
    const roomImages = room.images.filter(img =>
      !overviewImages.find(oi => oi.id === img.id)
    )

    if (roomImages.length > 0) {
      // Only keep up to 5 detail images per room
      const detailImages = roomImages.slice(0, 5)

      await prisma.styleImage.updateMany({
        where: { id: { in: detailImages.map(i => i.id) } },
        data: {
          imageCategory: 'ROOM_DETAIL',
          displayOrder: 0  // Will reindex later
        }
      })
      console.log(`  ✓ Set ${detailImages.length} as ROOM_DETAIL for ${room.name}`)
    }
  }
}

console.log('✓ Image categorization complete')
```

#### Step 4: Create InspirationPage Records
```typescript
console.log('Creating InspirationPage records...')

const projects = await prisma.project.findMany()
let created = 0

for (const project of projects) {
  // Check if already exists
  const existing = await prisma.inspirationPage.findUnique({
    where: { projectId: project.id }
  })

  if (!existing) {
    await prisma.inspirationPage.create({
      data: {
        projectId: project.id,
        generationStatus: 'pending',
      }
    })
    created++
  }
}

console.log(`✓ Created ${created} InspirationPage records`)
```

#### Step 5: Reindex Display Orders
```typescript
console.log('Reindexing display orders...')

const categories: ImageCategory[] = [
  'ROOM_OVERVIEW',
  'ROOM_DETAIL',
  'MATERIAL',
  'TEXTURE'
]

for (const category of categories) {
  // Group by project or room
  const images = await prisma.styleImage.findMany({
    where: { imageCategory: category },
    orderBy: { createdAt: 'asc' },
    include: { room: true }
  })

  if (category === 'ROOM_DETAIL') {
    // Group by room
    const byRoom = images.reduce((acc, img) => {
      const key = img.roomId || 'null'
      if (!acc[key]) acc[key] = []
      acc[key].push(img)
      return acc
    }, {} as Record<string, typeof images>)

    for (const [roomId, roomImages] of Object.entries(byRoom)) {
      for (let i = 0; i < roomImages.length; i++) {
        await prisma.styleImage.update({
          where: { id: roomImages[i].id },
          data: { displayOrder: i }
        })
      }
    }
  } else {
    // Global order for overview, materials, textures
    for (let i = 0; i < images.length; i++) {
      await prisma.styleImage.update({
        where: { id: images[i].id },
        data: { displayOrder: i }
      })
    }
  }

  console.log(`✓ Reindexed ${images.length} images for ${category}`)
}

console.log('✓ Display order reindexing complete')
```

#### Step 6: Cleanup & Validation
```typescript
console.log('Running validation checks...')

// Check for images without category
const uncategorized = await prisma.styleImage.count({
  where: { imageCategory: null }
})

if (uncategorized > 0) {
  console.warn(`⚠ Warning: ${uncategorized} images without category`)
}

// Check for rooms without super category
const uncategorizedRooms = await prisma.room.count({
  where: { superCategory: null }
})

if (uncategorizedRooms > 0) {
  console.warn(`⚠ Warning: ${uncategorizedRooms} rooms without super category`)
}

// Check for projects without InspirationPage
const projectCount = await prisma.project.count()
const inspirationPageCount = await prisma.inspirationPage.count()

if (projectCount !== inspirationPageCount) {
  console.warn(`⚠ Warning: Mismatch between projects (${projectCount}) and inspiration pages (${inspirationPageCount})`)
}

console.log('✓ Migration complete!')
```

### Running the Migration

```bash
# Development
npm run migrate:holistic-inspiration

# Production (with backup)
npm run migrate:holistic-inspiration:prod
```

### Rollback Plan

**Feature Flag**: `ENABLE_HOLISTIC_INSPIRATION_PAGE` in environment variables

```typescript
// In API routes and components
const useHolisticPage = process.env.ENABLE_HOLISTIC_INSPIRATION_PAGE === 'true'

if (!useHolisticPage) {
  // Fall back to old room-based logic
  return legacyInspirationPage(projectId)
}
```

**Database Rollback**:
- Keep `imageCategory` field optional (can default to `ROOM_OVERVIEW` or `null`)
- Don't delete old fields immediately
- If rollback needed, restore from backup and revert schema

---

## Security & Authorization

### Access Control Matrix

| Role | View Page | Upload Images | Categorize Images | Reorder | Generate Composite | Manage Categories |
|------|-----------|---------------|-------------------|---------|--------------------|--------------------|
| **Client** | ✅ (if shared) | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Designer** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Project Manager** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Organization Admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

### Authorization Implementation

```typescript
// Middleware: Check project membership
async function requireProjectMembership(
  userId: string,
  projectId: string,
  organizationId: string
): Promise<void> {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      organizationId,
      OR: [
        { createdBy: userId },
        { team: { some: { userId } } },
      ]
    }
  })

  if (!project) {
    throw new ForbiddenError('Not a member of this project')
  }
}

// Example: Generate Composite Endpoint
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  // 1. Authenticate
  const { userId, organizationId } = await authenticate(req)

  // 2. Check project membership
  await requireProjectMembership(userId, params.id, organizationId)

  // 3. Check specific permission for AI generation
  const hasPermission = await checkPermission(
    userId,
    'project:generate-composite',
    organizationId
  )

  if (!hasPermission) {
    throw new ForbiddenError('Insufficient permissions')
  }

  // 4. Rate limiting (check before expensive operation)
  await enforceRateLimit(userId, 'composite-generation', {
    requests: 5,
    window: '1h'
  })

  // 5. Proceed with generation...
  const jobId = await queueCompositeGeneration(params.id, body)

  // 6. Audit log
  await auditLog({
    action: 'inspiration.composite.generated',
    userId,
    organizationId,
    projectId: params.id,
  })

  return NextResponse.json({ jobId, status: 'queued' })
}
```

### Rate Limiting Configuration

```typescript
// lib/rate-limit.ts
export const RATE_LIMITS = {
  // AI Generation (expensive operations)
  'composite-generation': {
    perUser: { requests: 5, window: '1h' },
    perProject: { requests: 10, window: '1d' },
    perOrganization: { requests: 50, window: '1d' },
  },
  'anchor-generation': {
    perUser: { requests: 10, window: '1h' },
    perProject: { requests: 20, window: '1d' },
  },

  // Image Upload
  'image-upload': {
    perUser: { requests: 100, window: '1h' },
    perOrganization: { requests: 1000, window: '1h' },
  },

  // API Read Operations
  'inspiration-page-read': {
    perUser: { requests: 500, window: '1h' },
  },
}

export const UPLOAD_LIMITS = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  maxFilesPerUpload: 10,
}
```

### Input Validation Schemas

```typescript
// lib/validations/inspiration-page.ts
import { z } from 'zod'

export const generateCompositeSchema = z.object({
  includeRoomOverview: z.boolean().default(true),
  includeMaterials: z.boolean().default(true),
  includeTextures: z.boolean().default(true),
  style: z.enum(['pinterest-collage', 'grid', 'organic']).optional(),
  maxImages: z.number().min(10).max(100).optional(),
})

export const generateAnchorSchema = z.object({
  colorPalette: z.array(z.string().regex(/^#[0-9A-Fa-f]{6}$/)).optional(),
  fruitType: z.enum(['apple', 'orange', 'pomegranate', 'fig', 'grape']).optional(),
  style: z.enum(['realistic', 'artistic', 'minimal']).optional(),
})

export const bulkCategorizeSchema = z.object({
  imageIds: z.array(z.string().cuid()).min(1).max(100),
  imageCategory: z.enum(['ROOM_OVERVIEW', 'ROOM_DETAIL', 'MATERIAL', 'TEXTURE']),
  resetDisplayOrder: z.boolean().optional(),
})

export const createSubCategorySchema = z.object({
  name: z.string().min(1).max(100),
  nameEn: z.string().min(1).max(100),
  superCategory: z.enum(['PRIVATE', 'PUBLIC']),
  description: z.string().max(500).optional(),
  displayOrder: z.number().int().min(0).optional(),
})
```

### Audit Logging

```typescript
// Log all sensitive operations
await auditLog({
  action: 'inspiration.composite.generated',
  userId,
  organizationId,
  projectId: params.id,
  metadata: {
    imageCount: images.length,
    style: params.style,
    processingTime: endTime - startTime,
    estimatedCost: calculateCost(images.length),
  }
})

await auditLog({
  action: 'inspiration.images.bulk-categorized',
  userId,
  organizationId,
  metadata: {
    imageIds: params.imageIds,
    fromCategory: 'ROOM_OVERVIEW',
    toCategory: params.imageCategory,
    count: params.imageIds.length,
  }
})
```

---

## Performance Optimization

### Frontend Optimization

#### Image Loading Strategy
```typescript
// Priority loading for above-the-fold content
<Image
  src={compositeImageUrl}
  alt="Composite Mood Board"
  priority={true}  // Composite is hero image - preload
  quality={90}
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
  className="hero-image"
/>

// Lazy load gallery images below the fold
<Image
  src={imageUrl}
  alt="Room View"
  loading="lazy"
  placeholder="blur"
  blurDataURL={generateBlurDataURL(imageUrl)}
  sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
/>

// Generate blur placeholder on server
export function generateBlurDataURL(url: string): string {
  // Use sharp or similar to create tiny placeholder
  return `data:image/jpeg;base64,${base64Placeholder}`
}
```

#### Virtual Scrolling for Large Galleries
```typescript
import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'

export function ImageCategoryGallery({ images }: Props) {
  const parentRef = useRef<HTMLDivElement>(null)

  const rowVirtualizer = useVirtualizer({
    count: Math.ceil(images.length / 4), // 4 images per row
    getScrollElement: () => parentRef.current,
    estimateSize: () => 250, // Estimated row height
    overscan: 5, // Render 5 extra rows above/below viewport
  })

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const startIndex = virtualRow.index * 4
          const rowImages = images.slice(startIndex, startIndex + 4)

          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {/* Render row images */}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

#### Code Splitting
```typescript
// Dynamic import for heavy components
const RoomDetailView = dynamic(
  () => import('@/components/features/inspiration-page/room/RoomDetailView'),
  {
    loading: () => <Skeleton height={400} />,
    ssr: false, // Client-side only
  }
)

const GenerateCompositeButton = dynamic(
  () => import('@/components/features/inspiration-page/generation/GenerateCompositeButton'),
  {
    ssr: false,
    loading: () => <Button disabled>Loading...</Button>
  }
)

// Lazy load image preview modal
const ImagePreview = dynamic(
  () => import('@/components/features/inspiration-page/shared/ImagePreview'),
  { ssr: false }
)
```

#### Data Fetching Strategy
```typescript
// TanStack Query with stale-while-revalidate
export const useInspirationPage = (projectId: string) => {
  return useQuery({
    queryKey: ['inspiration-page', projectId],
    queryFn: () => fetchInspirationPage(projectId),
    staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh
    cacheTime: 30 * 60 * 1000, // 30 minutes - keep in cache
    refetchOnWindowFocus: false, // Don't refetch on every focus
    refetchOnMount: false, // Don't refetch if cached data exists
  })
}

// Prefetch room details on hover
const { prefetchQuery } = useQueryClient()

const handleRoomHover = (roomId: string) => {
  prefetchQuery({
    queryKey: ['room-detail', roomId],
    queryFn: () => fetchRoomDetail(roomId),
  })
}

// Optimistic updates for image reordering
const reorderMutation = useMutation({
  mutationFn: (params: ReorderParams) => reorderImage(params),
  onMutate: async (params) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries(['inspiration-page', projectId])

    // Snapshot previous value
    const previous = queryClient.getQueryData(['inspiration-page', projectId])

    // Optimistically update
    queryClient.setQueryData(['inspiration-page', projectId], (old) => {
      // Update order in cached data
      return updateOrderOptimistically(old, params)
    })

    return { previous }
  },
  onError: (err, params, context) => {
    // Rollback on error
    queryClient.setQueryData(['inspiration-page', projectId], context.previous)
  },
})
```

### Backend Optimization

#### Database Indexes
```prisma
model StyleImage {
  // ...

  @@index([styleId, imageCategory, displayOrder]) // Fast category filtering + ordering
  @@index([roomId, imageCategory, displayOrder])  // Room-specific queries
  @@index([projectId, imageCategory])             // Project-level aggregation
  @@index([imageCategory, createdAt])             // Recent images per category
}

model Room {
  // ...

  @@index([projectId, superCategory])             // Filter by super category
  @@index([superCategory, subCategoryId])         // Category hierarchy queries
  @@index([inspirationPageEnabled])               // Find enabled rooms quickly
}

model InspirationPage {
  // ...

  @@index([projectId])                            // Primary lookup
  @@index([generationStatus])                     // Find pending jobs
  @@index([generatedAt])                          // Recent generations
}
```

#### Optimized Queries
```typescript
// ❌ Bad: N+1 query problem
const rooms = await prisma.room.findMany({ where: { projectId } })
for (const room of rooms) {
  const images = await prisma.styleImage.findMany({ where: { roomId: room.id } })
  const imageCount = images.length
}

// ✅ Good: Single query with aggregation
const rooms = await prisma.room.findMany({
  where: { projectId },
  include: {
    _count: {
      select: {
        images: {
          where: { imageCategory: 'ROOM_DETAIL' }
        }
      }
    },
    images: {
      where: { imageCategory: 'ROOM_DETAIL' },
      take: 1, // Just get thumbnail
      orderBy: { displayOrder: 'asc' },
    },
    subCategory: true,
  },
})

// ✅ Good: Efficient inspiration page query
const inspirationData = await prisma.inspirationPage.findUnique({
  where: { projectId },
  include: {
    project: {
      select: { id: true, name: true },
      include: {
        rooms: {
          where: { inspirationPageEnabled: true },
          select: {
            id: true,
            name: true,
            type: true,
            superCategory: true,
            subCategory: { select: { name: true, nameEn: true } },
            _count: {
              select: {
                images: { where: { imageCategory: 'ROOM_DETAIL' } }
              }
            },
            images: {
              where: { imageCategory: 'ROOM_DETAIL' },
              take: 1,
              orderBy: { displayOrder: 'asc' },
            }
          }
        }
      }
    }
  }
})

// Get categorized images in separate query (can be parallelized)
const [overviewImages, materials, textures] = await Promise.all([
  prisma.styleImage.findMany({
    where: { projectId, imageCategory: 'ROOM_OVERVIEW' },
    orderBy: { displayOrder: 'asc' },
    take: 60,
  }),
  prisma.styleImage.findMany({
    where: { projectId, imageCategory: 'MATERIAL' },
    orderBy: { displayOrder: 'asc' },
    take: 25,
  }),
  prisma.styleImage.findMany({
    where: { projectId, imageCategory: 'TEXTURE' },
    orderBy: { displayOrder: 'asc' },
    take: 15,
  }),
])
```

#### Response Caching (Redis)
```typescript
import { redis } from '@/lib/redis'

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const cacheKey = `inspiration-page:${params.id}`

  // Try cache first
  const cached = await redis.get(cacheKey)
  if (cached) {
    return NextResponse.json(JSON.parse(cached), {
      headers: {
        'X-Cache': 'HIT',
        'Cache-Control': 'public, s-maxage=300' // 5 min edge cache
      }
    })
  }

  // Fetch from database
  const data = await fetchInspirationPageData(params.id)

  // Cache for 5 minutes
  await redis.set(cacheKey, JSON.stringify(data), { ex: 300 })

  return NextResponse.json(data, {
    headers: {
      'X-Cache': 'MISS',
      'Cache-Control': 'public, s-maxage=300'
    }
  })
}

// Invalidate cache on mutations
export async function POST(req: Request, { params }: { params: { id: string } }) {
  // ... perform mutation ...

  // Invalidate cache
  await redis.del(`inspiration-page:${params.id}`)

  return NextResponse.json({ success: true })
}
```

#### Image CDN Configuration
- All images served from R2 with Cloudflare CDN
- Use query parameters for on-the-fly resizing: `?w=400&q=80&format=webp`
- Serve WebP format with JPEG fallback
- Set aggressive caching headers (1 year for immutable content)

```typescript
// Generate optimized image URL
export function getOptimizedImageUrl(
  url: string,
  options: {
    width?: number
    quality?: number
    format?: 'webp' | 'jpeg' | 'auto'
  } = {}
): string {
  const params = new URLSearchParams()
  if (options.width) params.set('w', options.width.toString())
  if (options.quality) params.set('q', options.quality.toString())
  if (options.format) params.set('format', options.format)

  return `${url}?${params.toString()}`
}

// Usage
<Image
  src={getOptimizedImageUrl(image.url, { width: 400, quality: 80, format: 'webp' })}
  alt={image.description}
/>
```

---

## Testing Strategy

### Unit Tests

```typescript
// src/lib/inspiration-page/validation.test.ts
describe('Image Category Validation', () => {
  it('should enforce max 60 ROOM_OVERVIEW images', () => {
    const images = generateMockImages(61, 'ROOM_OVERVIEW')
    expect(() => validateImageLimits(images)).toThrow('Exceeded ROOM_OVERVIEW limit of 60')
  })

  it('should allow up to 5 ROOM_DETAIL images per room', () => {
    const images = generateMockImages(5, 'ROOM_DETAIL', 'room-123')
    expect(validateImageLimits(images)).toBe(true)
  })

  it('should reject 6th ROOM_DETAIL image for same room', () => {
    const images = generateMockImages(6, 'ROOM_DETAIL', 'room-123')
    expect(() => validateImageLimits(images)).toThrow('Room room-123 exceeds 5 ROOM_DETAIL images')
  })

  it('should enforce max 25 MATERIAL images', () => {
    const images = generateMockImages(26, 'MATERIAL')
    expect(() => validateImageLimits(images)).toThrow('Exceeded MATERIAL limit of 25')
  })

  it('should enforce max 15 TEXTURE images', () => {
    const images = generateMockImages(16, 'TEXTURE')
    expect(() => validateImageLimits(images)).toThrow('Exceeded TEXTURE limit of 15')
  })

  it('should reject invalid image category', () => {
    expect(() => validateImageCategory('INVALID')).toThrow('Invalid image category')
  })
})

// src/lib/inspiration-page/room-categorization.test.ts
describe('Room Categorization', () => {
  it('should assign PRIVATE super category to living room', () => {
    const result = categorizeRoom({ type: 'living-room' })
    expect(result.superCategory).toBe('PRIVATE')
    expect(result.subCategory).toBe('בית רגיל')
  })

  it('should assign PUBLIC super category to office', () => {
    const result = categorizeRoom({ type: 'office' })
    expect(result.superCategory).toBe('PUBLIC')
    expect(result.subCategory).toBe('משרד')
  })

  it('should enable inspiration page for main rooms', () => {
    const mainRooms = ['living-room', 'kitchen', 'bedroom', 'master-bedroom', 'bathroom']
    mainRooms.forEach(type => {
      expect(shouldEnableInspirationPage(type)).toBe(true)
    })
  })

  it('should disable inspiration page for secondary rooms', () => {
    const secondaryRooms = ['hallway', 'closet', 'balcony']
    secondaryRooms.forEach(type => {
      expect(shouldEnableInspirationPage(type)).toBe(false)
    })
  })
})

// src/lib/inspiration-page/display-order.test.ts
describe('Display Order Management', () => {
  it('should reorder images sequentially when one is moved', () => {
    const images = [
      { id: '1', displayOrder: 0 },
      { id: '2', displayOrder: 1 },
      { id: '3', displayOrder: 2 },
    ]

    const result = reorderImage(images, '1', 2) // Move first to last

    expect(result).toEqual([
      { id: '2', displayOrder: 0 },
      { id: '3', displayOrder: 1 },
      { id: '1', displayOrder: 2 },
    ])
  })

  it('should handle moving to same position', () => {
    const images = [{ id: '1', displayOrder: 0 }, { id: '2', displayOrder: 1 }]
    const result = reorderImage(images, '1', 0)
    expect(result).toEqual(images) // No change
  })
})
```

### Integration Tests

```typescript
// tests/api/inspiration-page.test.ts
describe('GET /api/projects/[id]/inspiration', () => {
  it('should return inspiration page data for authorized user', async () => {
    const { projectId, token } = await createTestProject()

    const response = await fetch(`/api/projects/${projectId}/inspiration`, {
      headers: { Authorization: `Bearer ${token}` }
    })

    expect(response.status).toBe(200)
    const data = await response.json()

    expect(data).toHaveProperty('inspirationPage')
    expect(data).toHaveProperty('images')
    expect(data.images).toHaveProperty('roomOverview')
    expect(data.images).toHaveProperty('materials')
    expect(data.images).toHaveProperty('textures')
    expect(data).toHaveProperty('rooms')
    expect(data).toHaveProperty('stats')
  })

  it('should return 403 for non-member', async () => {
    const { projectId } = await createTestProject()
    const { token: otherUserToken } = await createTestUser()

    const response = await fetch(`/api/projects/${projectId}/inspiration`, {
      headers: { Authorization: `Bearer ${otherUserToken}` }
    })

    expect(response.status).toBe(403)
  })

  it('should respect image limits per category', async () => {
    const { projectId, token } = await createTestProject()

    // Add 60 ROOM_OVERVIEW images
    await addTestImages(projectId, 60, 'ROOM_OVERVIEW')

    const response = await fetch(`/api/projects/${projectId}/inspiration`, {
      headers: { Authorization: `Bearer ${token}` }
    })

    const data = await response.json()
    expect(data.images.roomOverview.length).toBe(60)
  })
})

describe('POST /api/projects/[id]/inspiration/generate-composite', () => {
  it('should queue composite generation job', async () => {
    const { projectId, token } = await createTestProject({ role: 'manager' })

    const response = await fetch(`/api/projects/${projectId}/inspiration/generate-composite`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ includeRoomOverview: true }),
    })

    expect(response.status).toBe(202)
    const data = await response.json()
    expect(data).toHaveProperty('jobId')
    expect(data.status).toBe('queued')
  })

  it('should enforce rate limit (5 per hour)', async () => {
    const { projectId, token } = await createTestProject({ role: 'manager' })

    // Make 5 successful requests
    for (let i = 0; i < 5; i++) {
      await fetch(`/api/projects/${projectId}/inspiration/generate-composite`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
    }

    // 6th request should be rate limited
    const response = await fetch(`/api/projects/${projectId}/inspiration/generate-composite`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(response.status).toBe(429)
    const data = await response.json()
    expect(data.error).toContain('rate limit')
  })

  it('should reject request from designer role', async () => {
    const { projectId, token } = await createTestProject({ role: 'designer' })

    const response = await fetch(`/api/projects/${projectId}/inspiration/generate-composite`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(response.status).toBe(403)
  })
})

describe('POST /api/images/upload with categories', () => {
  it('should upload image with ROOM_OVERVIEW category', async () => {
    const { projectId, token } = await createTestProject()
    const file = await createTestImageFile()

    const formData = new FormData()
    formData.append('file', file)
    formData.append('entityType', 'project')
    formData.append('entityId', projectId)
    formData.append('imageCategory', 'ROOM_OVERVIEW')

    const response = await fetch('/api/images/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })

    expect(response.status).toBe(201)
    const data = await response.json()
    expect(data.imageCategory).toBe('ROOM_OVERVIEW')
    expect(data.url).toMatch(/^https:\/\//)
  })

  it('should reject 61st ROOM_OVERVIEW image', async () => {
    const { projectId, token } = await createTestProject()

    // Add 60 images first
    await addTestImages(projectId, 60, 'ROOM_OVERVIEW')

    // Try to add 61st
    const file = await createTestImageFile()
    const formData = new FormData()
    formData.append('file', file)
    formData.append('entityType', 'project')
    formData.append('entityId', projectId)
    formData.append('imageCategory', 'ROOM_OVERVIEW')

    const response = await fetch('/api/images/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toContain('limit')
  })
})
```

### E2E Tests (Playwright)

```typescript
// tests/e2e/inspiration-page.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Inspiration Page', () => {
  test('should display holistic inspiration page', async ({ page }) => {
    await page.goto(`/project/${testProjectId}/inspiration`)

    // Check hero section
    await expect(page.locator('[data-testid="composite-image"]')).toBeVisible()

    // Check anchor section
    await expect(page.locator('[data-testid="anchor-image"]')).toBeVisible()

    // Check section tabs/headers
    await expect(page.locator('text=Room Overview')).toBeVisible()
    await expect(page.locator('text=Materials')).toBeVisible()
    await expect(page.locator('text=Textures')).toBeVisible()
    await expect(page.locator('text=Room Details')).toBeVisible()

    // Check image count in overview section
    const overviewImages = page.locator('[data-category="ROOM_OVERVIEW"]')
    const count = await overviewImages.count()
    expect(count).toBeLessThanOrEqual(60)
    expect(count).toBeGreaterThan(0)
  })

  test('should navigate to room detail page', async ({ page }) => {
    await page.goto(`/project/${testProjectId}/inspiration`)

    // Scroll to room cards section
    await page.locator('text=Room Details').scrollIntoViewIfNeeded()

    // Click first room card
    await page.locator('[data-testid="room-card"]').first().click()

    // Should navigate to detail page
    await expect(page).toHaveURL(new RegExp('/room/[a-z0-9]+'))

    // Should show room name
    await expect(page.locator('[data-testid="room-name"]')).toBeVisible()

    // Should show 3-5 detail images
    const detailImages = page.locator('[data-category="ROOM_DETAIL"]')
    const count = await detailImages.count()
    expect(count).toBeGreaterThanOrEqual(3)
    expect(count).toBeLessThanOrEqual(5)

    // Back button should work
    await page.locator('[data-testid="back-to-overview"]').click()
    await expect(page).toHaveURL(new RegExp('/inspiration$'))
  })

  test('should generate composite mood board', async ({ page }) => {
    await page.goto(`/project/${testProjectId}/inspiration`)

    // Click generate button
    await page.locator('[data-testid="generate-composite-btn"]').click()

    // Should show modal
    await expect(page.locator('[role="dialog"]')).toBeVisible()

    // Check options
    await expect(page.locator('text=Include room overview')).toBeVisible()
    await expect(page.locator('text=Include materials')).toBeVisible()
    await expect(page.locator('text=Include textures')).toBeVisible()

    // Confirm generation
    await page.locator('button:has-text("Generate")').click()

    // Should show progress indicator
    await expect(page.locator('[data-testid="generation-progress"]')).toBeVisible()

    // Wait for completion (with timeout)
    await expect(page.locator('[data-testid="composite-image"]')).toBeVisible({ timeout: 60000 })

    // Success toast should appear
    await expect(page.locator('text=Composite generated successfully')).toBeVisible()
  })

  test('should upload and categorize images', async ({ page }) => {
    await page.goto(`/project/${testProjectId}/inspiration`)

    // Click on Materials tab
    await page.locator('text=Materials').click()

    // Click upload button
    await page.locator('[data-testid="upload-materials-btn"]').click()

    // Upload file
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('./tests/fixtures/test-material.jpg')

    // Should show uploaded image
    await expect(page.locator('[data-category="MATERIAL"]').last()).toBeVisible()

    // Should show correct count
    const materialCount = await page.locator('[data-category="MATERIAL"]').count()
    await expect(page.locator(`text=${materialCount} of 25 images`)).toBeVisible()
  })

  test('should filter rooms by category', async ({ page }) => {
    await page.goto(`/project/${testProjectId}/inspiration`)

    // Go to Room Details section
    await page.locator('text=Room Details').click()

    // Apply filter: PRIVATE rooms only
    await page.locator('[data-testid="filter-super-category"]').selectOption('PRIVATE')

    // Count visible room cards
    const roomCards = page.locator('[data-testid="room-card"]')
    const count = await roomCards.count()

    // All should be PRIVATE
    for (let i = 0; i < count; i++) {
      await expect(roomCards.nth(i).locator('[data-testid="category-badge"]')).toContainText('פרטי')
    }
  })
})
```

### Visual Regression Tests

```typescript
// tests/visual/inspiration-page.spec.ts
import { test, expect } from '@playwright/test'

test('inspiration page layout - desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.goto(`/project/${testProjectId}/inspiration`)
  await page.waitForLoadState('networkidle')

  await expect(page).toHaveScreenshot('inspiration-page-desktop.png', {
    fullPage: true,
    maxDiffPixels: 100,
  })
})

test('inspiration page layout - mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 })
  await page.goto(`/project/${testProjectId}/inspiration`)
  await page.waitForLoadState('networkidle')

  await expect(page).toHaveScreenshot('inspiration-page-mobile.png', {
    fullPage: true,
    maxDiffPixels: 100,
  })
})

test('inspiration page RTL', async ({ page, context }) => {
  await context.addInitScript(() => {
    document.documentElement.setAttribute('dir', 'rtl')
    document.documentElement.setAttribute('lang', 'he')
  })

  await page.goto(`/he/project/${testProjectId}/inspiration`)
  await page.waitForLoadState('networkidle')

  await expect(page).toHaveScreenshot('inspiration-page-rtl.png', {
    fullPage: true,
    maxDiffPixels: 100,
  })
})

test('room detail page', async ({ page }) => {
  await page.goto(`/project/${testProjectId}/inspiration/room/${testRoomId}`)
  await page.waitForLoadState('networkidle')

  await expect(page).toHaveScreenshot('room-detail-page.png', {
    fullPage: true,
    maxDiffPixels: 100,
  })
})

test('composite generation modal', async ({ page }) => {
  await page.goto(`/project/${testProjectId}/inspiration`)
  await page.locator('[data-testid="generate-composite-btn"]').click()

  await expect(page.locator('[role="dialog"]')).toHaveScreenshot('composite-generation-modal.png', {
    maxDiffPixels: 50,
  })
})
```

---

## Localization

### Translation Keys Structure

All translations should be added via the admin panel at `/admin/translations`.

**Key Format**: `inspiration-page.section.element`

### Required Translation Keys

```typescript
// Page-level
'inspiration-page.title': { he: 'לוח השראה', en: 'Inspiration Board' }
'inspiration-page.subtitle': { he: 'כל האלמנטים העיצוביים במקום אחד', en: 'All design elements in one place' }
'inspiration-page.loading': { he: 'טוען...', en: 'Loading...' }
'inspiration-page.error': { he: 'שגיאה בטעינת לוח ההשראה', en: 'Error loading inspiration board' }

// Composite Section
'inspiration-page.composite.title': { he: 'לוח השראה מאוחד', en: 'Composite Mood Board' }
'inspiration-page.composite.description': { he: 'תמונה מסכמת המציגה את השפה העיצובית', en: 'Summary image showcasing the design language' }
'inspiration-page.composite.not-generated': { he: 'טרם נוצרה תמונת אגרגציה', en: 'Composite not generated yet' }
'inspiration-page.composite.generating': { he: 'מייצר תמונה...', en: 'Generating image...' }
'inspiration-page.composite.failed': { he: 'יצירה נכשלה', en: 'Generation failed' }

// Anchor Section
'inspiration-page.anchor.title': { he: 'תמונת עוגן', en: 'Anchor Image' }
'inspiration-page.anchor.description': { he: 'פירות על גבי פלטת הצבעים', en: 'Fruit on color palette' }

// Image Categories
'inspiration-page.room-overview': { he: 'סקירת חדרים', en: 'Room Overview' }
'inspiration-page.room-overview.description': { he: 'תמונות מכלל חללי הבית (~60)', en: 'Images from all house spaces (~60)' }
'inspiration-page.room-overview.count': { he: '{{count}} מתוך 60 תמונות', en: '{{count}} of 60 images' }

'inspiration-page.materials': { he: 'חומרים ואלמנטים', en: 'Materials & Elements' }
'inspiration-page.materials.description': { he: 'חומרים פיזיים: ריצוף, חיפויים, נגרות', en: 'Physical materials: flooring, coverings, carpentry' }
'inspiration-page.materials.count': { he: '{{count}} מתוך 25 תמונות', en: '{{count}} of 25 images' }

'inspiration-page.textures': { he: 'צבעים וטקסטורות', en: 'Colors & Textures' }
'inspiration-page.textures.description': { he: 'גוונים וגימורים: מט, מבריק, שליכט', en: 'Tones and finishes: matte, glossy, smooth' }
'inspiration-page.textures.count': { he: '{{count}} מתוך 15 תמונות', en: '{{count}} of 15 images' }

'inspiration-page.room-details': { he: 'פירוט חדרים', en: 'Room Details' }
'inspiration-page.room-details.description': { he: 'תצוגה מפורטת לכל חדר', en: 'Detailed view for each room' }

// Actions
'inspiration-page.generate-composite': { he: 'צור לוח מאוחד', en: 'Generate Composite' }
'inspiration-page.regenerate': { he: 'צור מחדש', en: 'Regenerate' }
'inspiration-page.download': { he: 'הורד', en: 'Download' }
'inspiration-page.share': { he: 'שתף', en: 'Share' }
'inspiration-page.upload': { he: 'העלה תמונות', en: 'Upload Images' }
'inspiration-page.view-room': { he: 'צפה בחדר', en: 'View Room' }
'inspiration-page.back-to-overview': { he: 'חזרה לסקירה', en: 'Back to Overview' }
'inspiration-page.edit': { he: 'ערוך', en: 'Edit' }

// Room Categories - Super
'admin.room-categories.super-category.private': { he: 'פרטי', en: 'Private' }
'admin.room-categories.super-category.public': { he: 'ציבורי', en: 'Public' }

// Room Categories - Sub (Private)
'admin.room-categories.sub-category.regular-house': { he: 'בית רגיל', en: 'Regular House' }
'admin.room-categories.sub-category.apartment': { he: 'דירה', en: 'Apartment' }
'admin.room-categories.sub-category.villa': { he: 'וילה', en: 'Villa' }
'admin.room-categories.sub-category.penthouse': { he: 'פנטהאוז', en: 'Penthouse' }

// Room Categories - Sub (Public)
'admin.room-categories.sub-category.synagogue': { he: 'בית כנסת', en: 'Synagogue' }
'admin.room-categories.sub-category.kindergarten': { he: 'גן ילדים', en: 'Kindergarten' }
'admin.room-categories.sub-category.office': { he: 'משרד', en: 'Office' }
'admin.room-categories.sub-category.clinic': { he: 'מרפאה', en: 'Clinic' }
'admin.room-categories.sub-category.restaurant': { he: 'מסעדה', en: 'Restaurant' }
'admin.room-categories.sub-category.hotel': { he: 'בית מלון', en: 'Hotel' }

// Image Category Labels
'inspiration-page.category.room-overview': { he: 'סקירת חדר', en: 'Room Overview' }
'inspiration-page.category.room-detail': { he: 'פירוט חדר', en: 'Room Detail' }
'inspiration-page.category.material': { he: 'חומר', en: 'Material' }
'inspiration-page.category.texture': { he: 'טקסטורה', en: 'Texture' }
'inspiration-page.category.composite': { he: 'לוח מאוחד', en: 'Composite' }
'inspiration-page.category.anchor': { he: 'עוגן', en: 'Anchor' }

// Errors & Validation
'inspiration-page.error.max-images': { he: 'הגעת למגבלת התמונות עבור קטגוריה זו', en: 'Image limit reached for this category' }
'inspiration-page.error.generation-failed': { he: 'יצירת הלוח נכשלה. נסה שוב מאוחר יותר', en: 'Board generation failed. Please try again later' }
'inspiration-page.error.upload-failed': { he: 'העלאת תמונה נכשלה', en: 'Image upload failed' }
'inspiration-page.error.delete-failed': { he: 'מחיקת תמונה נכשלה', en: 'Image deletion failed' }
'inspiration-page.error.rate-limit': { he: 'הגעת למגבלת הבקשות. נסה שוב בעוד {{minutes}} דקות', en: 'Rate limit reached. Try again in {{minutes}} minutes' }

// Success Messages
'inspiration-page.success.generated': { he: 'לוח מאוחד נוצר בהצלחה', en: 'Composite generated successfully' }
'inspiration-page.success.uploaded': { he: 'תמונה הועלתה בהצלחה', en: 'Image uploaded successfully' }
'inspiration-page.success.deleted': { he: 'תמונה נמחקה בהצלחה', en: 'Image deleted successfully' }
'inspiration-page.success.categorized': { he: 'תמונות סווגו בהצלחה', en: 'Images categorized successfully' }
'inspiration-page.success.reordered': { he: 'סדר התמונות עודכן', en: 'Image order updated' }

// Admin
'admin.room-categories.title': { he: 'ניהול קטגוריות חדרים', en: 'Room Category Management' }
'admin.room-categories.create': { he: 'צור קטגוריה חדשה', en: 'Create New Category' }
'admin.room-categories.edit': { he: 'ערוך קטגוריה', en: 'Edit Category' }
'admin.room-categories.delete': { he: 'מחק קטגוריה', en: 'Delete Category' }
'admin.room-categories.name': { he: 'שם (עברית)', en: 'Name (Hebrew)' }
'admin.room-categories.name-en': { he: 'שם (אנגלית)', en: 'Name (English)' }
'admin.room-categories.super-category': { he: 'קטגוריה עליונה', en: 'Super Category' }
'admin.room-categories.description': { he: 'תיאור', en: 'Description' }
'admin.room-categories.display-order': { he: 'סדר תצוגה', en: 'Display Order' }
'admin.room-categories.usage-count': { he: 'מספר שימושים', en: 'Usage Count' }

// Empty States
'inspiration-page.empty.no-images': { he: 'אין תמונות עדיין. העלה תמונות כדי להתחיל', en: 'No images yet. Upload images to get started' }
'inspiration-page.empty.no-rooms': { he: 'אין חדרים עם פירוט', en: 'No rooms with details' }
'inspiration-page.empty.no-materials': { he: 'אין חומרים עדיין', en: 'No materials yet' }
'inspiration-page.empty.no-textures': { he: 'אין טקסטורות עדיין', en: 'No textures yet' }
```

### RTL Layout Considerations

```css
/* Use logical properties for RTL support */
.inspiration-page-container {
  /* ✅ Good: Logical properties */
  padding-inline: var(--spacing-lg);
  margin-inline-start: auto;
  border-inline-end: 1px solid var(--color-border);

  /* ❌ Bad: Physical properties */
  /* padding-left: var(--spacing-lg); */
  /* margin-left: auto; */
  /* border-right: 1px solid var(--color-border); */
}

.room-card {
  text-align: start; /* ✅ Not 'left' */
  direction: inherit; /* ✅ Inherit from parent */
}

.image-gallery {
  display: grid;
  gap: var(--spacing-md);
  /* ✅ Grid works naturally with RTL */
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
}

/* Flexbox with RTL */
.room-card-header {
  display: flex;
  gap: var(--spacing-sm);
  /* ✅ Flex direction reverses automatically in RTL */
}

/* Icons that should NOT flip in RTL */
.icon-no-flip {
  transform: scaleX(var(--flip-factor, 1));
}

[dir="rtl"] .icon-no-flip {
  --flip-factor: -1; /* Flip back in RTL */
}
```

---

## Rollout Plan

### Timeline Overview

**Total Duration**: 9 weeks
**Team Size**: 2-3 developers + 1 QA + 1 designer

---

### Phase 1: Database & Backend Foundation
**Duration**: Week 1-2
**Owner**: Backend Team

**Tasks**:
- [ ] Add Prisma schema changes (enums, tables, fields)
- [ ] Create and test migration script (`scripts/migrate-holistic-inspiration.ts`)
- [ ] Run migration on development environment
- [ ] Implement API endpoints:
  - [ ] `GET /api/projects/[id]/inspiration`
  - [ ] `GET /api/projects/[id]/inspiration/room/[roomId]`
  - [ ] `POST /api/images/upload` (with category support)
  - [ ] `PUT /api/images/bulk-categorize`
  - [ ] `PUT /api/images/reorder`
- [ ] Add Zod validation schemas
- [ ] Implement rate limiting logic
- [ ] Write unit tests for business logic
- [ ] Document API endpoints (OpenAPI/Swagger)

**Deliverables**:
- ✅ Prisma schema updated and migrated
- ✅ Migration script tested with sample data
- ✅ API endpoints functional and tested
- ✅ 80%+ test coverage for backend logic
- ✅ API documentation published

**Success Criteria**:
- All API endpoints return correct data
- Migration script handles 100+ existing projects without errors
- Unit tests pass with >80% coverage

---

### Phase 2: Basic UI Components
**Duration**: Week 3-4
**Owner**: Frontend Team

**Tasks**:
- [ ] Create component structure in `src/components/features/inspiration-page/`
- [ ] Implement core components:
  - [ ] `InspirationPageViewer` (main container)
  - [ ] `ImageCategoryGallery` (reusable gallery)
  - [ ] `RoomCardGrid` (room navigation)
  - [ ] `RoomCard` (individual card)
  - [ ] `RoomDetailView` (drill-down page)
- [ ] Add routing:
  - [ ] `/project/[id]/inspiration`
  - [ ] `/project/[id]/inspiration/room/[roomId]`
- [ ] Integrate with existing `ImageUpload` component
- [ ] Add image categorization UI
- [ ] Implement lazy loading and virtual scrolling
- [ ] Add responsive layouts (mobile, tablet, desktop)
- [ ] Test RTL layout thoroughly
- [ ] Add loading skeletons and error states

**Deliverables**:
- ✅ Functional holistic inspiration page (no AI generation yet)
- ✅ Room detail view working with navigation
- ✅ Image upload with category selection
- ✅ RTL support verified on all layouts
- ✅ Responsive design working on all screen sizes

**Success Criteria**:
- Users can view inspiration page and navigate to room details
- Images can be uploaded and categorized
- UI is smooth and performant (no jank)
- RTL layout looks correct

---

### Phase 3: Admin Features
**Duration**: Week 5
**Owner**: Full-Stack Team

**Tasks**:
- [ ] Create admin pages:
  - [ ] `/admin/room-categories` (category management)
  - [ ] `/admin/inspiration-settings` (global settings)
- [ ] Implement admin components:
  - [ ] `RoomCategoryManager` (CRUD for categories)
  - [ ] `ImageCategorySelector` (bulk categorization tool)
  - [ ] `InspirationPageSettings` (configure enabled rooms)
- [ ] Add API endpoints:
  - [ ] `GET /api/admin/room-categories`
  - [ ] `POST /api/admin/room-categories`
  - [ ] `PUT /api/admin/room-categories/[id]`
  - [ ] `DELETE /api/admin/room-categories/[id]`
  - [ ] `GET /api/admin/room-types`
  - [ ] `PUT /api/admin/room-types/[id]/toggle-inspiration`
- [ ] Add analytics dashboard (image distribution, usage stats)
- [ ] Add translations for admin UI
- [ ] Implement RBAC checks (admin-only access)

**Deliverables**:
- ✅ Admin can manage room categories (create, edit, delete)
- ✅ Admin can configure inspiration board settings per room type
- ✅ Bulk image categorization tool working
- ✅ Analytics showing image distribution

**Success Criteria**:
- Admin can create new sub-categories and assign rooms
- Bulk categorization processes 100+ images quickly
- Analytics provide useful insights

---

### Phase 4: AI Image Generation
**Duration**: Week 6-7
**Owner**: AI/Backend Team

**⚠️ BLOCKER**: Waiting for user example of composite mood board format

**Tasks**:
- [ ] **WAIT FOR USER**: Receive example composite image
- [ ] Design Gemini prompt for composite generation (based on example)
- [ ] Implement queue system:
  - [ ] Choose queue provider (Inngest recommended)
  - [ ] Set up worker for composite generation
  - [ ] Set up worker for anchor generation
- [ ] Implement composite generation:
  - [ ] Image fetching and preprocessing
  - [ ] Gemini API integration
  - [ ] Result upload to R2
  - [ ] Database updates
- [ ] Implement anchor generation:
  - [ ] Color palette extraction
  - [ ] Gemini API integration
  - [ ] Result upload to R2
- [ ] Add API endpoints:
  - [ ] `POST /api/projects/[id]/inspiration/generate-composite`
  - [ ] `GET /api/projects/[id]/inspiration/generation-status`
  - [ ] `POST /api/projects/[id]/inspiration/generate-anchor`
- [ ] Implement frontend components:
  - [ ] `GenerateCompositeButton`
  - [ ] `GenerationModal`
  - [ ] `GenerationProgress`
  - [ ] `CompositeImageSection`
  - [ ] `AnchorImageSection`
- [ ] Add progress tracking UI (polling or WebSocket)
- [ ] Implement error handling and retry logic
- [ ] Add rate limiting
- [ ] Test generation with various image sets

**Deliverables**:
- ✅ Working AI composite generation
- ✅ Working AI anchor generation
- ✅ Queue system operational and stable
- ✅ Real-time progress updates in UI
- ✅ Error handling with user-friendly messages

**Success Criteria**:
- Composite generation completes in <60 seconds
- Generated images match expected quality
- Rate limiting prevents abuse
- Users understand the generation process

---

### Phase 5: Testing & Refinement
**Duration**: Week 8
**Owner**: QA + Full Team

**Tasks**:
- [ ] **Unit Tests**:
  - [ ] Backend validation logic
  - [ ] Frontend utility functions
  - [ ] State management logic
- [ ] **Integration Tests**:
  - [ ] API endpoint tests
  - [ ] Database query tests
  - [ ] Auth and permission tests
- [ ] **E2E Tests** (Playwright):
  - [ ] User flows (view, upload, navigate, generate)
  - [ ] Error scenarios
  - [ ] Multi-user scenarios
- [ ] **Visual Regression Tests**:
  - [ ] LTR layout screenshots
  - [ ] RTL layout screenshots
  - [ ] Mobile vs desktop comparisons
- [ ] **Performance Testing**:
  - [ ] Lighthouse audit (target: 90+ performance score)
  - [ ] Load testing (100 concurrent users)
  - [ ] Image loading optimization
  - [ ] Database query profiling
- [ ] **Security Audit**:
  - [ ] Authorization checks on all endpoints
  - [ ] Rate limiting verification
  - [ ] Input validation review
  - [ ] SQL injection prevention (Prisma)
- [ ] **Accessibility Audit** (WCAG 2.1 AA):
  - [ ] Screen reader testing
  - [ ] Keyboard navigation
  - [ ] Color contrast
  - [ ] ARIA labels
- [ ] **User Acceptance Testing**:
  - [ ] Internal designer testing
  - [ ] Feedback collection
  - [ ] Bug reporting
- [ ] **Bug Fixes & Refinements**:
  - [ ] Address all critical and high-priority bugs
  - [ ] Polish UI based on feedback
  - [ ] Optimize performance bottlenecks

**Deliverables**:
- ✅ All tests passing (unit, integration, E2E)
- ✅ Performance targets met (Lighthouse 90+)
- ✅ Security verified (no critical vulnerabilities)
- ✅ Accessibility compliant (WCAG 2.1 AA)
- ✅ UAT feedback incorporated

**Success Criteria**:
- Test coverage >80%
- Page load time <2s (p95)
- API response time <200ms (p95)
- Zero critical bugs
- Positive feedback from internal users

---

### Phase 6: Migration & Production Deployment
**Duration**: Week 9
**Owner**: DevOps + Backend Team

**Tasks**:
- [ ] **Staging Deployment**:
  - [ ] Deploy code to staging environment
  - [ ] Run migration script on staging database
  - [ ] Verify data integrity (spot checks)
  - [ ] Test with real project data
  - [ ] Performance monitoring setup
- [ ] **Production Preparation**:
  - [ ] Set up error tracking (Sentry)
  - [ ] Set up logging (structured logs)
  - [ ] Create rollback plan
  - [ ] Prepare feature flag (`ENABLE_HOLISTIC_INSPIRATION_PAGE`)
  - [ ] Document deployment process
- [ ] **Gradual Rollout**:
  - [ ] **Day 1**: Enable for 10% of organizations
  - [ ] **Day 2**: Monitor for 24 hours (check errors, performance, user feedback)
  - [ ] **Day 3**: Enable for 50% of organizations
  - [ ] **Day 4**: Monitor for 24 hours
  - [ ] **Day 5**: Enable for 100% of organizations
- [ ] **Monitoring & Alerts**:
  - [ ] Set up dashboards (API latency, error rates, generation success rate)
  - [ ] Set up alerts (error rate >1%, API latency >500ms)
  - [ ] Monitor database performance (query times, connection pool)
- [ ] **User Communication**:
  - [ ] Create user documentation (help center articles)
  - [ ] Create video tutorial (Hebrew + English)
  - [ ] Send announcement email to users
  - [ ] In-app announcement banner
- [ ] **Post-Deployment**:
  - [ ] Gather user feedback (in-app survey)
  - [ ] Monitor support tickets
  - [ ] Track feature usage analytics
  - [ ] Create summary report

**Deliverables**:
- ✅ Feature live in production for all users
- ✅ Data migrated successfully (0% data loss)
- ✅ Monitoring and alerts in place
- ✅ User documentation published
- ✅ No critical incidents during rollout

**Success Criteria**:
- Migration completes without errors
- Error rate remains <0.5%
- Performance metrics maintained (no degradation)
- User adoption >50% within 2 weeks
- <10 support tickets related to new feature

---

## Success Metrics

### Technical Metrics
- **Page Load Time**: < 2 seconds (p95)
- **API Response Time**: < 200ms (p95)
- **Image Load Time**: < 500ms per image (p95)
- **Composite Generation Time**: < 60 seconds
- **Test Coverage**: > 80%
- **Error Rate**: < 0.5%
- **Uptime**: 99.9%

### Business Metrics
- **Adoption Rate**: 80% of active projects use holistic page within 30 days
- **Composite Generation Usage**: 20% of designers use feature (as estimated in requirements)
- **Image Upload**: Average 80+ categorized images per project (vs. current baseline)
- **Time Saved**: 50% reduction in time to create inspiration boards
- **User Satisfaction**: > 4.5/5 in post-launch survey

### User Feedback
- Collect feedback via in-app survey after 2 weeks of usage
- Track support tickets related to new feature
- Monitor feature usage analytics (GA4 events)
- Conduct user interviews with 5-10 designers

---

## Open Questions & Blockers

### Blockers
1. **❌ Composite Mood Board Format**: Waiting for example image from user to understand exact Pinterest-style format and layout requirements
2. **🔹 AI Generation Cost**: Need to clarify budget for Gemini API usage (estimate: $0.10-0.50 per composite generation)
3. **🔹 Queue System**: Decide between Inngest (recommended), AWS SQS, or Vercel Cron for background job processing

### Open Questions
1. Should we support **custom image limits per organization**? (e.g., premium orgs get 100 overview images instead of 60)
2. Should **clients** be able to generate composite images, or only internal team? (Security/cost consideration)
3. Do we need **versioning for inspiration pages**? (e.g., save historical composites when regenerating)
4. Should we support **exporting inspiration page as PDF**? (Designers may want to share with clients offline)
5. Should we add **AI-generated descriptions** for each section/category? (e.g., "This project combines modern minimalism with warm natural materials...")
6. How should we handle **projects with >24 rooms**? (Currently assumes ~24 rooms, but some projects may have more)
7. Should textures have their **own dedicated gallery section** or remain integrated with materials?

---

## Risks & Mitigation

### Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| AI generation too slow (>2 min) | High | Medium | Implement queue with progress tracking; set realistic expectations |
| Image storage costs exceed budget | High | Low | Monitor R2 usage; implement image compression; set upload limits |
| Migration fails on production data | Critical | Low | Extensive testing on staging; backup before migration; rollback plan |
| Performance degradation with 100+ images | Medium | Medium | Implement virtual scrolling; lazy loading; CDN optimization |
| Rate limiting too restrictive | Low | Medium | Monitor usage patterns; adjust limits based on data |

### Business Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Users don't understand new structure | High | Medium | Clear documentation; video tutorials; in-app guidance |
| Designers prefer old room-based approach | Medium | Low | Feature flag for rollback; gather feedback early (Phase 5) |
| Composite generation quality disappoints users | High | Medium | **Wait for user example**; iterate on prompt; offer regeneration |
| Increased support load | Low | Medium | Comprehensive FAQ; video tutorials; proactive communication |

---

## References

- **Requirements Document**: `/Memory/fixs-phase-2.md`
- **Existing Phase 2 Plan** (Different scope - 4 walls): `/PHASE2_TECHNICAL_PLAN.md`
- **MoodB Standards**: `/CLAUDE.md`
- **Auth Documentation**: `/docs/AUTHENTICATION.md`
- **Troubleshooting Guide**: `/docs/TROUBLESHOOTING.md`
- **Performance Report**: `/PERFORMANCE_OPTIMIZATION_REPORT.md`
- **Prisma Schema**: `/prisma/schema.prisma`
- **Existing Seed Service**: `/src/lib/seed/seed-service.ts` (for AI integration patterns)
- **Gemini AI Integration**: `/src/lib/ai/gemini.ts`
- **Image Generation Service**: `/src/lib/ai/image-generation.ts`

---

## Next Steps (Immediate)

1. **✅ Review & Approval**: Present this plan to stakeholders for feedback and approval
2. **❌ BLOCKER: Obtain Example**: Get composite mood board example from user to finalize AI generation design
3. **🔹 Finalize AI Integration**: Decide on queue system (Inngest recommended) and confirm budget for AI generation
4. **🔹 Kick Off Phase 1**: Start database schema changes and migration script development
5. **🔹 Set Up Project Tracking**: Create tickets/tasks in project management tool (Jira, Linear, etc.)

---

**Document Version**: 1.0
**Last Updated**: 2025-11-20
**Author**: Claude (AI Assistant)
**Status**: Draft - Pending Approval
**Related To**: `/Memory/fixs-phase-2.md` (Requirements)

---

## Appendix A: Comparison with Existing Phase 2 Plan

**Note**: There is an existing `/PHASE2_TECHNICAL_PLAN.md` document that covers a different "Phase 2" focused on:
- Deep inspiration with 4 spatial views (N/S/E/W) per room
- "Golden 6 Scenes" with specific complementary colors
- Price tiering (Luxury vs Affordable)
- Style gallery items with metadata

**This document (Holistic Inspiration Page Plan)** is separate and covers:
- Single holistic page per project (not per room)
- Image categorization (Overview, Detail, Materials, Textures)
- Room categorization system (Super/Sub categories)
- AI-generated composite mood boards and anchor images

These are **two distinct initiatives** that can be developed independently or sequentially.

---

## Appendix B: Example API Request/Response

### Example: Fetch Inspiration Page

**Request**:
```http
GET /api/projects/proj_abc123/inspiration
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response**:
```json
{
  "inspirationPage": {
    "id": "insp_xyz789",
    "projectId": "proj_abc123",
    "compositeImageUrl": "https://cdn.moodbapp.com/composites/proj_abc123_composite.jpg",
    "anchorImageUrl": "https://cdn.moodbapp.com/anchors/proj_abc123_anchor.jpg",
    "generatedAt": "2025-11-15T10:30:00Z",
    "generationStatus": "completed"
  },
  "images": {
    "roomOverview": [
      {
        "id": "img_001",
        "url": "https://cdn.moodbapp.com/images/img_001.jpg",
        "imageCategory": "ROOM_OVERVIEW",
        "displayOrder": 0,
        "tags": ["living-room", "modern"],
        "createdAt": "2025-11-10T08:00:00Z"
      },
      // ... 59 more images
    ],
    "materials": [
      {
        "id": "img_100",
        "url": "https://cdn.moodbapp.com/images/img_100.jpg",
        "imageCategory": "MATERIAL",
        "displayOrder": 0,
        "description": "Oak wood flooring",
        "tags": ["wood", "flooring"],
        "createdAt": "2025-11-10T09:00:00Z"
      },
      // ... 24 more materials
    ],
    "textures": [
      {
        "id": "img_200",
        "url": "https://cdn.moodbapp.com/images/img_200.jpg",
        "imageCategory": "TEXTURE",
        "displayOrder": 0,
        "description": "Matte white finish",
        "tags": ["white", "matte"],
        "createdAt": "2025-11-10T09:30:00Z"
      },
      // ... 14 more textures
    ]
  },
  "rooms": [
    {
      "id": "room_001",
      "name": "סלון",
      "type": "living-room",
      "superCategory": "PRIVATE",
      "subCategory": "בית רגיל",
      "imageCount": 5,
      "thumbnail": "https://cdn.moodbapp.com/images/img_015.jpg",
      "inspirationPageEnabled": true
    },
    // ... more rooms
  ],
  "stats": {
    "totalImages": 105,
    "totalRooms": 8,
    "roomsWithDetails": 6
  }
}
```

### Example: Generate Composite

**Request**:
```http
POST /api/projects/proj_abc123/inspiration/generate-composite
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "includeRoomOverview": true,
  "includeMaterials": true,
  "includeTextures": true,
  "style": "pinterest-collage",
  "maxImages": 50
}
```

**Response**:
```json
{
  "jobId": "job_comp_456",
  "status": "queued",
  "estimatedTime": 45,
  "message": "Composite generation queued. You'll be notified when it's ready."
}
```

### Example: Poll Generation Status

**Request**:
```http
GET /api/projects/proj_abc123/inspiration/generation-status?jobId=job_comp_456
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (In Progress)**:
```json
{
  "jobId": "job_comp_456",
  "status": "processing",
  "progress": 65,
  "message": "Generating composite image...",
  "createdAt": "2025-11-20T14:00:00Z"
}
```

**Response (Completed)**:
```json
{
  "jobId": "job_comp_456",
  "status": "completed",
  "progress": 100,
  "imageUrl": "https://cdn.moodbapp.com/composites/proj_abc123_composite_v2.jpg",
  "message": "Composite generated successfully",
  "createdAt": "2025-11-20T14:00:00Z",
  "completedAt": "2025-11-20T14:00:45Z"
}
```
