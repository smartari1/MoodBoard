# AI-Powered Style Generation System

## Overview
Comprehensive system for generating 60+ design style pages using Google Gemini AI with hybrid poetic + factual content, intelligent color/approach selection, and complete room profiles.

## ✅ Completed Components

### 1. AI Core Infrastructure
- ✅ **AI Selection Engine** (`src/lib/ai/style-selector.ts`)
  - Intelligently selects optimal Approach + Color for each sub-category
  - Uses Gemini 2.0 Flash with 60% weight on sub-category, 25% approach, 15% color
  - Batch processing with rate limiting
  - Confidence scoring and reasoning

- ✅ **Hybrid Content Generation** (`src/lib/ai/gemini.ts`)
  - **Poetic Introduction** (inspired by `docs/text-style-example.md`)
  - **Factual Details** (structured information)
  - Combined output with both emotional and technical content
  - Bilingual (Hebrew + English)

- ✅ **Room Profile Generator** (`src/lib/ai/gemini.ts`)
  - Generates 24 room-specific profiles per style
  - Includes: materials, furniture, lighting, spatial layout, design tips
  - Room-specific color palettes and applications

### 2. Image Generation
- ✅ **Style Images** (`src/lib/ai/image-generation.ts`)
  - 3 variations per style: wide-angle, detail shot, furniture arrangement
  - Uses Gemini 2.5 Flash Image model
  - Uploads to GCP Storage automatically
  - Fallback to placeholders if quota exceeded

- ✅ **Room-Specific Images** (`src/lib/ai/image-generation.ts`)
  - 3 images per room type (72 images per style)
  - Room-appropriate prompts (kitchen shows appliances, bedroom shows bed, etc.)
  - Total: 75 images per style (3 general + 72 room)

### 3. Prompt Templates
- ✅ **Poetic Introduction** (`src/lib/ai/prompts/style-poetic-intro.ts`)
  - Hebrew artistic style with 4 paragraphs
  - Focuses on harmony, nature, color relationships, form

- ✅ **Factual Details** (`src/lib/ai/prompts/style-factual-details.ts`)
  - Structured content: period, characteristics, visual elements
  - Historical/cultural context, color/material guidance

- ✅ **Room Profiles** (`src/lib/ai/prompts/room-profile.ts`)
  - Room-specific applications of style
  - Furniture, materials, lighting, spatial considerations

### 4. Seed Service
- ✅ **seedStyles() Function** (`src/lib/seed/seed-service.ts`)
  - **Auto-Filter**: Automatically excludes sub-categories that already have styles
  - **AI Selection**: Batch selects optimal combinations
  - **Content Generation**: Hybrid poetic + factual
  - **Image Generation**: 75 images per style
  - **Progress Tracking**: Real-time callbacks
  - **Error Handling**: Continues on failures, logs all errors

- ✅ **Cost Calculator** (`src/lib/seed/cost-calculator.ts`)
  - Estimates costs per style and total
  - Breakdown by component (text, images)
  - Time estimation
  - Format functions for display

### 5. Database Schema
- ✅ **SeedExecution Model** (`prisma/schema.prisma`)
  - Tracks all seed runs with full configuration
  - Stores results, stats, errors
  - Links to generated styles for easy navigation
  - Performance metrics (duration, cost)

### 6. Admin UI & API
- ✅ **Seed Control Page** (`src/app/[locale]/admin/seed-styles/page.tsx`)
  - Simple configuration interface
  - Real-time progress with Server-Sent Events
  - Cost estimation display
  - Status tracking (X/60 completed)

- ✅ **Seed API Route** (`src/app/api/admin/seed-styles/route.ts`)
  - SSE streaming for real-time updates
  - Progressive SeedExecution tracking
  - Handles configuration and execution
  - Returns detailed results

- ✅ **History API Routes**
  - `GET /api/admin/seed-styles/history` - List all executions
    - Pagination support (limit, offset)
    - Filter by status (running, completed, failed, stopped)
    - Summary metrics per execution
  - `GET /api/admin/seed-styles/history/[id]` - Detailed execution view
    - Full execution data with all generated styles
    - Links to admin edit pages
    - Performance metrics and error logs

### 7. Configuration
- ✅ **Environment Variables** (`env.example`)
  - GEMINI_API_KEY configuration
  - Documentation for free vs paid tiers
  - GCP Storage integration

## ✅ Completed Features

All major features are now complete and ready for testing:

### Admin UI & Execution Tracking
- [x] Cost Breakdown Table UI component with detailed per-component costs
- [x] Execution History Table UI component with expandable style lists
- [x] Real-time status indicators (X/Y completed)
- [x] Live completed styles list with admin edit links
- [x] Progressive execution tracking with SSE events
- [x] History API endpoints (list + detail)
- [x] Progressive SeedExecution database tracking
- [x] Auto-refresh history during active generation

## 📊 System Capabilities

### Per Style Generation
- **Text Content**:
  - AI-selected approach + color combination
  - Poetic introduction (4 paragraphs, bilingual)
  - Factual details (10+ sections, bilingual)
  - 24 room profiles (comprehensive)

- **Images**: 75 total
  - 3 general style images (wide, detail, furniture)
  - 72 room-specific images (24 rooms × 3 images)

- **Cost**: ~$0.24 per style
  - Text: ~$0.014
  - Images: ~$0.225

- **Time**: ~3 minutes per style

### Full Generation (60 Styles)
- **Total Images**: 4,500 (180 general + 4,320 room)
- **Total Cost**: ~$15-17
- **Total Time**: ~3 hours
- **Database Records**: 60 styles + 1,440 room profiles

## 🎯 Usage

### Access Admin UI
```
Navigate to: /admin/seed-styles
```

### Configure Generation
1. Set number of styles (1-60)
2. Enable/disable images
3. Enable/disable room profiles
4. Use dry-run for testing

### Monitor Progress
- Real-time SSE updates
- Progress percentage
- Current sub-category being processed
- Image generation status

### Auto-Filter Protection
- System automatically skips sub-categories with existing styles
- Shows: "X/60 already generated, Y pending"
- Prevents duplicate generation and wasted credits

## 📁 File Structure

```
src/
├── lib/
│   ├── ai/
│   │   ├── gemini.ts (content generation)
│   │   ├── image-generation.ts (image gen)
│   │   ├── style-selector.ts (AI selection)
│   │   └── prompts/
│   │       ├── style-poetic-intro.ts
│   │       ├── style-factual-details.ts
│   │       └── room-profile.ts
│   ├── seed/
│   │   ├── seed-service.ts (main orchestration)
│   │   ├── cost-calculator.ts (cost utils)
│   │   └── parser.ts (data parsing)
│   └── storage/
│       └── gcp-storage.ts (image upload)
├── app/
│   ├── api/admin/seed-styles/
│   │   └── route.ts (SSE API)
│   └── [locale]/admin/seed-styles/
│       └── page.tsx (UI)
└── ...

prisma/
└── schema.prisma (SeedExecution model)

docs/
├── text-style-example.md (poetic reference)
└── STYLE_GENERATION_SYSTEM.md (this file)
```

## 🔑 Key Features

### 1. Zero Duplicate Risk
- Auto-filters existing sub-categories
- Impossible to regenerate accidentally
- Always picks up where you left off

### 2. Incremental Generation
- Generate 10 today, 20 tomorrow
- Resume-friendly architecture
- Clear progress tracking

### 3. Cost Transparency
- Detailed breakdown before generation
- Per-component costs visible
- Actual costs tracked (when available)

### 4. Quality Content
- Hybrid poetic + factual approach
- Bilingual (Hebrew RTL + English)
- Comprehensive room applications
- Professional interior photography

### 5. Error Resilience
- Continues on individual failures
- Logs all errors for review
- Returns partial success results

### 6. Execution Tracking & History
- **Progressive Database Saves**: Every completed style is immediately saved to SeedExecution record
- **Real-Time Updates**: SSE events notify when each style completes
- **Complete Audit Trail**: Full execution history with timestamps, config, results
- **Detailed Metrics**: Duration, cost, success/failure stats per execution
- **Style Links**: Direct admin edit links for all generated styles
- **Crash Recovery**: Even if generation fails mid-way, partial progress is saved
- **Status Monitoring**: Track running, completed, failed, or stopped executions

## 🔄 Generation Flow

```
User Opens Admin UI
↓
Shows Status: X/60 generated, Y pending
↓
User Sets Limit (e.g., 10)
↓
Shows Estimated Cost & Time
↓
User Clicks "Start Generation"
↓
API Creates SeedExecution Record (status: 'running')
├→ Store config, estimated cost, initial stats
├→ SSE: Send 'start' event with executionId
↓
Query Sub-Categories from DB
↓
Auto-Filter: Remove those with existing styles
↓
Take First N from Pending List
↓
For Each Pending Sub-Category:
  ├→ AI Selects Optimal Approach + Color
  ├→ Generate Hybrid Content (Poetic + Factual)
  ├→ Generate 3 General Images
  ├→ SAVE Style to Database (basic content)
  ├→ For Each of 24 Rooms:
  │   ├→ Generate Room Profile Content
  │   ├→ Generate 3 Room Images
  │   └→ IMMEDIATELY UPDATE Style (append room)
  ├→ Style Fully Complete!
  ├→ UPDATE SeedExecution (push GeneratedStyleReference)
  ├→ SSE: Send 'style-completed' event
  └→ Continue to next style...
↓
All Styles Complete
↓
UPDATE SeedExecution (status: 'completed')
├→ Final stats, duration, errors
├→ completedAt timestamp
↓
SSE: Send 'complete' event
↓
Show Final Results + Links
```

## 🎨 Admin UI Features

### Configuration Panel
- **Number of Styles**: Slider to select 1-60 styles to generate
- **Category Filter**: Optional filter to target specific categories
- **Image Generation Toggle**: Enable/disable image generation (Gemini 2.5 Flash Image)
- **Room Profiles Toggle**: Enable/disable 24-room generation per style
- **Dry Run Mode**: Test without saving to database

### Cost Breakdown (Collapsible)
- **Text Generation Costs**:
  - AI Selection (Approach + Color): Shows count and per-unit cost
  - Main Content (Poetic + Factual): Displays generation costs
  - Room Profiles (24 per style): Itemized room profile costs
- **Image Generation Costs**:
  - General Images (3 per style): Wide angle, detail, furniture shots
  - Room Images (72 per style): 3 images × 24 rooms
- **Grand Total**: Badge showing estimated total cost in USD
- **Time Estimate**: Shows approximate generation time

### Real-Time Progress Monitor
- **Progress Bar**: Animated bar showing X/Y styles completed
- **Execution ID Badge**: Short execution ID for tracking
- **Completed Styles List**: Live-updating list with:
  - Style names (English + Hebrew)
  - Direct "Edit" links to admin pages
  - Auto-scrolling as new styles complete
- **Progress Timeline**: Last 20 progress messages with timestamps
- **SSE Events**: Real-time Server-Sent Events stream

### Execution Results
- **Success/Failure Badge**: Visual completion status
- **Stats Dashboard**: Created, Updated, Skipped, Errors count
- **Error Details**: Expandable list of any errors encountered

### Execution History Table
- **Pagination**: 10 executions per page
- **Auto-Refresh**: Refreshes every 5 seconds during active generation
- **Expandable Rows**: Click to see generated styles list
- **Per-Execution Data**:
  - Date & time of execution
  - Status badge (Running, Completed, Failed, Stopped)
  - Styles created count
  - Duration (minutes/hours)
  - Cost (actual or estimated)
  - Configuration used (limit, dry run, etc.)
- **Generated Styles Table**: For each execution:
  - Style name (bilingual)
  - Sub-category
  - Direct "Edit" link to admin page

## 🚀 Next Steps

1. ✅ ~~Complete execution history API~~ (DONE)
2. ✅ ~~Progressive SeedExecution tracking~~ (DONE)
3. ✅ ~~Build execution history UI component~~ (DONE)
4. ✅ ~~Add cost breakdown table component~~ (DONE)
5. **Run database migration** (`npx prisma db push` for SeedExecution model)
6. **Test crash recovery** (kill process mid-generation, verify partial data)
7. **Test with 2-3 styles** in production with real Gemini API
8. **Review and refine prompts** based on test results
9. **Generate full 60-style batch** with monitoring
10. **Build style browsing UI** for end users

## 📝 Notes

- GCP Storage integration fully configured
- Gemini API key required (free or paid tier)
- MongoDB database with Prisma ORM
- Next.js 14 with App Router
- Mantine UI components
- Hebrew RTL as primary language
