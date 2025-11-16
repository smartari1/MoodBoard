# MoodB Technical Implementation Plan

**Last Updated:** January 29, 2025

## Recent Updates (December 2024)

### ✅ Phase 2 - Colors Management - COMPLETE (January 2025)

**1. Color Management System**
- Implemented comprehensive color management with neutral/accent/semantic categories
- Color model includes hex, pantone, category, role (for semantic colors), usage tracking
- Full CRUD operations through admin API and UI
- Colors integrated with Style model (each style references a colorId)
- React Query hooks for real-time color management
- Complete translations (Hebrew + English)

**2. Admin Colors UI**
- Colors list page with search and category filtering
- Create/edit color pages with form validation
- Color detail display with usage statistics
- Integration with Style creation workflow

### ✅ Phase 2 - Category & SubCategory System - COMPLETE (January 2025)

**1. 2-Layer Category System**
- Implemented hierarchical category structure: Category → SubCategory → Style
- Each style belongs to both a category and sub-category
- Categories and sub-categories managed through separate admin pages
- Full CRUD operations for both levels
- Validation ensures sub-categories belong to their parent category

**2. Database Schema Updates**
- Added Category model (name, slug, order, timestamps)
- Added SubCategory model (categoryId, name, slug, order, timestamps)
- Updated Style model to use categoryId and subCategoryId (replaced string category)
- Relationships: Category has many SubCategories, SubCategory belongs to Category
- Both Category and SubCategory have many Styles

**3. API Implementation**
- Category API: `/api/admin/categories` (GET, POST, GET/[id], PATCH/[id], DELETE/[id])
- SubCategory API: `/api/admin/sub-categories` (GET, POST, GET/[id], PATCH/[id], DELETE/[id])
- Updated Style APIs to use categoryId and subCategoryId
- Added validation to ensure category/sub-category relationships
- Error handling for missing models and invalid relationships

**4. Admin UI**
- Categories management page (`/admin/categories`) with search, create, edit, delete
- Sub-categories management page (`/admin/sub-categories`) with category filter
- Updated styles page with category/sub-category filters and display
- Admin navigation updated with Categories and Sub-Categories links

**5. Developer Experience**
- React Query hooks for categories (`useCategories.ts`)
- Type-safe validation schemas (Zod)
- Complete translations (Hebrew + English)
- Fixed Prisma client caching in development mode

### ✅ Phase 2 - Admin Area & Style Management - IN PROGRESS (65% Complete)

**1. Admin Area & Protection System**
- Multi-layer admin protection:
  - Next.js middleware protection for `/admin/*` routes
  - Server-side layout protection (session checks)
  - Client-side component protection (`useAdminGuard` hook)
  - API endpoint protection (`withAdmin` wrapper)
  - React Query hooks protection (prevents non-admin calls)
- Admin utilities: `scripts/set-admin.ts`, `pnpm admin:set` command
- Complete documentation: `docs/ADMIN_ACCESS.md`

**2. Style Management APIs**
- Admin Styles API (`/api/admin/styles`) - Full CRUD + approvals
- User Styles API (`/api/styles`) - Create, browse, filter styles
- Style approval workflow (approve/reject public styles)
- Complete Zod validation schemas
- Protected React Query hooks

**3. Admin UI Pages**
- Admin Dashboard with statistics
- Admin Styles Management (list, search, filter, delete)
- Admin Style Approvals (approve/reject workflow)
- Admin Style Detail (palette, materials, rooms tabs)
- Admin Style Create Page (full multi-tab form wizard) ✅ COMPLETE (January 2025)
- Admin Style Edit Page (full multi-tab form with all features) ✅ COMPLETE (January 2025)
- Admin Colors Management (list, create, edit, delete) ✅ NEW
- Admin Categories Management (list, create, edit, delete) ✅ NEW
- Admin Sub-Categories Management (list, create, edit, delete) ✅ NEW
- Admin Materials Management (list, create, edit, delete) ✅ COMPLETE (January 2025)
- Admin Materials Settings (Categories/Types tabs with full CRUD) ✅ COMPLETE (January 2025)
- Admin Users Management (list, detail, search, filter) ✅ NEW
- Placeholder page (organizations)

**4. Style Form Architecture** ✅ COMPLETE (January 2025)
- **StyleForm Component** (`src/components/features/style-engine/StyleForm.tsx`):
  - Multi-tab form wizard (Basic Info, Color, Materials, Rooms)
  - React Hook Form + Zod validation
  - **Image Upload Pattern (Critical):**
    - **Edit Mode**: Pass `entityId` to ImageUpload → Images upload immediately → Trust URLs (don't filter blob URLs)
    - **Create Mode**: No `entityId` → Track pending files → Filter blob URLs on submit → Upload after creation
  - Room profile management with dynamic field arrays
  - Material selection (general defaults + room-specific)
  - Validation error handling with auto-scroll and tab switching
  - **Key Fix**: In edit mode, don't filter blob URLs before submission - ImageUpload handles uploads automatically
- **ImageUpload Component** (`src/components/ui/ImageUpload.tsx`):
  - Drag & drop support with preview
  - **Creation Mode** (no entityId): Local file storage with blob URLs, tracks pending files via `onPendingFilesChange`
  - **Edit Mode** (with entityId): Direct GCP Storage upload immediately when files are added
  - Multi-image support (up to 20 images)
  - File validation (type, size - 10MB max)
  - Automatically uploads when `entityId` is provided
- **useImageUpload Hook** (`src/hooks/useImageUpload.ts`):
  - Upload/delete mutations with TanStack Query
  - File cloning to prevent FileSystemFileHandle issues
  - Loading and error state management
- **Validation Schemas** (`src/lib/validations/style.ts`):
  - Complete Zod schemas for create/update operations
  - Material sets, room profiles, localized strings
  - ObjectID validation for MongoDB
- **Page Components**:
  - Create page: Uses StyleForm in "create" mode
  - Edit page: Uses StyleForm in "edit" mode with data loading
- **Key Features**:
  - Form state persistence across tab switches
  - RTL support and internationalization
  - Comprehensive error handling
  - Image upload with deferred creation mode
  - Room type uniqueness enforcement

**5. Database Decision**
- **Prisma over Mongoose** - Optimal for TypeScript strict mode
- No migrations needed with MongoDB (`db push` only)
- Type-safe queries throughout codebase

## Recent Updates (November 2, 2025)

### ✅ Phase 1 - CRM & Client Management - COMPLETED
We've successfully implemented the full Client Management module with the following components:

**1. UI Component Library (20+ components)**
- Base components: MoodBCard, MoodBButton, MoodBInput, MoodBTextarea, MoodBSelect, MoodBNumberInput, MoodBCheckbox
- Complex components: MoodBModal, MoodBTable (with Head, Body, Row, Header, Cell sub-components)
- Status components: MoodBBadge (5 variants: success, warning, error, info, default)
- State components: EmptyState, LoadingState, ErrorState, ConfirmDialog
- Form components: FormField, FormSection, FormActions
- All components use MoodB brand colors and support RTL

**2. Multi-Tenancy & Security Infrastructure**
- RBAC system with 5 roles: designer_owner, designer_member, client, supplier, admin
- 20+ granular permissions (org:read, org:write, project:create, client:create, etc.)
- API middleware: withAuth(), requirePermission(), handleError()
- Custom error classes: AppError, UnauthorizedError, ForbiddenError, NotFoundError, ValidationError, ConflictError
- Prisma client singleton with proper logging

**3. Client Management API**
- Full CRUD endpoints: POST /api/clients, GET /api/clients (with search/filter/pagination)
- Individual client: GET/PATCH/DELETE /api/clients/[id]
- Hybrid tag system: 9 predefined tags + custom tags support
- Organization scoping on all queries (multi-tenancy enforcement)
- Zod validation on all inputs
- Full RBAC permission checks

**4. Client Management UI**
- Clients list page with search, tag filtering, pagination
- Lightweight ClientFormDrawer component (Drawer slides from right)
- React Hook Form + Zod validation
- Collapsible preferences section (budget range, special needs)
- Multi-select tags with search and create functionality
- Empty/Loading/Error states
- Delete confirmation dialog
- Actions menu for view/edit/delete

**5. Internationalization**
- 50+ translation keys for client management
- Full Hebrew translations (RTL)
- Full English translations
- Covers: forms, tables, messages, tags, actions

### 🔜 Next Steps
Based on the task list, the next priorities are:
1. Build Client detail page with expandable sections
2. Create Organization Settings page (currency, units, brand colors)
3. Start Project Management module

---

## Executive Summary
MoodB is a multi-tenant SaaS platform for interior design studios, providing comprehensive project management, style engine, budgeting, and client collaboration tools. Built on Next.js 14+ with MongoDB, emphasizing RTL support, real-time collaboration, and scalable architecture.

## System Architecture

### Core Technology Stack

#### Frontend Architecture
```
┌─────────────────────────────────────────────────────────┐
│                     Presentation Layer                   │
├───────────────────────────────────────────────────────────┤
│  Next.js 14+ (App Router)  │  Mantine UI (RTL)          │
│  React 18+                 │  Framer Motion              │
│  TanStack Query            │  Zustand                    │
│  React Hook Form + Zod     │  next-intl                 │
└─────────────────────────────────────────────────────────┘
```

#### Brand Colors & Design System ✅ IMPLEMENTED
```
MoodB Brand Colors:
- Primary Background: #f7f7ed (Light cream/beige)
- Brand Accent: #df2538 (MoodB Red - logos, titles, CTAs)
- Text Primary: #000000 (Black - body text)
- Text Inverse: #ffffff (White - for dark backgrounds)

Application:
- App background: #f7f7ed ✅ Implemented
- Headers & titles: #df2538 ✅ Implemented
- Logo: #df2538 ✅ Implemented
- Body text: #000000 ✅ Implemented
- Buttons primary: #df2538 ✅ Implemented
- Buttons secondary: #000000 ✅ Implemented

Implementation Details:
- Mantine theme provider configured with moodbTheme
- CSS variables in tokens.css
- Dynamic RTL/LTR support with Hebrew fonts (Heebo, Assistant)
- All UI components styled with brand colors
- Fixed Mantine CSS conflicts with Tailwind CSS v4
```

#### Backend Architecture
```
┌─────────────────────────────────────────────────────────┐
│                     API Layer                            │
├───────────────────────────────────────────────────────────┤
│  Next.js API Routes        │  tRPC (optional)            │
│  Prisma ORM               │  Zod Validation             │
│  NextAuth.js (Google OAuth)│  Rate Limiting              │
└─────────────────────────────────────────────────────────┘
```

#### Data & Infrastructure
```
┌─────────────────────────────────────────────────────────┐
│                  Data & Storage Layer                    │
├───────────────────────────────────────────────────────────┤
│  MongoDB Atlas            │  Google Cloud Storage       │
│  Redis (Upstash)          │  Meilisearch                │
│  Webhooks                 │  Event Streaming            │
└─────────────────────────────────────────────────────────┘
```

## Database Design

### Core Schema Architecture

```typescript
// Multi-tenancy & Authentication ✅ IMPLEMENTED
interface Organization {
  _id: ObjectId
  // clerkOrgId removed - using NextAuth.js instead
  name: string
  slug: string
  settings: {
    locale: 'he' | 'en' | 'ar'
    currency: 'ILS' | 'USD' | 'EUR'
    units: 'metric' | 'imperial'
    brand: {
      logo?: string
      primaryColor?: string  // Default: #df2538 (MoodB Red)
      secondaryColor?: string
      backgroundColor?: string  // Default: #f7f7ed
    }
    features: {
      aiAssist: boolean
      advancedBudgeting: boolean
    }
  }
  subscription: {
    plan: 'free' | 'pro' | 'enterprise'
    validUntil: Date
    seats: number
  }
  createdAt: Date
  updatedAt: Date
}

// User Management with RBAC ✅ IMPLEMENTED
interface User {
  _id: ObjectId
  email: string
  emailVerified?: Date
  image?: string
  name?: string
  // NextAuth.js fields
  accounts: Account[]  // Google OAuth accounts
  sessions: Session[]
  organizationId?: ObjectId  // Optional - created on signup
  role: 'designer_owner' | 'designer_member' | 'client' | 'supplier' | 'admin'
  permissions: string[]
  profile: {
    firstName: string
    lastName: string
    phone?: string
    avatar?: string
    email: string
    preferences?: {
      language: string
      notifications: NotificationSettings
    }
  }
  lastActive: Date
  createdAt: Date
}

// Project Management
interface Project {
  _id: ObjectId
  organizationId: ObjectId
  clientId: ObjectId
  name: string
  slug: string
  status: 'draft' | 'active' | 'review' | 'approved' | 'completed' | 'archived'
  
  // Style Configuration
  styleConfig: {
    baseStyleId: ObjectId
    customizations: StyleCustomization[]
  }
  
  // Room Management
  rooms: Room[]
  
  // Budget & Finance
  budget: {
    currency: string
    target: {
      min: number
      max: number
    }
    allocated: number
    spent: number
    lines: BudgetLine[]
    versions: BudgetVersion[]
  }
  
  // Timeline
  timeline: {
    startDate: Date
    targetEndDate: Date
    milestones: Milestone[]
  }
  
  // Collaboration
  team: TeamMember[]
  approvals: Approval[]
  comments: Comment[]
  
  // Metadata
  metadata: {
    createdBy: ObjectId
    createdAt: Date
    updatedAt: Date
    lastModifiedBy: ObjectId
  }
}

// Style Engine
interface Color {
  _id: ObjectId
  organizationId?: ObjectId  // null for global colors
  name: LocalizedString
  description?: LocalizedString
  hex: string  // Unique identifier
  pantone?: string
  category: 'neutral' | 'accent' | 'semantic'
  role?: 'primary' | 'secondary' | 'success' | 'warning' | 'error'  // For semantic colors
  usage: number  // How many styles use this color
}

interface Category {
  _id: ObjectId
  name: LocalizedString
  description?: LocalizedString
  slug: string  // Unique
  order: number
  images: string[]  // GCP Storage URLs
  subCategories: SubCategory[]
  styles: Style[]
}

interface SubCategory {
  _id: ObjectId
  categoryId: ObjectId
  name: LocalizedString
  description?: LocalizedString
  slug: string  // Unique within category
  order: number
  images: string[]  // GCP Storage URLs
  styles: Style[]
}

interface Style {
  _id: ObjectId
  organizationId?: ObjectId  // null for global styles
  slug: string
  name: LocalizedString
  categoryId: ObjectId  // References Category
  subCategoryId: ObjectId  // References SubCategory
  colorId: ObjectId  // References Color
  
  palette: {
    neutrals: ColorToken[]
    accents: ColorToken[]
    semantic: {
      primary: string
      secondary: string
      success: string
      warning: string
      error: string
    }
  }
  
  materialSet: {
    defaults: MaterialReference[]
    alternatives: MaterialAlternative[]
  }
  
  roomProfiles: RoomProfile[]
  
  metadata: {
    version: string
    isPublic: boolean
    tags: string[]
    usage: number
    rating: number
  }
}

// Material Catalog
interface Material {
  _id: ObjectId
  organizationId?: ObjectId
  sku: string
  name: LocalizedString
  category: MaterialCategory
  
  properties: {
    type: 'wood' | 'stone' | 'fabric' | 'metal' | 'glass' | 'ceramic' | 'composite'
    subType: string
    finish: string[]
    texture: string
    color: {
      hex: string
      name: string
      pantone?: string
    }
    dimensions: {
      width?: number
      height?: number
      thickness?: number
      unit: 'mm' | 'cm' | 'm'
    }
    technical: {
      durability: 1-10
      maintenance: 1-10
      sustainability: 1-10
      fireRating?: string
      waterResistance?: boolean
    }
  }
  
  pricing: {
    cost: number
    retail: number
    unit: 'sqm' | 'unit' | 'linear_m'
    currency: string
    bulkDiscounts: DiscountTier[]
  }
  
  availability: {
    inStock: boolean
    leadTime: number  // days
    minOrder: number
  }
  
  assets: {
    thumbnail: string
    images: string[]
    texture?: string
    technicalSheet?: string
  }
}
```

## API Architecture

### RESTful API Design

```typescript
// API Route Structure ✅ IMPLEMENTED
/api/
├── auth/
│   └── [...nextauth]   // NextAuth.js API route ✅ Implemented
│       // Handles: GET, POST for authentication
│       // Exports: handlers, auth, signIn, signOut
├── organizations/
│   ├── [orgId]/
│   │   ├── settings
│   │   ├── members
│   │   └── subscription
├── projects/
│   ├── create
│   ├── [projectId]/
│   │   ├── details
│   │   ├── rooms/
│   │   │   ├── create
│   │   │   └── [roomId]
│   │   ├── budget/
│   │   │   ├── calculate
│   │   │   ├── versions
│   │   │   └── export
│   │   ├── approvals/
│   │   └── share
├── styles/
│   ├── library        // Global styles
│   ├── custom         // Org-specific
│   └── [styleId]/
│       ├── apply
│       └── customize
├── admin/
│   ├── colors/        // ✅ IMPLEMENTED (January 2025)
│   │   ├── route.ts   // GET, POST
│   │   └── [id]/
│   │       └── route.ts  // GET, PATCH, DELETE
│   ├── categories/    // ✅ IMPLEMENTED (January 2025)
│   │   ├── route.ts   // GET, POST
│   │   └── [id]/
│   │       └── route.ts  // GET, PATCH, DELETE
│   └── sub-categories/ // ✅ IMPLEMENTED (January 2025)
│       ├── route.ts   // GET, POST
│       └── [id]/
│           └── route.ts  // GET, PATCH, DELETE
├── materials/
│   ├── catalog
│   ├── search
│   └── [materialId]
├── clients/                   ✅ IMPLEMENTED (Nov 2, 2025)
│   ├── route.ts              # POST (create), GET (list with filters)
│   ├── [id]/
│   │   └── route.ts          # GET (detail), PATCH (update), DELETE (delete)
│   # Features:
│   # - Multi-tenancy enforcement (organizationId scoping)
│   # - Hybrid tag system (9 predefined + custom tags)
│   # - Search by name/email, filter by tags, pagination
│   # - Full RBAC permission checks
│   # - Zod validation on all inputs
└── uploads/
    ├── presigned-url
    └── process
```

### API Security Layers

```typescript
// Middleware Stack ✅ IMPLEMENTED
export const apiMiddleware = [
  nextAuth(),           // Authentication (NextAuth.js) ✅ Implemented
  // Custom middleware with getToken from next-auth/jwt
  // Handles locale-aware redirects
  // Protects routes and redirects authenticated users from auth pages
  rateLimit(),           // Rate limiting (Planned)
  validateOrg(),         // Organization validation ✅ Implemented
  checkPermissions(),    // RBAC (Planned)
  auditLog(),           // Audit trail (Planned)
  errorHandler()        // Error handling ✅ Implemented
]

// Permission Matrix
const permissions = {
  designer_owner: ['*'],
  designer_member: [
    'project:read',
    'project:write',
    'client:read',
    'client:write',
    'material:read',
    'style:read',
    'style:write'
  ],
  client: [
    'project:read:own',
    'project:comment',
    'project:approve'
  ],
  supplier: [
    'material:read:own',
    'material:write:own',
    'quote:create'
  ]
}
```

## Frontend Architecture

### Component Structure

```
src/
├── app/
│   ├── [locale]/
│   │   ├── (auth)/           ✅ IMPLEMENTED
│   │   │   ├── sign-in/
│   │   │   └── sign-up/
│   │   ├── (dashboard)/      ✅ IMPLEMENTED
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── projects/     ⏳ In Progress
│   │   │   ├── clients/      ✅ IMPLEMENTED (Nov 2, 2025)
│   │   │   │   └── page.tsx  # List, search, filter, pagination
│   │   │   ├── materials/    🔜 Planned
│   │   │   └── settings/     🔜 Planned
│   │   └── (public)/
│   │       ├── portfolio/
│   │       └── contact/
├── components/
│   ├── ui/                   ✅ IMPLEMENTED (Nov 2, 2025)
│   │   # 20+ reusable components with MoodB brand colors:
│   │   # - MoodBCard, MoodBButton, MoodBInput, MoodBTextarea
│   │   # - MoodBSelect, MoodBNumberInput, MoodBCheckbox
│   │   # - MoodBModal, MoodBBadge (5 status variants)
│   │   # - MoodBTable (full table components)
│   │   # - EmptyState, LoadingState, ErrorState, ConfirmDialog
│   │   # - Form components: FormField, FormSection, FormActions
│   │   # All components use brand colors and RTL support
│   ├── features/             ✅ PARTIALLY IMPLEMENTED
│   │   ├── clients/          ✅ IMPLEMENTED (Nov 2, 2025)
│   │   │   ├── ClientFormDrawer.tsx  # Lightweight drawer form
│   │   │   └── index.ts
│   │   ├── project/          🔜 Planned
│   │   ├── style-engine/     🔜 Planned
│   │   ├── budget/           🔜 Planned
│   │   └── client-portal/    🔜 Planned
│   └── layouts/
├── hooks/
│   ├── useAuth.ts
│   ├── useOrganization.ts
│   ├── useProject.ts
│   └── useRTL.ts
├── lib/
│   ├── api/                  ✅ IMPLEMENTED (Nov 2, 2025)
│   │   └── middleware.ts     # withAuth, requirePermission, handleError
│   ├── auth/                 ✅ IMPLEMENTED (Nov 2, 2025)
│   │   └── rbac.ts          # 5 roles, 20+ permissions, hasPermission
│   ├── errors.ts            ✅ IMPLEMENTED (Nov 2, 2025)
│   │   # AppError, UnauthorizedError, ForbiddenError, etc.
│   ├── db.ts                ✅ IMPLEMENTED (Nov 2, 2025)
│   │   # Prisma client singleton
│   ├── validations/         ✅ PARTIALLY IMPLEMENTED
│   │   └── client.ts        # Zod schemas for client CRUD
│   ├── utils/
│   └── constants/
└── styles/
    ├── globals.css
    ├── themes/
    └── tokens.css
```

### State Management Strategy

```typescript
// Server State (TanStack Query)
const projectQueries = {
  list: (orgId: string) => ({
    queryKey: ['projects', orgId],
    queryFn: () => fetchProjects(orgId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  }),
  
  detail: (projectId: string) => ({
    queryKey: ['projects', projectId],
    queryFn: () => fetchProject(projectId),
  }),
  
  budget: (projectId: string) => ({
    queryKey: ['projects', projectId, 'budget'],
    queryFn: () => fetchProjectBudget(projectId),
  })
}

// Client State (Zustand)
interface UIStore {
  // Layout
  sidebarOpen: boolean
  theme: 'light' | 'dark' | 'auto'
  locale: 'he' | 'en' | 'ar'
  
  // Brand Colors (MoodB defaults)
  colors: {
    background: string  // #f7f7ed
    brand: string      // #df2538
    text: string       // #000000
    textInverse: string // #ffffff
  }
  
  // Project Canvas
  activeTab: string
  selectedRoom: string | null
  viewMode: 'grid' | 'list' | 'board'
  
  // Style Editor
  styleEditorOpen: boolean
  compareMode: boolean
  selectedStyles: string[]
  
  // Actions
  toggleSidebar: () => void
  setTheme: (theme: Theme) => void
  setLocale: (locale: Locale) => void
}
```

## Performance Optimization

### Caching Strategy

```typescript
// Edge Caching Configuration
const cacheConfig = {
  // Static assets
  images: {
    strategy: 'cache-first',
    maxAge: 31536000, // 1 year
    revalidate: 86400  // 1 day
  },
  
  // API responses
  api: {
    materials: {
      strategy: 'network-first',
      maxAge: 3600,     // 1 hour
      staleWhileRevalidate: true
    },
    projects: {
      strategy: 'network-only',
      maxAge: 0
    },
    styles: {
      strategy: 'cache-first',
      maxAge: 86400    // 1 day
    }
  }
}

// Image Optimization Pipeline
const imageOptimization = {
  formats: ['webp', 'avif'],
  sizes: [320, 640, 1024, 1920],
  quality: 85,
  lazy: true,
  placeholder: 'blur'
}
```

### Database Optimization

```typescript
// Indexes
const indexes = {
  projects: [
    { organizationId: 1, status: 1 },
    { clientId: 1 },
    { 'metadata.createdAt': -1 }
  ],
  materials: [
    { category: 1, 'properties.type': 1 },
    { 'pricing.cost': 1 },
    { name: 'text' }  // Text search
  ],
  styles: [
    { organizationId: 1, category: 1 },
    { slug: 1 },
    { 'metadata.isPublic': 1, 'metadata.rating': -1 }
  ]
}

// Aggregation Pipelines
const budgetCalculation = [
  { $match: { projectId: ObjectId(projectId) } },
  { $unwind: '$rooms' },
  { $lookup: {
    from: 'materials',
    localField: 'rooms.materials.materialId',
    foreignField: '_id',
    as: 'materialDetails'
  }},
  { $group: {
    _id: '$rooms._id',
    totalCost: { $sum: '$materialDetails.pricing.cost' }
  }}
]
```

## Security Implementation

### Security Layers

```typescript
// 1. Authentication & Authorization ✅ FULLY IMPLEMENTED & FIXED (Nov 2, 2025)
const securityMiddleware = {
  // NextAuth.js authentication ✅ Implemented
  auth: {
    provider: 'next-auth',
    strategy: 'jwt',  // Changed from 'database' to fix login loop
    googleOAuth: true,
    jwtCallback: 'Stores user data in JWT token',
    sessionCallback: 'Extracts data from JWT token',
    redirectCallback: 'Locale-aware redirects with loop prevention',
    organizationCreation: 'Manual in signIn callback (no adapter)',
    noPrismaAdapter: 'Manual user/account creation for JWT compatibility'
  },
  middleware: {
    publicRoutes: ['/api/auth/*', '/sign-in', '/sign-up'],
    protectedRoutes: ['/dashboard', '/projects', '/clients', '/styles', '/materials', '/budget', '/settings']
  },
  
  // Rate limiting
  rateLimit: new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(100, '1 m'),
    analytics: true
  }),
  
  // CORS configuration
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  },
  
  // Input validation
  validate: (schema: ZodSchema) => {
    return async (req: Request) => {
      const body = await req.json()
      return schema.parse(body)
    }
  }
}

// 2. Data Protection
const dataProtection = {
  // Encryption at rest
  encryption: {
    algorithm: 'aes-256-gcm',
    fields: ['client.contact', 'user.profile.phone']
  },
  
  // PII handling
  pii: {
    mask: (data: string) => data.replace(/.(?=.{4})/g, '*'),
    audit: true,
    retention: 90 // days
  },
  
  // Backup strategy
  backup: {
    frequency: 'daily',
    retention: 30, // days
    encryption: true
  }
}
```

## Deployment Architecture

### Infrastructure as Code

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}  # MongoDB Atlas (Production only)
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - NEXTAUTH_URL=${NEXTAUTH_URL}
      - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}  # ✅ Configured
      - GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}  # ✅ Configured
      - GCP_SERVICE_ACCOUNT_KEY=${GCP_SERVICE_ACCOUNT_KEY}
      - NEXT_PUBLIC_DEFAULT_LOCALE=${NEXT_PUBLIC_DEFAULT_LOCALE}  # 'he'
    depends_on:
      - redis
      - meilisearch

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

  meilisearch:
    image: getmeili/meilisearch:latest
    ports:
      - "7700:7700"
    environment:
      - MEILI_MASTER_KEY=${MEILI_MASTER_KEY}
    volumes:
      - meilisearch-data:/data.ms

volumes:
  redis-data:
  meilisearch-data:
```

### CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test
      - run: npm run test:e2e

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: vercel/action@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

## Monitoring & Observability

### Monitoring Stack

```typescript
// Performance Monitoring
const monitoring = {
  // Application Performance Monitoring
  apm: {
    provider: 'Sentry',
    config: {
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 0.1,
      profilesSampleRate: 0.1
    }
  },
  
  // Analytics
  analytics: {
    provider: 'PostHog',
    events: [
      'project_created',
      'style_applied',
      'budget_approved',
      'material_selected'
    ]
  },
  
  // Logging
  logging: {
    provider: 'Logtail',
    levels: ['error', 'warn', 'info'],
    structured: true
  },
  
  // Health Checks
  health: {
    endpoints: [
      '/api/health/live',
      '/api/health/ready',
      '/api/health/db'
    ]
  }
}
```

## Scalability Considerations

### Horizontal Scaling

```typescript
// Microservices Architecture (Future)
const services = {
  core: {
    // Main application
    responsibilities: ['auth', 'projects', 'clients'],
    scaling: 'auto',
    replicas: { min: 2, max: 10 }
  },
  
  styleEngine: {
    // Style processing service
    responsibilities: ['styles', 'palettes', 'materials'],
    scaling: 'manual',
    replicas: 3
  },
  
  budgetCalculator: {
    // Budget calculation service
    responsibilities: ['budget', 'pricing', 'quotes'],
    scaling: 'auto',
    replicas: { min: 1, max: 5 }
  },
  
  mediaProcessor: {
    // Image/document processing
    responsibilities: ['upload', 'optimize', 'cdn'],
    scaling: 'event-driven'
  }
}
```

### Database Sharding Strategy

```typescript
// Sharding Configuration
const sharding = {
  strategy: 'organization', // Shard by organizationId
  
  shards: {
    shard1: {
      organizations: ['org1', 'org2'],
      region: 'us-east-1'
    },
    shard2: {
      organizations: ['org3', 'org4'],
      region: 'eu-west-1'
    }
  },
  
  routing: {
    key: 'organizationId',
    algorithm: 'consistent-hash'
  }
}
```

## Testing Strategy

### Test Pyramid

```typescript
// Unit Tests (70%)
describe('MaterialService', () => {
  it('should calculate material cost correctly', () => {
    const material = { price: 100, unit: 'sqm' }
    const quantity = 50
    const waste = 0.1
    
    const cost = calculateMaterialCost(material, quantity, waste)
    expect(cost).toBe(5500) // 50 * 1.1 * 100
  })
})

// Integration Tests (20%)
describe('Project API', () => {
  it('should create project with rooms', async () => {
    const project = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send(projectData)
    
    expect(project.status).toBe(201)
    expect(project.body.rooms).toHaveLength(3)
  })
})

// E2E Tests (10%)
test('Complete project workflow', async ({ page }) => {
  await page.goto('/projects/new')
  await page.fill('[name="projectName"]', 'Test Project')
  await page.click('button[type="submit"]')
  
  await expect(page).toHaveURL('/projects/[id]')
})
```

## Development Guidelines

### Code Standards

```typescript
// TypeScript Configuration
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "jsx": "preserve",
    "module": "esnext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}

// ESLint Configuration
{
  "extends": [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended",
    "plugin:react-hooks/recommended",
    "prettier"
  ],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": "error",
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

### Git Workflow

```bash
# Branch naming
feature/MOOD-123-add-style-engine
bugfix/MOOD-456-fix-rtl-layout
hotfix/MOOD-789-security-patch

# Commit message format
feat: add style comparison feature
fix: resolve RTL layout issues in palette editor
docs: update API documentation
test: add unit tests for budget calculator
refactor: optimize material search query
```

## Risk Mitigation

### Technical Risks

1. **Database Performance**
   - Risk: Slow queries with large datasets
   - Mitigation: Implement caching, optimize indexes, consider read replicas

2. **File Storage Costs**
   - Risk: High GCP Storage costs
   - Mitigation: Implement lifecycle policies, compress images, lazy delete

3. **Multi-tenancy Security**
   - Risk: Data leakage between organizations
   - Mitigation: Row-level security, strict validation, regular audits

4. **RTL/LTR Complexity**
   - Risk: Layout issues in mixed direction content
   - Mitigation: Comprehensive testing, CSS logical properties, Mantine RTL support

### Business Continuity

```typescript
const continuityPlan = {
  backup: {
    frequency: 'hourly',
    retention: '30 days',
    testing: 'monthly'
  },
  
  disaster_recovery: {
    rpo: '1 hour',  // Recovery Point Objective
    rto: '4 hours', // Recovery Time Objective
    failover: 'automatic'
  },
  
  monitoring: {
    uptime: '99.9%',
    alerts: ['email', 'sms', 'slack'],
    escalation: ['on-call', 'manager', 'cto']
  }
}
```

## Success Metrics

### Technical KPIs

- API Response Time: < 200ms (p95)
- Page Load Time: < 2s (p75)
- Error Rate: < 0.1%
- Uptime: > 99.9%
- Database Query Time: < 100ms (p95)

### Business KPIs

- User Activation Rate: > 60%
- Feature Adoption Rate: > 40%
- Client Portal Usage: > 70%
- Budget Accuracy: ± 5%
- Project Completion Time: -20% vs manual

## Conclusion

This technical plan provides a comprehensive foundation for building MoodB as a scalable, secure, and performant interior design platform. The architecture supports multi-tenancy, RTL languages, real-time collaboration, and future AI integrations while maintaining code quality and operational excellence.
