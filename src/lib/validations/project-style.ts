/**
 * Project Style Validation Schemas
 * Zod schemas for project style CRUD operations
 */

import { z } from 'zod'

// Room dimensions schema
export const roomDimensionsSchema = z.object({
  width: z.number().positive().optional(),
  length: z.number().positive().optional(),
  height: z.number().positive().optional(),
})

// Generated image schema
export const generatedImageSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  prompt: z.string().optional(),
  createdAt: z.string().datetime().or(z.date()),
})

// Create project style schema
export const createProjectStyleSchema = z.object({
  baseStyleIds: z.array(z.string()).default([]),  // Multiple base styles
  categoryId: z.string().optional(),
  subCategoryId: z.string().optional(),
  colorIds: z.array(z.string()).default([]),
  textureIds: z.array(z.string()).default([]),
  materialIds: z.array(z.string()).default([]),
  customPrompt: z.string().optional(),
})

// Update project style schema
export const updateProjectStyleSchema = z.object({
  baseStyleIds: z.array(z.string()).optional(),  // Multiple base styles
  categoryId: z.string().nullable().optional(),
  subCategoryId: z.string().nullable().optional(),
  colorIds: z.array(z.string()).optional(),
  textureIds: z.array(z.string()).optional(),
  materialIds: z.array(z.string()).optional(),
  customPrompt: z.string().nullable().optional(),
})

// Add base style schema
export const addBaseStyleSchema = z.object({
  styleId: z.string().min(1, 'Style ID is required'),
})

// Remove base style schema
export const removeBaseStyleSchema = z.object({
  styleId: z.string().min(1, 'Style ID is required'),
})

// Fork from style schema
export const forkStyleSchema = z.object({
  sourceStyleId: z.string().min(1, 'Source style ID is required'),
})

// Create project room schema
export const createProjectRoomSchema = z.object({
  roomType: z.string().min(1, 'Room type is required'),
  roomTypeId: z.string().optional(),
  name: z.string().optional(),
  dimensions: roomDimensionsSchema.optional(),
  overrideColorIds: z.array(z.string()).default([]),
  overrideTextureIds: z.array(z.string()).default([]),
  overrideMaterialIds: z.array(z.string()).default([]),
  customPrompt: z.string().optional(),
})

// Update project room schema
export const updateProjectRoomSchema = z.object({
  roomType: z.string().optional(),
  roomTypeId: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  dimensions: roomDimensionsSchema.nullable().optional(),
  overrideColorIds: z.array(z.string()).optional(),
  overrideTextureIds: z.array(z.string()).optional(),
  overrideMaterialIds: z.array(z.string()).optional(),
  customPrompt: z.string().nullable().optional(),
  status: z.enum(['pending', 'generating', 'completed', 'failed']).optional(),
})

// Generate room image schema
export const generateRoomSchema = z.object({
  customPrompt: z.string().optional(),
  overrideColorIds: z.array(z.string()).optional(),
  overrideTextureIds: z.array(z.string()).optional(),
  overrideMaterialIds: z.array(z.string()).optional(),
})

// Types
export type CreateProjectStyleInput = z.infer<typeof createProjectStyleSchema>
export type UpdateProjectStyleInput = z.infer<typeof updateProjectStyleSchema>
export type ForkStyleInput = z.infer<typeof forkStyleSchema>
export type AddBaseStyleInput = z.infer<typeof addBaseStyleSchema>
export type RemoveBaseStyleInput = z.infer<typeof removeBaseStyleSchema>
export type CreateProjectRoomInput = z.infer<typeof createProjectRoomSchema>
export type UpdateProjectRoomInput = z.infer<typeof updateProjectRoomSchema>
export type GenerateRoomInput = z.infer<typeof generateRoomSchema>
export type RoomDimensions = z.infer<typeof roomDimensionsSchema>
export type GeneratedImage = z.infer<typeof generatedImageSchema>
