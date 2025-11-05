# Bug Fix: Empty String ObjectID Error

**Date**: January 5, 2025
**Status**: ✅ Fixed

## Problem

Style updates were failing with 500 error:
```
Prisma Error P2023: Malformed ObjectID: provided hex string representation
must be exactly 12 bytes, instead got: "", length 0.
```

## Root Cause

The `materialSet.defaults[].supplierId` field was being sent as an **empty string** `""` instead of `undefined` or a valid ObjectID. Prisma MongoDB provider cannot accept empty strings for ObjectID fields.

### Data Flow
```
StyleForm → API → Prisma
supplierId: "" → supplierId: "" → ❌ CRASH!
```

## Solution

Convert empty strings to `undefined` for ObjectID fields before Prisma operations.

### Code Changes

**1. PATCH /api/admin/styles/[id] (Line 340-359)**
```typescript
// Clean empty strings from ObjectID fields
const cleanedMaterialSet = {
  defaults: (body.materialSet.defaults || []).map((d: any) => ({
    materialId: d.materialId,
    usageArea: d.usageArea || undefined,
    defaultFinish: d.defaultFinish || undefined,
    // Convert empty string to undefined for ObjectID field
    supplierId: d.supplierId && d.supplierId !== '' ? d.supplierId : undefined,
  })),
  alternatives: body.materialSet.alternatives || [],
}
```

**2. POST /api/admin/styles (Line 266-271)**
```typescript
.map((d: any) => ({
  materialId: d.materialId,
  usageArea: d.usageArea || undefined,
  defaultFinish: d.defaultFinish || undefined,
  // Convert empty string to undefined for ObjectID field
  supplierId: d.supplierId && d.supplierId !== '' && isValidObjectId(d.supplierId) ? d.supplierId : undefined,
}))
```

## Affected Fields

- `materialSet.defaults[].supplierId`
- Any optional ObjectID field that can be empty string from form inputs

## Prevention

### Best Practice
Always convert empty strings to `undefined` for optional ObjectID fields:
```typescript
optionalId: value && value !== '' ? value : undefined
```

### Validation Layer
Consider adding Zod transform at validation level:
```typescript
supplierId: z.union([
  z.string().regex(/^[0-9a-fA-F]{24}$/),
  z.literal(''),
]).optional().transform(val => val === '' ? undefined : val)
```

## Testing

✅ Style creation with empty supplierId
✅ Style update with empty supplierId
✅ Style update with valid supplierId
✅ No more P2023 Prisma errors

## Related Issues

- Image upload blob URL filtering (separate fix)
- Client/server validation schema separation (separate fix)

## Files Modified

1. `/src/app/api/admin/styles/[id]/route.ts` - PATCH endpoint
2. `/src/app/api/admin/styles/route.ts` - POST endpoint
