# UI Detailed Content Display

## Overview

The admin UI now displays **AI-generated detailed content** for all style engine entities (Approaches, Categories, SubCategories, Styles, RoomTypes).

## Features Added

### 1. DetailedContentViewer Component

**Location**: `src/components/features/style-system/DetailedContentViewer.tsx`

A comprehensive viewer component with **3 tabs**:

#### Tab 1: Overview (סקירה כללית / Overview)
- **Introduction** (פתיח) - Brief 2-3 sentence overview
- **Description** (תיאור) - Full detailed description
- **Philosophy** (פילוסופיה) - Design philosophy (for approaches)
- **Period** (תקופה) - Historical period badge

#### Tab 2: Full Details (פרטים מלאים / Full Details)
Accordion-based detailed sections:
- ✅ **Key Characteristics** (מאפיינים מרכזיים) - Bulleted list of defining features
- 👁️ **Visual Elements** (אלמנטים ויזואליים) - Common visual elements
- 🎨 **Color Guidance** (הנחיות צבעים) - Color palette recommendations
- 🧩 **Material Guidance** (הנחיות חומרים) - Material and texture guidance
- 💡 **Applications** (תחומי יישום) - Use cases and applications
- 📖 **Historical Context** (רקע היסטורי) - Historical background and evolution
- 🌍 **Cultural Context** (הקשר תרבותי) - Cultural influences and significance

#### Tab 3: Bilingual (דו־לשוני / Bilingual)
Side-by-side Hebrew and English content comparison:
- 🇮🇱 Hebrew (עברית)
- 🇬🇧 English

### 2. Integration with ApproachesTable

**Location**: `src/components/features/style-system/ApproachesTable.tsx`

**What's New:**
- Added "View Full Details" (הצג פרטים מלאים) menu item
- Only shows if `detailedContent` exists
- Opens a modal with the DetailedContentViewer component
- Fully supports RTL for Hebrew

## Usage

### For End Users

1. Navigate to **Admin → Style System → Approaches** (`/he/admin/style-system/approaches`)
2. Click the **⋮** (three dots) menu on any approach
3. Select **"הצג פרטים מלאים"** (View Full Details)
4. Explore the three tabs:
   - **Overview** - Quick summary
   - **Full Details** - Comprehensive information
   - **Bilingual** - Compare Hebrew/English

### UI Flow

```
ApproachesTable
    ↓
    ├─ Table Row → ⋮ Menu
    │               ├─ 👁️ View Full Details (if detailedContent exists)
    │               ├─ ✏️ Edit
    │               └─ 🗑️ Delete
    ↓
DetailedContentViewer Modal
    ├─ Tab 1: Overview
    ├─ Tab 2: Full Details (Accordion)
    └─ Tab 3: Bilingual Comparison
```

## Technical Details

### Component Props

```typescript
interface DetailedContentViewerProps {
  content: LocalizedDetailedContent      // The AI-generated content
  entityName: { he: string; en: string } // Entity display name
  entityType?: 'approach' | 'category' | 'subcategory' | 'style' | 'roomType'
}
```

### Data Structure

```typescript
interface DetailedContent {
  introduction?: string       // Brief intro (2-3 sentences)
  description?: string        // Full description
  period?: string            // Historical period
  characteristics?: string[] // Key features
  visualElements?: string[]  // Visual elements
  philosophy?: string        // Design philosophy
  colorGuidance?: string     // Color recommendations
  materialGuidance?: string  // Material recommendations
  applications?: string[]    // Use cases
  historicalContext?: string // Historical background
  culturalContext?: string   // Cultural influences
}

interface LocalizedDetailedContent {
  he: DetailedContent
  en: DetailedContent
}
```

## Extending to Other Entities

To add detailed content display to **Categories**, **SubCategories**, **RoomTypes**, or **Styles**:

### Step 1: Import the Component

```typescript
import { DetailedContentViewer } from './DetailedContentViewer'
```

### Step 2: Add State and Menu Item

```typescript
// Add state
const [viewDetailsEntity, setViewDetailsEntity] = useState<any>(null)

// In the Menu.Dropdown
{entity.detailedContent && (
  <>
    <Menu.Item
      leftSection={<IconEye size={16} />}
      onClick={() => setViewDetailsEntity(entity)}
    >
      {locale === 'he' ? 'הצג פרטים מלאים' : 'View Full Details'}
    </Menu.Item>
    <Menu.Divider />
  </>
)}
```

### Step 3: Add Modal

```typescript
<Modal
  opened={!!viewDetailsEntity}
  onClose={() => setViewDetailsEntity(null)}
  title={viewDetailsEntity?.name[locale as 'he' | 'en']}
  size="xl"
  dir={locale === 'he' ? 'rtl' : 'ltr'}
>
  {viewDetailsEntity?.detailedContent && (
    <DetailedContentViewer
      content={viewDetailsEntity.detailedContent}
      entityName={viewDetailsEntity.name}
      entityType="category" // or "subcategory", "style", "roomType"
    />
  )}
</Modal>
```

## Benefits

✅ **Rich Content Display** - Shows all AI-generated detailed content
✅ **RTL Support** - Full Hebrew/Arabic support
✅ **Organized Structure** - Tabs and accordions for easy navigation
✅ **Bilingual Comparison** - Side-by-side Hebrew/English view
✅ **Reusable Component** - Works for all entity types
✅ **Professional UI** - Clean, modern interface with Mantine components

## Screenshots Locations

After seeding content, view examples at:
- Approaches: `http://localhost:3001/he/admin/style-system/approaches`
- Categories: `http://localhost:3001/he/admin/style-system/categories` (add component)
- SubCategories: `http://localhost:3001/he/admin/style-system/sub-categories` (add component)
- RoomTypes: `http://localhost:3001/he/admin/style-system/room-types` (add component)

## Next Steps

1. ✅ Test the viewer with the existing "Eclectic" approach
2. 🔄 Seed all approaches, categories, etc. to populate content
3. 📝 Add DetailedContentViewer to Categories, SubCategories, RoomTypes tables
4. 🎨 Optionally: Add a "Quick Preview" tooltip on hover
5. 📱 Test responsive design on mobile devices
