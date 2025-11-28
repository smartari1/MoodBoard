/**
 * Shared constants and types for seed-styles admin pages
 */

// All 24 room types
export const ROOM_TYPES = [
  { value: 'entryway-foyer', label: 'Entryway / Foyer' },
  { value: 'living-room', label: 'Living Room' },
  { value: 'dining-room', label: 'Dining Room' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'primary-bedroom', label: 'Primary Bedroom' },
  { value: 'bedroom', label: 'Bedroom' },
  { value: 'kids-room', label: 'Kids Room' },
  { value: 'nursery', label: 'Nursery' },
  { value: 'bathroom', label: 'Bathroom' },
  { value: 'powder-room', label: 'Powder Room' },
  { value: 'walk-in-closet', label: 'Walk-In Closet' },
  { value: 'hallway', label: 'Hallway' },
  { value: 'staircase', label: 'Staircase' },
  { value: 'balcony-terrace', label: 'Balcony / Terrace' },
  { value: 'family-room-tv-area', label: 'Family Room / TV Area' },
  { value: 'home-office', label: 'Home Office' },
  { value: 'library-reading-area', label: 'Library / Reading Area' },
  { value: 'laundry', label: 'Laundry' },
  { value: 'guest-suite', label: 'Guest Suite' },
  { value: 'gym-fitness', label: 'Gym / Fitness' },
  { value: 'playroom', label: 'Playroom' },
  { value: 'mudroom', label: 'Mudroom' },
  { value: 'wine-cellar', label: 'Wine Cellar' },
  { value: 'home-theater', label: 'Home Theater' },
]

// Category options
export const CATEGORY_OPTIONS = [
  { value: 'ancient-world', label: 'Ancient World' },
  { value: 'classical-styles', label: 'Classical Styles' },
  { value: 'regional-styles', label: 'Regional Styles' },
  { value: 'early-modern', label: 'Early Modern' },
  { value: '20th-century-design', label: '20th Century Design' },
  { value: 'contemporary-design', label: 'Contemporary Design' },
  { value: 'design-approaches', label: 'Design Approaches' },
]

// Phase 2: Price level options
export const PRICE_LEVEL_OPTIONS = [
  { value: 'REGULAR', label: 'Regular', description: 'Accessible, budget-friendly materials and finishes' },
  { value: 'LUXURY', label: 'Luxury', description: 'Premium materials, high-end finishes, exclusive brands' },
  { value: 'RANDOM', label: 'Random', description: 'AI randomly assigns Regular or Luxury per style' },
]

export type PriceLevel = 'REGULAR' | 'LUXURY' | 'RANDOM'

// Phase 2: Generation phase types for progress tracking
export type GenerationPhase =
  | 'ai-selection'      // AI selecting approach & color
  | 'text-content'      // Generating hybrid content
  | 'asset-prep'        // Pre-creating materials
  | 'golden-scenes'     // 6 general style images
  | 'textures'          // Texture entity generation
  | 'materials'         // Material entity creation
  | 'material-images'   // Material close-up photos
  | 'special-images'    // Composite & Anchor
  | 'room-profiles'     // Room profile content
  | 'room-images'       // Room walkthrough images

// Progress event from SSE stream
export interface ProgressEvent {
  message: string
  current?: number
  total?: number
  percentage?: number
  timestamp: string
}

// Seed result structure
export interface SeedResult {
  success: boolean
  stats: {
    styles: {
      created: number
      updated: number
      skipped: number
    }
  }
  errors: Array<{ entity: string; error: string }>
}

// Completed style info
export interface CompletedStyle {
  styleId: string
  styleName: { he: string; en: string }
  slug: string
}
