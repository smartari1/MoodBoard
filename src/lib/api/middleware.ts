/**
 * API Middleware for MoodB
 * Handles authentication, authorization, and multi-tenancy
 */

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { ZodError, ZodSchema } from 'zod'
import { hasPermission, type Permission, type UserRole } from '../auth/rbac'
import {
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
  AppError,
  InternalServerError,
} from '../errors'

/**
 * Authenticated user context
 */
export interface AuthContext {
  userId: string
  email: string
  organizationId: string
  role: UserRole
}

/**
 * Get authenticated user from request
 */
export async function getAuthUser(req: NextRequest): Promise<AuthContext> {
  // Must match cookie configuration in auth-config.ts
  const cookieName = process.env.NODE_ENV === 'production'
    ? '__Secure-authjs.session-token'
    : 'authjs.session-token'

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: cookieName,
  })

  if (!token || !token.email) {
    throw new UnauthorizedError('Authentication required')
  }

  // Use data from JWT token (already populated in jwt callback)
  const userId = token.id as string
  const organizationId = token.organizationId as string
  const role = token.role as string

  if (!userId) {
    throw new UnauthorizedError('User ID not found in token')
  }

  if (!organizationId) {
    throw new ForbiddenError('User not associated with an organization')
  }

  if (!role) {
    throw new ForbiddenError('User role not assigned')
  }

  return {
    userId,
    email: token.email as string,
    organizationId,
    role: role as UserRole,
  }
}

/**
 * Require specific permission
 */
export function requirePermission(
  auth: AuthContext,
  permission: Permission
): void {
  if (!hasPermission(auth.role, permission)) {
    throw new ForbiddenError(
      `Permission denied: ${permission} required`
    )
  }
}

/**
 * Require any of the specified permissions
 */
export function requireAnyPermission(
  auth: AuthContext,
  permissions: Permission[]
): void {
  const hasAny = permissions.some(permission =>
    hasPermission(auth.role, permission)
  )

  if (!hasAny) {
    throw new ForbiddenError(
      `Permission denied: One of ${permissions.join(', ')} required`
    )
  }
}

/**
 * Validate request body against Zod schema
 */
export async function validateRequest<T>(
  req: NextRequest,
  schema: ZodSchema<T>
): Promise<T> {
  try {
    const body = await req.json()
    return schema.parse(body)
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ValidationError('Invalid request data', error.errors)
    }
    throw error
  }
}

/**
 * Verify resource belongs to organization
 */
export async function verifyOrganizationAccess(
  resourceOrganizationId: string,
  userOrganizationId: string
): Promise<void> {
  if (resourceOrganizationId !== userOrganizationId) {
    throw new ForbiddenError('Access denied to this resource')
  }
}

/**
 * Handle API errors and return appropriate response
 */
export function handleError(error: unknown): NextResponse {
  console.error('API Error:', error)

  // Handle known AppError
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        ...(error instanceof ValidationError && { details: error.details }),
      },
      { status: error.statusCode }
    )
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: error.errors,
      },
      { status: 400 }
    )
  }

  // Handle Prisma errors
  if (error && typeof error === 'object' && 'code' in error) {
    const prismaError = error as { code: string; meta?: unknown }

    if (prismaError.code === 'P2002') {
      return NextResponse.json(
        {
          error: 'Resource already exists',
          code: 'CONFLICT',
        },
        { status: 409 }
      )
    }

    if (prismaError.code === 'P2025') {
      return NextResponse.json(
        {
          error: 'Resource not found',
          code: 'NOT_FOUND',
        },
        { status: 404 }
      )
    }
  }

  // Generic error
  return NextResponse.json(
    {
      error: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR',
    },
    { status: 500 }
  )
}

/**
 * API Route wrapper with authentication and error handling
 */
export function withAuth<T = unknown>(
  handler: (req: NextRequest, auth: AuthContext, context?: T) => Promise<NextResponse>
) {
  return async (req: NextRequest, context?: T): Promise<NextResponse> => {
    try {
      const auth = await getAuthUser(req)
      return await handler(req, auth, context)
    } catch (error) {
      return handleError(error)
    }
  }
}

/**
 * API Route wrapper with permission check
 */
export function withPermission(
  permission: Permission,
  handler: (req: NextRequest, auth: AuthContext) => Promise<NextResponse>
) {
  return withAuth(async (req, auth) => {
    requirePermission(auth, permission)
    return await handler(req, auth)
  })
}
