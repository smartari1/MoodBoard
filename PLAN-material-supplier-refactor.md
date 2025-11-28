# Plan: Material-Supplier Data Model Refactor

## Overview
Refactor the material-supplier relationship so that **pricing, availability, and colors** are stored per supplier (MaterialSupplier) rather than on the base Material entity.

---

## Phase 1: Schema Changes

### 1.1 Update MaterialSupplier Model
**File:** `prisma/schema.prisma`

Move these fields FROM Material TO MaterialSupplier:
- `pricing` (cost, retail, unit, currency, bulkDiscounts)
- `availability` (inStock, leadTime, minOrder)
- `colorIds` (array of color IDs)

```prisma
model MaterialSupplier {
  id             String       @id @default(auto()) @map("_id") @db.ObjectId
  materialId     String       @db.ObjectId
  organizationId String       @db.ObjectId

  material       Material     @relation(fields: [materialId], references: [id], onDelete: Cascade)
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  // Supplier-specific identifiers
  supplierSku    String?      // SKU used by this supplier

  // Supplier-specific colors (each supplier may offer different colors)
  colorIds       String[]     @db.ObjectId

  // Supplier-specific pricing
  pricing        MaterialSupplierPricing?

  // Supplier-specific availability
  availability   MaterialSupplierAvailability?

  // Metadata
  isPreferred    Boolean      @default(false)
  notes          String?

  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @default(now())

  @@unique([materialId, organizationId])
  @@index([materialId])
  @@index([organizationId])
  @@map("material_suppliers")
}

// Embedded type for supplier pricing
type MaterialSupplierPricing {
  cost          Float
  retail        Float
  unit          String       // 'sqm' | 'unit' | 'linear_m'
  currency      String       // 'ILS' | 'USD' | 'EUR'
  bulkDiscounts MaterialBulkDiscount[]
}

// Embedded type for supplier availability
type MaterialSupplierAvailability {
  inStock       Boolean
  leadTime      Int          // Days
  minOrder      Int
}
```

### 1.2 Update Material Model
**File:** `prisma/schema.prisma`

Remove from Material:
- `pricing` (entire object)
- `availability` (entire object)
- `colorIds` from properties

Keep on Material:
- id, sku, name, categoryId, textureId
- properties (typeId, subType, finish, texture, dimensions, technical)
- assets (thumbnail, images, texture, technicalSheet)
- suppliers relation

```prisma
model Material {
  id             String         @id @default(auto()) @map("_id") @db.ObjectId

  suppliers      MaterialSupplier[]

  sku            String?        @unique
  name           LocalizedString
  categoryId     String         @db.ObjectId
  textureId      String?        @db.ObjectId

  // Shared properties (same across all suppliers)
  properties     MaterialProperties

  // Shared assets (same images for all suppliers)
  assets         MaterialAssets?

  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @default(now())

  @@index([categoryId])
  @@index([textureId])
  @@map("materials")
}

// Updated - removed colorIds
type MaterialProperties {
  typeId         String
  subType        String
  finish         String[]
  texture        String
  // colorIds REMOVED - now per supplier
  dimensions     MaterialDimensions?
  technical      MaterialTechnicalSpecs
}
```

### 1.3 Run Schema Push
```bash
npx prisma db push
```

---

## Phase 2: Validation Schema Changes

### 2.1 Update Material Validation
**File:** `src/lib/validations/material.ts`

- Remove `pricing`, `availability` from createMaterialSchema/updateMaterialSchema
- Remove `colorIds` from materialPropertiesSchema
- Create new `materialSupplierSchema` for supplier-specific data

```typescript
// Material schema (base - shared)
export const createMaterialSchema = z.object({
  sku: z.string().min(1),
  name: localizedStringSchema,
  categoryId: z.string(),
  textureId: z.string().optional().nullable(),
  properties: materialPropertiesSchema, // Without colorIds
  assets: materialAssetsSchema.optional(),
  // Suppliers with their specific data
  suppliers: z.array(supplierDataSchema).optional().default([]),
})

// Supplier-specific data
export const supplierDataSchema = z.object({
  organizationId: z.string(),
  supplierSku: z.string().optional(),
  colorIds: z.array(z.string()).optional().default([]),
  pricing: pricingSchema,
  availability: availabilitySchema,
  isPreferred: z.boolean().default(false),
  notes: z.string().optional(),
})
```

---

## Phase 3: API Changes

### 3.1 Update GET /api/admin/materials
**File:** `src/app/api/admin/materials/route.ts`

- Include suppliers with their pricing, availability, colorIds
- Return structured response with supplier details

### 3.2 Update GET /api/admin/materials/[id]
**File:** `src/app/api/admin/materials/[id]/route.ts`

- Include full supplier details with pricing, availability, colors

### 3.3 Update POST /api/admin/materials
**File:** `src/app/api/admin/materials/route.ts`

- Accept suppliers array with pricing/availability/colors per supplier
- Create MaterialSupplier records with full data

### 3.4 Update PATCH /api/admin/materials/[id]
**File:** `src/app/api/admin/materials/[id]/route.ts`

- Handle supplier updates (add/remove/modify)
- Update pricing, availability, colors per supplier

### 3.5 Create Supplier-Specific Endpoints (Optional)
**Files:** New routes

```
POST   /api/admin/materials/[id]/suppliers     - Add supplier to material
PATCH  /api/admin/materials/[id]/suppliers/[supplierId] - Update supplier details
DELETE /api/admin/materials/[id]/suppliers/[supplierId] - Remove supplier
```

---

## Phase 4: TypeScript Types

### 4.1 Update Material Interface
**File:** `src/hooks/useMaterials.ts`

```typescript
export interface MaterialSupplier {
  id: string
  materialId: string
  organizationId: string
  organization?: {
    id: string
    name: string
    slug: string
  }
  supplierSku?: string | null
  colorIds: string[]
  pricing: {
    cost: number
    retail: number
    unit: 'sqm' | 'unit' | 'linear_m'
    currency: string
    bulkDiscounts: Array<{ minQuantity: number; discount: number }>
  }
  availability: {
    inStock: boolean
    leadTime: number
    minOrder: number
  }
  isPreferred: boolean
  notes?: string | null
}

export interface Material {
  id: string
  sku: string | null
  name: { he: string; en: string }
  categoryId: string
  textureId?: string | null
  properties: {
    typeId: string
    subType: string
    finish: string[]
    texture: string
    // colorIds REMOVED
    dimensions?: { ... } | null
    technical: { ... }
  }
  assets: { ... }
  suppliers?: MaterialSupplier[]
  // pricing REMOVED
  // availability REMOVED
}
```

---

## Phase 5: Frontend Changes

### 5.1 Update Material Form (New)
**File:** `src/app/[locale]/admin/materials/new/page.tsx`

- Remove pricing, availability, colorIds from main form
- Add "Suppliers" section with ability to add multiple suppliers
- Each supplier entry has:
  - Organization select
  - Supplier SKU
  - Colors MultiSelect
  - Pricing fields (cost, retail, unit, currency, bulk discounts)
  - Availability fields (inStock, leadTime, minOrder)
  - isPreferred toggle
  - notes

### 5.2 Update Material Form (Edit)
**File:** `src/app/[locale]/admin/materials/[id]/edit/page.tsx`

- Same as above
- Load existing supplier data
- Allow add/edit/remove suppliers

### 5.3 Create Supplier Card Component
**File:** `src/components/features/materials/SupplierCard.tsx`

Reusable component for displaying/editing supplier-specific data:
- Organization name
- Pricing info
- Availability status
- Available colors
- Add/Edit/Remove actions

### 5.4 Update Material List
**File:** `src/components/features/materials/MaterialList.tsx`

- Show suppliers count or first supplier info
- Maybe show price range if multiple suppliers

### 5.5 Update Material View Page
**File:** `src/app/[locale]/admin/materials/[id]/page.tsx` (if exists)

- Show base material info
- Show suppliers table/cards with their pricing/availability/colors

---

## Phase 6: Migration Script

### 6.1 Create Migration Script
**File:** `scripts/migrate-material-pricing-to-suppliers.ts`

```typescript
// For each material:
// 1. If has pricing/availability/colorIds at material level
// 2. If has suppliers, copy pricing/availability/colorIds to first supplier
// 3. If no suppliers, create "global" indicator or leave as-is
// 4. Clean up old fields from material documents
```

---

## Implementation Order

### Batch 1: Backend Foundation
- [ ] 1.1 Update MaterialSupplier schema
- [ ] 1.2 Update Material schema (remove pricing/availability/colorIds)
- [ ] 1.3 Run prisma db push
- [ ] 2.1 Update validation schemas
- [ ] 4.1 Update TypeScript interfaces

### Batch 2: API Updates
- [ ] 3.1 Update GET /api/admin/materials
- [ ] 3.2 Update GET /api/admin/materials/[id]
- [ ] 3.3 Update POST /api/admin/materials
- [ ] 3.4 Update PATCH /api/admin/materials/[id]

### Batch 3: Migration
- [ ] 6.1 Create and run migration script

### Batch 4: Frontend - Forms
- [ ] 5.3 Create SupplierCard component
- [ ] 5.1 Update Material New form
- [ ] 5.2 Update Material Edit form

### Batch 5: Frontend - Display
- [ ] 5.4 Update Material List
- [ ] 5.5 Update Material View page

---

## UI Mockup: Supplier Section in Form

```
┌─────────────────────────────────────────────────────────────┐
│ Suppliers                                        [+ Add]    │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Supplier: Premium Woods Ltd              [★ Preferred]  │ │
│ │ SKU: PWL-OAK-FL                                    [✕]  │ │
│ │                                                         │ │
│ │ Colors: [Natural] [Honey] [Dark Walnut]                │ │
│ │                                                         │ │
│ │ Pricing:                                                │ │
│ │ Cost: ₪200    Retail: ₪280    Unit: sqm    ILS        │ │
│ │                                                         │ │
│ │ Availability:                                           │ │
│ │ [✓] In Stock    Lead Time: 0 days    Min Order: 10     │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Supplier: Budget Floors                          [✕]    │ │
│ │ SKU: BF-12345                                           │ │
│ │                                                         │ │
│ │ Colors: [Natural] [Light Oak]                          │ │
│ │                                                         │ │
│ │ Pricing:                                                │ │
│ │ Cost: ₪120    Retail: ₪180    Unit: sqm    ILS        │ │
│ │                                                         │ │
│ │ Availability:                                           │ │
│ │ [ ] In Stock    Lead Time: 14 days   Min Order: 20     │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Questions to Confirm

1. **Global Materials**: Materials without suppliers - should they have default pricing/availability, or is it required to have at least one supplier?

2. **Color Inheritance**: Should suppliers inherit a "base" color list from the material, or each supplier defines their own completely?

3. **Bulk Discounts**: Keep per-supplier or simplify?

4. **Images per Supplier**: Currently shared - is this correct, or should suppliers have their own images?
