/**
 * Room Validation Schemas
 * Zod schemas for room creation and updates
 */

import { z } from 'zod'
import { imagesSchema } from './upload'

/**
 * Room types (11 predefined types)
 */
export const ROOM_TYPES = [
  'living',
  'dining',
  'kitchen',
  'bedroom',
  'bathroom',
  'office',
  'entrance',
  'hallway',
  'balcony',
  'storage',
  'other',
] as const

export type RoomType = (typeof ROOM_TYPES)[number]

/**
 * Dimension units
 */
export const DIMENSION_UNITS = ['m', 'cm', 'ft', 'in'] as const

export type DimensionUnit = (typeof DIMENSION_UNITS)[number]

/**
 * Room dimensions schema
 */
export const roomDimensionsSchema = z.object({
  length: z.number().positive('Length must be positive').optional(),
  width: z.number().positive('Width must be positive').optional(),
  height: z.number().positive('Height must be positive').optional(),
  unit: z.enum(DIMENSION_UNITS).optional(),
})

export type RoomDimensions = z.infer<typeof roomDimensionsSchema>

/**
 * Create room schema
 */
export const createRoomSchema = z.object({
  name: z.string().min(1, 'Room name is required').max(100, 'Room name is too long'),
  type: z.enum(ROOM_TYPES),
  parentCategory: z.string().max(50).optional(), // Phase 2: "Private", "Public", "Commercial"
  dimensions: roomDimensionsSchema.optional(),
  notes: z.string().max(1000, 'Notes are too long').optional(),
  images: imagesSchema.optional(),
})

export type CreateRoom = z.infer<typeof createRoomSchema>

/**
 * Update room schema (all fields optional except ID)
 */
export const updateRoomSchema = z.object({
  id: z.string().uuid('Invalid room ID'),
  name: z.string().min(1, 'Room name is required').max(100, 'Room name is too long').optional(),
  type: z.enum(ROOM_TYPES).optional(),
  parentCategory: z.string().max(50).optional().nullable(), // Phase 2
  dimensions: roomDimensionsSchema.optional().nullable(),
  notes: z.string().max(1000, 'Notes are too long').optional().nullable(),
  images: imagesSchema.optional(),
})

export type UpdateRoom = z.infer<typeof updateRoomSchema>

/**
 * Room schema (full room object)
 */
export const roomSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.enum(ROOM_TYPES),
  parentCategory: z.string().optional().nullable(), // Phase 2
  dimensions: roomDimensionsSchema.optional().nullable(),
  notes: z.string().optional().nullable(),
})

export type Room = z.infer<typeof roomSchema>
