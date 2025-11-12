# MoodB Development Progress

**Last Updated:** January 29, 2025
**Current Phase:** Phase 2 - Style Engine Core
**Status:** ✅ Phase 1 Complete - Phase 2 In Progress (70% Complete - Admin Area, Categories, Colors, Materials, Styles Complete)

---

## 🎯 Recent Updates (January 2025)

### ✅ Approach Layer Introduced (November 11, 2025)
- Added **Approach** entity between Style and Inspiration pages (category ➜ style ➜ approach ➜ inspiration).
- Migrated Prisma schema and seeded default approaches for legacy styles.
- Delivered full admin CRUD (tabs + modal workflow) with dedicated `ApproachForm`.
- Updated APIs and user routes to serve nested approach pages (`/styles/[style]/[approach]`).
- Documented usage patterns and synced translations for new UI/UX.

### ✅ Image Upload Pattern Standardized (January 29, 2025)
- **Standardized image upload pattern** across all entities (Styles, Sub-Categories, etc.)
- **Edit Mode**: Pass `entityId` to ImageUpload → Images upload immediately → Trust URLs (no filtering)
- **Create Mode**: No `entityId` → Track pending files → Filter blob URLs → Upload after creation
- **Key Fix**: Don't filter blob URLs in edit mode - ImageUpload handles uploads automatically
- **Reference Implementation**: `src/app/[locale]/admin/sub-categories/[id]/edit/page.tsx`
- **Documentation**: Updated in CLAUDE.md, technical-plan.md, and progress.md

## 🎉 Completed Milestones

### ✅ Phase 1: Client Management - COMPLETE (November 2, 2025)

#### Client Management System ✅ FULLY IMPLEMENTED
- [x] **Complete CRUD API** for clients with:
  - POST /api/clients - Create client
  - GET /api/clients - List with search, tag filtering, pagination
  - GET /api/clients/[id] - Get single client with project count
  - PATCH /api/clients/[id] - Update client
  - DELETE /api/clients/[id] - Delete client
- [x] **Full RBAC enforcement** on all endpoints (client:read, client:write, client:create, client:delete)
- [x] **Multi-tenancy isolation** - All operations scoped by organizationId
- [x] **Zod validation** for all requests and responses
- [x] **Hybrid tag system** - 9 predefined tags + custom tags support
- [x] **Client list page** with:
  - Search by name (optimized for MongoDB)
  - Filter by tags (predefined tags)
  - Pagination (20 items per page)
  - Empty state with CTA
  - Loading and error states
- [x] **Client detail page** with tabbed interface:
  - Basic info card (contact details, creation date)
  - Tags display card
  - Projects tab with count and empty state
  - Notes tab with timeline view
  - Preferences tab for special needs
  - Edit button opens drawer (not navigation)
  - Delete confirmation dialog
  - Real-time data updates via React Query
- [x] **Client form drawer** (lightweight, React Hook Form + Zod):
  - Create and edit modes
  - Contact information (email, phone, address, city, country)
  - Hybrid tags (MultiSelect with search and create)
  - Preferences (budget range, special needs)
  - Form validation with error messages
  - Success callbacks and auto-refetch
- [x] **React Query integration** for real-time updates:
  - Auto-refetch every 30 seconds
  - Refetch on window focus
  - 10s stale time
  - Automatic cache invalidation on mutations
- [x] **Complete translations** (Hebrew + English):
  - 60+ translation keys for client management
  - Form labels and placeholders
  - Error messages
  - Empty states and CTAs
  - Table headers and actions
- [x] **Architectural Decision**: Budget is per-project, NOT per-client
  - Removed budget display from client detail page
  - Budget will be implemented at project level in Phase 2

#### Technical Implementation Details - Clients
- **Files Created**:
  - `/src/app/api/clients/[id]/route.ts` - Single client API (GET, PATCH, DELETE)
  - `/src/app/[locale]/(dashboard)/clients/[id]/page.tsx` - Client detail page
  - `/src/hooks/useClients.ts` - Custom React Query hooks
  - `/src/lib/providers/QueryProvider.tsx` - React Query context provider
- **Files Modified**:
  - `/src/lib/api/middleware.ts` - Fixed authentication to use JWT tokens
  - `/src/app/api/clients/route.ts` - Simplified search to name only
  - `/messages/he.json` - Added client detail translations
  - `/messages/en.json` - Added client detail translations
- **Key Technical Fixes**:
  - Fixed 500 error on client detail page (missing API route)
  - Fixed authentication middleware ObjectID mismatch (use JWT tokens)
  - Fixed search functionality (MongoDB embedded document limitations)
  - Fixed edit button to open drawer instead of navigating away
  - Removed budget from client UI per architectural decision

### ✅ Phase 1: Project Management - COMPLETE (November 2, 2025)

#### Project Management System ✅ FULLY IMPLEMENTED
- [x] **Complete CRUD API** for projects with:
  - POST /api/projects - Create project (with client validation)
  - GET /api/projects - List with search, status filtering, pagination, clientId filtering
  - GET /api/projects/[id] - Get single project with client info
  - PATCH /api/projects/[id] - Update project
  - DELETE /api/projects/[id] - Delete project
- [x] **Full RBAC enforcement** on all endpoints (project:read, project:write, project:create, project:delete)
- [x] **Multi-tenancy isolation** - All operations scoped by organizationId
- [x] **Zod validation** for all requests and responses
- [x] **Project status system** - 6 statuses (draft, active, review, approved, completed, archived)
- [x] **Room type system** - 11 predefined room types (living, dining, kitchen, bedroom, etc.)
- [x] **Budget support** - Min/max target budget with currency selection (ILS, USD, EUR)
- [x] **Timeline support** - Start and end dates for projects
- [x] **Auto-slug generation** - Converts project name to URL-friendly slug
- [x] **Project list page** with:
  - Search by project name
  - Filter by status (all statuses available)
  - Pagination (20 items per page)
  - Table view showing: name, client, status, rooms count, team count, created date
  - Actions menu (view, edit, delete)
  - Empty state with CTA
  - Loading and error states
- [x] **Project form drawer** (lightweight, React Hook Form + Zod):
  - Create and edit modes
  - Client selection dropdown (populated from useClients)
  - Status selection (6 status options)
  - Collapsible budget section with min/max/currency
  - Form validation with error messages
  - Success callbacks and auto-refetch
  - Client field disabled on edit (no client reassignment)
- [x] **React Query integration** for real-time updates:
  - Auto-refetch every 30 seconds
  - Refetch on window focus
  - 10s stale time
  - Automatic cache invalidation on mutations
  - Optimistic updates on create/edit/delete
- [x] **Complete translations** (Hebrew + English):
  - 100+ translation keys for project management
  - Form labels and placeholders
  - Status labels (6 statuses)
  - Room type labels (11 types)
  - Error messages
  - Empty states and CTAs
  - Table headers and actions

#### Technical Implementation Details - Projects
- **Files Created**:
  - `/src/lib/validations/project.ts` - Zod schemas (6 statuses, 11 room types, budget, timeline)
  - `/src/app/api/projects/route.ts` - Project list and create API
  - `/src/app/api/projects/[id]/route.ts` - Single project API (GET, PATCH, DELETE)
  - `/src/hooks/useProjects.ts` - React Query hooks (useProjects, useProject, useCreateProject, useUpdateProject, useDeleteProject)
  - `/src/app/[locale]/(dashboard)/projects/page.tsx` - Project list page
  - `/src/app/[locale]/(dashboard)/projects/[id]/page.tsx` - Project detail page with tabs ✅ (November 2, 2025)
  - `/src/components/features/projects/ProjectFormDrawer.tsx` - Project form component
  - `/src/components/features/projects/index.ts` - Feature exports barrel file
- **Files Modified**:
  - `/messages/he.json` - Added 100+ project translations
  - `/messages/en.json` - Added 100+ project translations
- **Key Technical Achievements**:
  - Resolved Next.js dynamic route naming conflict ([id] vs [projectId])
  - Implemented comprehensive budget schema with validation
  - Created collapsible form sections for better UX
  - Integrated with existing Client Management for dropdown
  - Followed exact patterns from Client Management for consistency
  - Used all reusable UI components (MoodBCard, MoodBTable, MoodBBadge, etc.)
  - Created tabbed detail page with 5 tabs: Overview, Rooms, Budget, Timeline, Team

### ✅ Phase 1: Room Management - COMPLETE (November 2, 2025)

#### Room Management System ✅ FULLY IMPLEMENTED
- [x] **Complete CRUD API** for rooms within projects:
  - POST /api/projects/[id]/rooms - Add room to project
  - PATCH /api/projects/[id]/rooms/[roomId] - Update room
  - DELETE /api/projects/[id]/rooms/[roomId] - Delete room
- [x] **Full RBAC enforcement** on all endpoints (project:write permission required)
- [x] **Multi-tenancy isolation** - All operations scoped by organizationId
- [x] **Zod validation** for all requests and responses
- [x] **11 predefined room types** (living, dining, kitchen, bedroom, bathroom, office, entrance, hallway, balcony, storage, other)
- [x] **Dimensions support** - Optional length × width × height with unit selection (m, cm, ft, in)
- [x] **Notes field** - Optional notes per room (max 1000 characters)
- [x] **Room form drawer** (lightweight, React Hook Form + Zod):
  - Create and edit modes
  - Room name and type selection
  - Collapsible dimensions section
  - Notes textarea
  - Form validation with error messages
  - Success callbacks and auto-refetch
- [x] **Room cards** in project detail page:
  - Room name with type badge
  - Dimensions display (if set)
  - Notes preview
  - Edit and Delete actions
  - Real-time updates via React Query
- [x] **Complete translations** (Hebrew + English):
  - 15+ translation keys for room management
  - Form labels and placeholders
  - Room type labels (11 types)
  - Error messages
  - Empty states and CTAs

#### Technical Implementation Details - Rooms
- **Files Created**:
  - `/src/lib/validations/room.ts` - Zod schemas (11 room types, 4 dimension units, CRUD validation)
  - `/src/app/api/projects/[id]/rooms/route.ts` - Add room API
  - `/src/app/api/projects/[id]/rooms/[roomId]/route.ts` - Update and delete room API
  - `/src/hooks/useRooms.ts` - React Query hooks (useAddRoom, useUpdateRoom, useDeleteRoom)
  - `/src/components/features/rooms/RoomFormDrawer.tsx` - Room form component
  - `/src/components/features/rooms/index.ts` - Feature exports barrel file
- **Files Modified**:
  - `/src/app/[locale]/(dashboard)/projects/[id]/page.tsx` - Integrated room management into Rooms tab
  - `/messages/he.json` - Added 15+ room translations
  - `/messages/en.json` - Added 15+ room translations
- **Key Technical Achievements**:
  - Rooms stored as embedded array in Project document (MongoDB embedded type)
  - UUID generation for room IDs using uuid v4
  - Collapsible dimensions section for better UX
  - Room cards with inline edit/delete actions
  - Proper handling of embedded document updates in Prisma
  - Real-time refetch after mutations
  - Full Hebrew/English localization

### ✅ Phase 0 Setup (November 1, 2025)

#### Infrastructure Setup
- [x] **Next.js 15+ Project** initialized with App Router
- [x] **TypeScript 5.6+** configured with strict mode
- [x] **ESLint & Prettier** configured for code quality
- [x] **Complete project structure** created
- [x] **All dependencies installed** (40+ packages)

#### Database & Schema ✅ INITIALIZED
- [x] **MongoDB Atlas** cluster configured
- [x] **Prisma ORM** installed and configured
- [x] **Prisma Client generated** (November 2, 2025)
- [x] **Database schema pushed** to MongoDB (November 2, 2025)
- [x] **Complete database schema** designed with:
  - Organizations (multi-tenancy)
  - Users (RBAC with 5 roles)
  - Clients (CRM)
  - Projects & Rooms
  - Styles, Palettes & Material Sets
  - Materials & Products Catalog
  - Suppliers (Organizations) - Architecture updated: Suppliers are Organizations
  - Budget & Bill of Materials
  - Approvals & Comments
  - Audit Logs
  - **Total:** 14 models, 30+ type definitions

#### Authentication & Authorization ✅ FULLY FIXED (November 2, 2025)
- [x] **NextAuth.js** integrated for authentication
- [x] **Google OAuth** provider configured and working
- [x] **RBAC roles** defined in schema (5 roles)
- [x] **NEXTAUTH_SECRET** generated and configured
- [x] **JWT session strategy** implemented (switched from database sessions)
- [x] Authentication middleware with JWT token validation
- [x] Organization auto-creation on user signup (manual in signIn callback)
- [x] User creation without PrismaAdapter (manual handling)
- [x] Sign-in/Sign-up pages with Google OAuth buttons
- [x] **Login redirect loop FIXED** (session strategy mismatch resolved)
- [x] Locale-aware redirects implemented
- [x] Auth error page created (`/[locale]/(auth)/error`)
- [x] Session callback with JWT tokens
- [x] Middleware redirect loop prevention

#### Storage & CDN
- [x] **Cloudflare R2** bucket created
- [x] **Cloudflare CDN** configured
- [x] Environment variables configured
- [x] AWS SDK installed for S3-compatible operations

#### UI & Styling ✅ IMPLEMENTED
- [x] **Mantine UI 7.13+** installed with RTL support
- [x] **Framer Motion** installed for animations
- [x] **Icon libraries** installed (Phosphor, Tabler)
- [x] **Brand colors** defined and implemented:
  - Background: `#f7f7ed` (Light cream)
  - Brand Red: `#df2538` (MoodB Red)
  - Text: `#000000` (Black)
  - Text Inverse: `#ffffff` (White)
- [x] Mantine theme provider configured with brand colors
- [x] Design tokens system created (CSS variables)
- [x] RTL/LTR switching implemented dynamically
- [x] Hebrew font support added (Heebo, Assistant)
- [x] Fixed Mantine CSS conflicts with Tailwind CSS v4
- [x] Sign-in/Sign-up pages styled with brand colors

#### State Management
- [x] **TanStack Query** installed (server state)
- [x] **Zustand** installed (client state)
- [x] **React Hook Form** installed with Zod validation

#### Internationalization ✅ IMPLEMENTED
- [x] **next-intl** installed and configured
- [x] Locale structure defined (Hebrew as default, English)
- [x] RTL/LTR support implemented dynamically
- [x] Translation files created (he.json, en.json)
- [x] Hebrew translations added for authentication
- [x] Dynamic locale detection and routing
- [x] Hebrew font rendering fixed

#### Monitoring & Analytics
- [x] **Sentry** installed for error tracking
- [x] **PostHog** installed for analytics
- [x] Environment variables configured

#### Development Tools
- [x] **Vitest** configured for unit testing
- [x] **Playwright** configured for E2E testing
- [x] **Docker Compose** set up for local services
- [x] **VS Code** settings and extensions configured

#### Documentation
- [x] Complete README.md
- [x] Quick Start guide
- [x] Setup instructions
- [x] Development standards (CLAUDE.md)
- [x] Project overview (Hebrew)
- [x] Technical plan
- [x] Task list

---

---

## 🔧 Recent Fixes (November 2, 2025)

### Login Loop Issue - RESOLVED ✅

**Problem:** Users were stuck in an infinite redirect loop between `/he/sign-in` and `/he/dashboard`.

**Root Cause:** Session strategy mismatch
- Auth config was using `session: { strategy: "database" }`
- Middleware was using `getToken()` which only works with JWT sessions
- Middleware couldn't read database sessions, treating authenticated users as unauthenticated
- This caused continuous redirects between sign-in and dashboard

**Solution Applied:**
1. ✅ Changed session strategy to JWT (`strategy: "jwt"`)
2. ✅ Removed PrismaAdapter to avoid adapter conflicts
3. ✅ Implemented manual user/org creation in `signIn` callback
4. ✅ Generated proper NEXTAUTH_SECRET (was placeholder)
5. ✅ Improved middleware redirect logic with loop prevention
6. ✅ Created auth error page at `/[locale]/(auth)/error`
7. ✅ Updated JWT callback to store user data in token
8. ✅ Fixed session callback to work with JWT tokens

**Result:** Clean authentication flow with no loops. Users can now sign in with Google OAuth and land on dashboard successfully.

---

## 🚀 Next Steps - Implementation Phase

### Immediate Tasks (Next Session)

#### 1. Initialize Database ✅ COMPLETED (November 2, 2025)
```bash
✅ pnpm prisma generate  # Done
✅ pnpm prisma db push    # Done - Schema synced with MongoDB
```

#### 2. Start Development Server ✅ RUNNING
```bash
✅ pnpm dev  # Running on http://localhost:3000
```

#### 3. Implement Core Infrastructure ✅ COMPLETED
- [x] Create Mantine theme provider with MoodB brand colors
- [x] Set up next-intl configuration
- [x] Implement RTL/LTR support
- [x] Create base layout components (DashboardLayout, Logo)
- [x] Set up authentication middleware
- [x] Create API route structure ([...nextauth] route)

#### 4. Create Design System ✅ PARTIALLY COMPLETED
- [x] Design tokens CSS variables (tokens.css)
- [x] Base UI components (using Mantine components styled)
- [x] Typography system (with Hebrew fonts)
- [x] Spacing system (Mantine spacing scale)
- [x] Color system with brand colors (moodbTheme configured)
- [ ] Custom Button/Input/Card components (NEXT: Create custom components)

#### 5. Implement Authentication Flow ✅ COMPLETED & FIXED
- [x] Sign in page with Google OAuth
- [x] Sign up page (Google OAuth)
- [x] Organization auto-creation on signup (manual in signIn callback)
- [x] User profile setup (firstName, lastName, avatar)
- [x] Session management (JWT strategy)
- [x] Fixed redirect loops (switched to JWT sessions)
- [x] Auth error page created
- [x] Middleware loop prevention
- [ ] Onboarding flow (NEXT: Create onboarding page for new users)

---

## 📊 Project Statistics

### Codebase
- **Configuration Files:** 15+
- **Documentation Files:** 8
- **Database Models:** 14
- **Type Definitions:** 30+
- **Dependencies Installed:** 40+ packages
- **Lines of Schema:** 633

### Installation Details
- **Setup Time:** ~10 minutes
- **Node Modules Size:** 1.3 GB
- **Technologies:** 20+ frameworks/libraries

---

## 🎯 Phase Progress

### Phase 0: Foundation ✅ 100% Complete
- ✅ Setup & Configuration: 100%
- ✅ Dependencies: 100%
- ✅ Database Schema: 100%
- ✅ Database Initialization: 100% (Prisma generated & pushed)
- ✅ Authentication Implementation: 100% (JWT sessions, login loop fixed)
- ✅ UI Foundation: 100% (20+ components with brand colors)
- ✅ Internationalization: 100% (Hebrew/English with RTL)
- ✅ Multi-tenancy & RBAC: 100% (5 roles, 20+ permissions)
- ⏳ Onboarding Flow: 0% (Next)
- ⏳ Dashboard Content: 5% (Basic structure exists)

### Phase 1: CRM & Projects ✅ 95% Complete
- ✅ Client Management: 100% (CRUD, list, detail, forms, real-time updates)
- ✅ Project Management: 100% (CRUD API, list page, detail page with tabs, form drawer, budget support)
- ✅ Room Management: 100% (CRUD API, form drawer, room cards, dimensions support) ✅ NEW (November 2, 2025)

### Phase 2: Style Engine Core ✅ 65% Complete (January 2025)

#### Admin Area & Protection ✅ FULLY IMPLEMENTED (January 2025)
- [x] **Admin Layout** - Separate admin layout with navigation
- [x] **Admin Dashboard** - Overview with statistics
- [x] **Comprehensive Admin Protection** - Multi-layer security:
  - ✅ Next.js middleware protection for `/admin/*` routes
  - ✅ Server-side layout protection
  - ✅ Client-side component protection (`useAdminGuard`)
  - ✅ API endpoint protection (`withAdmin` wrapper)
  - ✅ React Query hooks protection (prevents non-admin API calls)
- [x] **Admin Pages Created**:
  - `/admin` - Admin Dashboard
  - `/admin/styles` - Global Styles Management
  - `/admin/styles/[id]` - Style Detail Page (with palette, materials, rooms tabs)
  - `/admin/styles/[id]/edit` - Style Edit Page (placeholder)
  - `/admin/styles/approvals` - Style Approvals (approve/reject workflow)
  - `/admin/colors` - Colors Management ✅ NEW (January 2025)
  - `/admin/categories` - Categories Management ✅ NEW (January 2025)
  - `/admin/sub-categories` - Sub-Categories Management ✅ NEW (January 2025)
  - `/admin/materials` - Materials Management ✅ IMPLEMENTED (January 2025)
  - `/admin/users` - Users Management ✅ IMPLEMENTED (January 2025)
  - `/admin/organizations` - Organizations Management (placeholder)
- [x] **Admin Utilities**:
  - `scripts/set-admin.ts` - Script to set user as admin
  - `pnpm admin:set <email>` - NPM script for admin assignment
  - `docs/ADMIN_ACCESS.md` - Complete admin access documentation

#### Style Management APIs ✅ FULLY IMPLEMENTED (January 2025)
- [x] **Admin Styles API** (`/api/admin/styles`):
  - GET - List all global styles
  - POST - Create global style (admin only)
  - GET /[id] - Get global style
  - PATCH /[id] - Update global style
  - DELETE /[id] - Delete global style
  - GET /approvals - List pending approvals
  - POST /[id]/approve - Approve/reject public style
- [x] **User Styles API** (`/api/styles`):
  - GET - List available styles (global + approved public + org personal)
  - POST - Create style (personal or public)
  - GET /[id] - Get style details
  - PATCH /[id] - Update style (if owner)
  - DELETE /[id] - Delete style (if owner)
- [x] **Style Validation Schemas** - Complete Zod schemas for all style operations
- [x] **React Query Hooks** - Protected admin hooks with error handling

#### Style Management UI ✅ PARTIALLY IMPLEMENTED (January 2025)
- [x] **Admin Styles Management Page** - List, search, filter, delete global styles
- [x] **Admin Style Approvals Page** - Review and approve/reject public styles
- [x] **Admin Style Detail Page** - View style with tabs (palette, materials, rooms)
- [x] **Admin Style Edit Page** - Fully implemented with multi-tab form (basic, palette, materials, rooms) ✅ COMPLETE
- [x] **Admin Style Create Page** - Fully implemented with complete form wizard ✅ COMPLETE
- [ ] User-facing Style Library Pages - `/styles` (browse, detail, create)
- [ ] User-facing Style Form Components - Wizard for creating/editing styles

#### Style Form Architecture ✅ FULLY IMPLEMENTED (January 2025)

**Overview:**
The style form system implements a comprehensive multi-tab form wizard for creating and editing global styles. It handles complex nested data structures including materials, room profiles, and image uploads with support for both creation and edit modes.

**Key Components:**

1. **StyleForm Component** (`src/components/features/style-engine/StyleForm.tsx`)
   - Main form component handling both create and edit modes
   - Uses React Hook Form with Zod validation
   - Tabbed interface with 4 tabs:
     - **Basic Info Tab**: Name (HE/EN), Category, SubCategory, Slug, Style Images
     - **Color Tab**: Color selection with visual preview
     - **Materials Tab**: General materials selection (MultiSelect with SKU display)
     - **Rooms Tab**: Room profiles with materials and images (dynamic field array)
   - Features:
     - Validation error handling with scroll-to-error functionality
     - Tab switching based on validation errors
     - **Image Upload Pattern (Standard Pattern - Used in Sub-Categories, Styles, etc.):**
       - **Edit Mode**: Pass `entityId` to ImageUpload → Images upload immediately → Submit with R2 URLs (trust ImageUpload)
       - **Create Mode**: No `entityId` → Track pending files → Filter blob URLs on submit → Upload after creation
     - Form state management with pending files tracking (create mode only)
     - Room profile management: Add/remove room profiles with unique room types
     - Material selection: General materials (defaults) vs room-specific materials
     - **Critical Fix (January 2025)**: Don't filter blob URLs in edit mode - ImageUpload handles uploads automatically

2. **ImageUpload Component** (`src/components/ui/ImageUpload.tsx`)
   - Reusable image upload component with drag & drop support
   - **Creation Mode** (no entityId):
     - Stores files locally in component state
     - Creates blob URLs for preview
     - Tracks pending files via `onPendingFilesChange` callback
     - Prevents premature URL revocation for form state persistence
   - **Edit Mode** (with entityId):
     - **Uploads immediately** when files are added (automatically calls uploadImage)
     - Replaces blob URLs with R2 URLs in `onChange` callback
     - No need to filter blob URLs in form submission - they're already R2 URLs
   - Features:
     - Multiple image support (up to 20 images)
     - Image preview grid with delete functionality
     - Error handling per image
     - Loading states during upload/delete
     - Room type support for room profile images
     - File validation (type, size - max 10MB)
   - **Standard Pattern**: When `entityId` is provided, ImageUpload handles everything automatically

3. **useImageUpload Hook** (`src/hooks/useImageUpload.ts`)
   - Manages image upload state and operations
   - Handles file cloning to prevent FileSystemFileHandle issues
   - Upload mutation with FormData creation
   - Delete mutation for image removal
   - Returns: `uploadImage`, `deleteImage`, `uploading`, `deleting`, error states

4. **Validation Schemas** (`src/lib/validations/style.ts`)
   - Complete Zod schemas for style operations:
     - `createStyleSchema`: Full validation for style creation
     - `updateStyleSchema`: Partial validation for updates
     - `materialSetSchema`: Material defaults and alternatives
     - `roomProfileSchema`: Room-specific materials and images
     - `localizedStringSchema`: Hebrew/English name validation
     - `styleMetadataSchema`: Approval status, tags, usage tracking
   - ObjectID validation helper for MongoDB IDs
   - Image validation via `imagesSchema` (max 20 URLs)

5. **API Routes** (`src/app/api/admin/styles/[id]/route.ts`)
   - GET: Fetch single style with relations (category, subCategory, color)
   - PATCH: Update style with validation
   - DELETE: Delete style with authorization checks
   - ObjectID format validation to prevent route conflicts (e.g., "new" vs ID)
   - Admin protection via `withAdmin` wrapper

6. **Page Components:**
   - **Create Page** (`src/app/[locale]/admin/styles/new/page.tsx`):
     - Uses StyleForm in "create" mode
     - Handles form submission and navigation
     - Redirects to style detail page after creation
   - **Edit Page** (`src/app/[locale]/admin/styles/[id]/edit/page.tsx`):
     - Uses StyleForm in "edit" mode
     - Loads existing style data
     - Shows loading/error states
     - Redirects to style detail page after update

**Technical Implementation Details:**

- **Form State Management:**
  - React Hook Form with `useForm` hook
  - Field arrays for room profiles (`useFieldArray`)
  - Watch values for dependent fields (category → subCategory)
  - Controller components for complex inputs (Select, MultiSelect)

- **Image Upload Flow:**
  - **Creation Mode:**
    1. User selects images → Files stored locally with blob URLs
    2. Form submits → Filter blob URLs → Style created with empty images array
    3. Style ID received → Upload pending files to R2
    4. R2 URLs returned → Update style with image URLs
  - **Edit Mode (Standard Pattern - Matches Sub-Categories):**
    1. User selects images → ImageUpload automatically uploads to R2 (entityId provided)
    2. ImageUpload calls `onChange` with R2 URLs → Form state updated with R2 URLs
    3. Form submits → Pass images as-is (no filtering needed - ImageUpload already handled uploads)
    4. API saves R2 URLs directly
  - **Key Principle**: When `entityId` is provided, trust ImageUpload to handle uploads - don't filter blob URLs

- **Material Selection:**
  - General materials: Stored in `materialSet.defaults` as objects with `materialId`
  - Room-specific materials: Stored in `roomProfiles[].materials` as array of IDs
  - MaterialSelector component handles both formats intelligently

- **Room Profiles:**
  - Dynamic field array allows adding/removing room profiles
  - Each profile has: roomType, materials (array), images (array), constraints (optional)
  - Room type uniqueness enforced in UI (prevents duplicate room types)
  - Images scoped to room type in R2 storage path

- **Error Handling:**
  - Validation errors displayed in alert at top of form
  - Errors grouped by field with user-friendly messages
  - Automatic scroll to first error field
  - Tab switching to tab containing first error
  - API errors displayed separately from validation errors

- **Internationalization:**
  - All form labels, placeholders, and error messages translated
  - Hebrew/English support throughout
  - Locale-aware material/category/color display

**File Structure:**
```
src/
├── components/
│   ├── features/
│   │   └── style-engine/
│   │       ├── StyleForm.tsx          # Main form component
│   │       └── MaterialSelector.tsx   # Material selection component
│   └── ui/
│       └── ImageUpload.tsx             # Image upload component
├── hooks/
│   └── useImageUpload.ts               # Image upload hook
├── lib/
│   └── validations/
│       ├── style.ts                    # Style validation schemas
│       └── upload.ts                   # Upload validation schemas
└── app/
    ├── [locale]/admin/styles/
    │   ├── new/page.tsx                # Create page
    │   └── [id]/edit/page.tsx          # Edit page
    └── api/admin/styles/[id]/route.ts  # API routes
```

**Key Features:**
- ✅ Multi-tab form wizard (Basic, Color, Materials, Rooms)
- ✅ Creation mode with deferred image upload
- ✅ Edit mode with immediate image upload
- ✅ Room profile management with dynamic fields
- ✅ Material selection (general + room-specific)
- ✅ Comprehensive validation with error handling
- ✅ Image upload with drag & drop
- ✅ RTL support and internationalization
- ✅ Loading and error states
- ✅ Form state persistence across tab switches

#### Colors Management ✅ FULLY IMPLEMENTED (January 2025)
- [x] **Color Model** - Complete schema with neutral/accent/semantic categories
- [x] **Admin Colors API** (`/api/admin/colors`):
  - GET - List all colors with search and category filtering
  - POST - Create color (admin only)
  - GET /[id] - Get single color
  - PATCH /[id] - Update color
  - DELETE /[id] - Delete color
- [x] **Admin Colors UI**:
  - `/admin/colors` - Colors list page with search, category filter, pagination
  - `/admin/colors/new` - Create color page
  - `/admin/colors/[id]/edit` - Edit color page
- [x] **React Query Hooks** - `useColors.ts` with full CRUD operations
- [x] **Color Validation Schemas** - Complete Zod schemas
- [x] **Translations** - Hebrew + English for colors management

#### Categories & SubCategories Management ✅ FULLY IMPLEMENTED (January 2025)
- [x] **2-Layer Category System** - Category → SubCategory → Style hierarchy
- [x] **Category Model** - With LocalizedString names, descriptions, order, images
- [x] **SubCategory Model** - Linked to parent Category, with LocalizedString names
- [x] **Admin Categories API** (`/api/admin/categories`):
  - GET - List all categories with sub-categories
  - POST - Create category
  - GET /[id] - Get single category
  - PATCH /[id] - Update category
  - DELETE /[id] - Delete category
- [x] **Admin SubCategories API** (`/api/admin/sub-categories`):
  - GET - List sub-categories with category filtering
  - POST - Create sub-category
  - GET /[id] - Get single sub-category
  - PATCH /[id] - Update sub-category
  - DELETE /[id] - Delete sub-category
- [x] **Admin UI Pages**:
  - `/admin/categories` - Categories management page
  - `/admin/categories/new` - Create category page
  - `/admin/categories/[id]` - Category detail page
  - `/admin/categories/[id]/edit` - Edit category page
  - `/admin/sub-categories` - Sub-categories management page
  - `/admin/sub-categories/new` - Create sub-category page
  - `/admin/sub-categories/[id]` - Sub-category detail page
  - `/admin/sub-categories/[id]/edit` - Edit sub-category page
- [x] **React Query Hooks** - `useCategories.ts` with full CRUD operations
- [x] **Style Model Updated** - Uses categoryId and subCategoryId (replaced string category)
- [x] **Translations** - Hebrew + English for categories and sub-categories

#### Materials Management ✅ FULLY IMPLEMENTED (January 2025)
- [x] **Material Model** - Complete schema with properties, pricing, availability
- [x] **Admin Materials API** (`/api/admin/materials`):
  - GET - List all materials with search, category, type filtering
  - POST - Create material (admin only)
  - GET /[id] - Get single material
  - PATCH /[id] - Update material
  - DELETE /[id] - Delete material
- [x] **Material Categories API** (`/api/admin/material-categories`) - CRUD operations ✅ COMPLETE
- [x] **Material Types API** (`/api/admin/material-types`) - CRUD operations ✅ COMPLETE
- [x] **Admin Materials UI**:
  - `/admin/materials` - Materials list page with MaterialList component ✅ COMPLETE
  - `/admin/materials/new` - Create material page ✅ COMPLETE
  - `/admin/materials/[id]` - Material detail page ✅ COMPLETE
  - `/admin/materials/settings` - Material settings page with tabs ✅ COMPLETE
    - MaterialCategoriesTab - Full CRUD for material categories ✅ COMPLETE
    - MaterialTypesTab - Full CRUD for material types ✅ COMPLETE
- [x] **Material Form Components**:
  - MaterialCategoryFormDrawer - Create/edit material categories ✅ COMPLETE
  - MaterialTypeFormDrawer - Create/edit material types ✅ COMPLETE
- [x] **React Query Hooks** - `useMaterials.ts` and `useMaterialCategories.ts` with full CRUD operations ✅ COMPLETE
- [x] **Material Validation Schemas** - Complete Zod schemas ✅ COMPLETE
- [x] **Translations** - Hebrew + English for materials management ✅ COMPLETE

#### Users Management ✅ FULLY IMPLEMENTED (January 2025)
- [x] **Admin Users API** (`/api/admin/users`):
  - GET - List all users with search, role, organization filtering
  - GET /[id] - Get single user
- [x] **Admin Users UI**:
  - `/admin/users` - Users list page with search and role filtering
  - `/admin/users/[id]` - User detail page
- [x] **React Query Hooks** - `useUsers.ts` with admin hooks
- [x] **Translations** - Hebrew + English for users management

#### Database Schema ✅ COMPLETE
- [x] Style model with approval workflow (global, public, personal)
- [x] StyleMetadata with approvalStatus, isPublic flags
- [x] Category and SubCategory models (2-layer hierarchy)
- [x] Color model with neutral/accent/semantic categories
- [x] Material model with full properties, pricing, availability
- [x] MaterialCategory and MaterialType models
- [x] InspirationLibrary model (ready for implementation)
- [x] All relationships defined and working

### Phase 3: Materials & Catalog ✅ PARTIALLY COMPLETE (January 2025)
- ✅ Material Database: 100% (schema, API, UI complete)
- ✅ Material Categories & Types: 100% (admin management)
- ⏳ Product Catalog: Not started
- ✅ Supplier Architecture: Updated (January 2025) - Suppliers are Organizations, materials linked via organizationId

#### ✅ Architectural Change: Supplier Model Removal (January 2025)
- [x] **Removed Supplier model** from Prisma schema - suppliers are now Organizations
- [x] **Removed `supplierId`** from Material `Availability` type
- [x] **Removed `supplierId`** from Style `MaterialDefault` type
- [x] **Updated validation schemas** - removed supplierId from material and style validations
- [x] **Updated API routes** - removed supplierId handling from style creation/update
- [x] **Updated StyleForm component** - removed supplierId from form handling
- [x] **Updated hooks/types** - removed supplierId from Material and Style interfaces
- [x] **Removed supplierPortal feature flag** from OrganizationSettings
- [x] **Updated RBAC** - removed supplier:read and supplier:write permissions (kept supplier role)
- [x] **New Logic**: Materials are linked to organizations via `organizationId`. The organization that owns a material IS the supplier.

### Phase 4: Budget Management (Upcoming)
- ⏳ Not started

### Phase 5: Client Portal (Upcoming)
- ⏳ Not started

---

## 🛠 Technology Stack (Confirmed)

### Frontend
- ✅ Next.js 15+
- ✅ React 18+
- ✅ TypeScript 5.6+
- ✅ Mantine UI 7.13+
- ✅ TanStack Query
- ✅ Zustand
- ✅ Framer Motion
- ✅ next-intl

### Backend
- ✅ Next.js API Routes
- ✅ Prisma ORM (Generated & Pushed to MongoDB)
- ✅ MongoDB Atlas (Connected & Schema Synced)
- ✅ NextAuth.js with Google OAuth (Fully implemented)
- ✅ Session management (JWT strategy - Fixed Nov 2, 2025)
- ✅ Authentication middleware (JWT token validation)
- ✅ Organization auto-creation (Manual in signIn callback)
- ✅ User creation without PrismaAdapter

### Infrastructure
- ✅ Cloudflare R2 (Storage)
- ✅ Cloudflare CDN
- ✅ Vercel (Hosting - planned)
- ✅ Sentry (Monitoring)
- ✅ PostHog (Analytics)

### Development
- ✅ Vitest (Unit Tests)
- ✅ Playwright (E2E Tests)
- ✅ ESLint + Prettier
- ✅ Docker Compose

---

## 🎨 Brand Implementation

### MoodB Brand Colors (Configured)
```css
--brand-background: #f7f7ed;   /* Light cream/beige */
--brand-primary: #df2538;       /* MoodB Red */
--brand-text: #000000;          /* Black */
--brand-text-inverse: #ffffff;  /* White */
```

### Usage Guidelines
- **App Background:** `#f7f7ed`
- **Logos & Titles:** `#df2538`
- **Body Text:** `#000000`
- **Primary Buttons:** `#df2538`
- **Secondary Buttons:** `#000000`

---

## 📝 Notes & Decisions

### Architecture Decisions
1. **Multi-tenancy:** Organization-based isolation at database level
2. **RTL First:** Hebrew as primary language, full RTL support
3. **Type Safety:** Strict TypeScript everywhere, no `any` types
4. **Testing:** Comprehensive coverage with unit + E2E tests
5. **Monorepo:** Single Next.js app (can split to microservices later)

### Database Design
- **MongoDB** chosen for flexibility with nested documents
- **Prisma** for type-safe database access
- **Organization scoping** on all queries for multi-tenancy
- **Audit logging** for all sensitive operations

### Security Implementation ✅ COMPREHENSIVE (December 2024)
- **NextAuth.js** with Google OAuth (fully implemented)
- **JWT sessions** with secure NEXTAUTH_SECRET
- **RBAC** with 5 distinct roles (defined in schema)
- **Session management** with JWT strategy (secure & stateless)
- **Admin Protection** - Multi-layer security system:
  - Next.js middleware protection for `/admin/*` routes
  - Server-side layout protection (checks session)
  - Client-side component protection (`useAdminGuard` hook)
  - API endpoint protection (`withAdmin` wrapper)
  - React Query hooks protection (prevents non-admin calls)
- **Rate limiting** planned with Upstash
- **Security headers** configured
- **CORS policies** to be implemented
- **Organization scoping** implemented in middleware
- **Token validation** in middleware with error handling
- **Auth error handling** with dedicated error page
- **Admin Access Control** - Comprehensive documentation and scripts

---

## 🎓 Learning & Resources

### Documentation References
- [Next.js 15 Docs](https://nextjs.org/docs)
- [Prisma MongoDB](https://www.prisma.io/docs/concepts/database-connectors/mongodb)
- [Mantine UI](https://mantine.dev)
- [Clerk Docs](https://clerk.com/docs)
- [TanStack Query](https://tanstack.com/query/latest)

### Internal Documentation
- `/Memory/project.md` - Project overview (Hebrew)
- `/Memory/technical-plan.md` - Technical architecture
- `/Memory/task-list.md` - Development roadmap
- `/CLAUDE.md` - Development standards

---

## 🚦 Current Status

**Phase:** 2 (Style Engine Core) - 65% Complete
**Status:** ✅ Admin Area COMPLETE ✅ Style APIs COMPLETE ✅ Colors Management COMPLETE ✅ Categories/SubCategories COMPLETE ✅ Materials Management COMPLETE ✅ Style Forms COMPLETE ✅ Admin UI Complete
**Latest Completion:** 
- Materials management system (admin API + UI + MaterialList component + Categories/Types tabs) (January 29, 2025)
- Material Categories and Types management (full CRUD with form drawers) (January 2025)
- Style create/edit pages (fully implemented multi-tab forms) (January 2025)
- Users management system (admin API + UI) (January 2025)
- Colors management system (admin API + UI) (January 2025)
- Categories & SubCategories management (2-layer hierarchy) (January 2025)
- Admin area with comprehensive protection layers (December 2024)
- Style management APIs (admin & user-facing) (December 2024)
- Admin pages (dashboard, styles, approvals, detail pages) (December 2024)
- MongoDB/Prisma workflow optimized (no migrations needed) (December 2024)

**Ready for:** 
- User-facing Style Library Pages (`/styles`)
- Style Form Components (wizard for creating/editing with category/sub-category selection)
- Inspiration Library System
- Palette Editor UI (colors exist, need visual editor)
- Material Set Configurator

**Blockers:** None
**Server Status:** ✅ Running on http://localhost:3000

**Next Actions:**
1. Build user-facing style library pages (`/styles` - browse, detail, create)
2. Create style form wizard components (palette editor, material set configurator)
3. Implement Inspiration Library system
4. Build style application workflow (apply style to project)

**Key Architectural Decisions:**
- Budget is per-project, NOT per-client
- Projects cannot change client after creation (prevents orphaned data)
- Search simplified to name-only due to MongoDB limitations
- Real-time updates via React Query (30s auto-refetch)
- Edit operations use drawer for better UX (no navigation)
- Collapsible form sections for optional data (budget, timeline)
- **Suppliers are Organizations** - No separate Supplier model. Materials linked to organizations via `organizationId`. The organization that owns a material is the supplier. (January 2025)

---

**Last Contributor:** Claude Code
**Environment:** Development
**Branch:** main (with uncommitted changes)

