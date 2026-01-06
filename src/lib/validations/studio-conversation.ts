/**
 * Studio Conversation Validation Schemas
 * Zod schemas for studio conversation CRUD operations
 */

import { z } from 'zod'

// AI SDK Message schema (UIMessage format)
export const messageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  createdAt: z.string().datetime().or(z.date()).optional(),
  attachments: z
    .array(
      z.object({
        url: z.string().url(),
        type: z.literal('image'),
      })
    )
    .optional(),
  metadata: z
    .object({
      generatedImageUrl: z.string().url().optional(),
    })
    .optional(),
})

// Studio state snapshot schema
export const studioStateSchema = z.object({
  selectedColorIds: z.array(z.string()).default([]),
  selectedTextureIds: z.array(z.string()).default([]),
  selectedMaterialIds: z.array(z.string()).default([]),
  categoryId: z.string().nullable().optional(),
  subCategoryId: z.string().nullable().optional(),
  roomPart: z.string().nullable().optional(),
  attachedImageUrls: z.array(z.string()).default([]),
})

// Create conversation schema
export const createConversationSchema = z.object({
  roomId: z.string().min(1, 'Room ID is required'),
  projectStyleId: z.string().min(1, 'Project Style ID is required'),
  messages: z.array(messageSchema).default([]),
  studioState: studioStateSchema,
})

// Update conversation schema
export const updateConversationSchema = z.object({
  messages: z.array(messageSchema).optional(),
  studioState: studioStateSchema.optional(),
  generatedImageUrl: z.string().url().nullable().optional(),
  status: z.enum(['pending', 'generating', 'completed', 'failed']).optional(),
})

// Add message to conversation schema
export const addMessageSchema = z.object({
  message: messageSchema,
  studioState: studioStateSchema.optional(),
})

// Types
export type Message = z.infer<typeof messageSchema>
export type StudioState = z.infer<typeof studioStateSchema>
export type CreateConversationInput = z.infer<typeof createConversationSchema>
export type UpdateConversationInput = z.infer<typeof updateConversationSchema>
export type AddMessageInput = z.infer<typeof addMessageSchema>
