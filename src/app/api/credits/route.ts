/**
 * Credits API
 * GET /api/credits - Get organization credit balance
 * POST /api/credits - Add credits (admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, handleError, requirePermission } from '@/lib/api/middleware'
import * as creditService from '@/lib/services/credit-service'
import { z } from 'zod'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

/**
 * GET /api/credits - Get credit balance
 */
export const GET = withAuth(async (req: NextRequest, auth) => {
  try {
    // Check and allocate monthly credits if needed
    const balance = await creditService.checkAndAllocateMonthlyCredits(
      auth.organizationId,
      auth.userId
    )

    return NextResponse.json({
      data: {
        balance: balance.balance,
        monthlyCredits: balance.monthlyCredits,
        usedThisMonth: balance.usedThisMonth,
        cycleStartDate: balance.cycleStartDate.toISOString(),
        lastUpdated: balance.lastUpdated.toISOString(),
      },
    })
  } catch (error) {
    return handleError(error)
  }
})

// Schema for adding credits (admin)
const addCreditsSchema = z.object({
  amount: z.number().int().positive('Amount must be a positive integer'),
  type: z.enum(['bonus', 'purchase']).default('bonus'),
  description: z.string().optional(),
})

/**
 * POST /api/credits - Add credits (admin only)
 */
export const POST = withAuth(async (req: NextRequest, auth) => {
  try {
    // Only admins can add credits
    requirePermission(auth, 'admin:access')

    const body = await req.json()
    const { amount, type, description } = addCreditsSchema.parse(body)

    const balance = await creditService.addCredits({
      organizationId: auth.organizationId,
      userId: auth.userId,
      type,
      amount,
      description,
      referenceType: 'admin',
    })

    return NextResponse.json({
      data: {
        balance: balance.balance,
        lastUpdated: balance.lastUpdated.toISOString(),
        message: `Added ${amount} credits successfully`,
      },
    })
  } catch (error) {
    return handleError(error)
  }
})
