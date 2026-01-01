/**
 * Credit Transactions API
 * GET /api/credits/transactions - Get transaction history
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, handleError } from '@/lib/api/middleware'
import * as creditService from '@/lib/services/credit-service'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

/**
 * GET /api/credits/transactions - Get transaction history
 */
export const GET = withAuth(async (req: NextRequest, auth) => {
  try {
    const { searchParams } = new URL(req.url)

    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const type = searchParams.get('type') as creditService.CreditTransactionType | null

    const result = await creditService.getTransactions(auth.organizationId, {
      page,
      limit,
      ...(type && { type }),
    })

    return NextResponse.json({
      data: {
        transactions: result.transactions.map((t) => ({
          id: t.id,
          type: t.type,
          amount: t.amount,
          balanceAfter: t.balanceAfter,
          description: t.description,
          referenceId: t.referenceId,
          referenceType: t.referenceType,
          createdAt: t.createdAt.toISOString(),
          user: t.user,
        })),
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      },
    })
  } catch (error) {
    return handleError(error)
  }
})
