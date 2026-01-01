/**
 * Credit Service
 * Manages organization credit balance for AI image generation
 */

import { prisma } from '@/lib/db'

export type CreditTransactionType = 'purchase' | 'usage' | 'refund' | 'bonus' | 'monthly_allocation'
export type CreditReferenceType = 'generation' | 'stripe' | 'admin' | 'system'
export type PlanType = 'free' | 'pro' | 'enterprise'

// Plan credit allocations per month
export const PLAN_CREDITS: Record<PlanType, number> = {
  free: 20,
  pro: 100,
  enterprise: 500,
}

export interface CreditBalance {
  balance: number
  monthlyCredits: number
  usedThisMonth: number
  cycleStartDate: Date
  lastUpdated: Date
}

export interface CreditBalanceSimple {
  balance: number
  lastUpdated: Date
}

export interface CreditTransactionInput {
  organizationId: string
  userId: string
  type: CreditTransactionType
  amount: number
  description?: string
  referenceId?: string
  referenceType?: CreditReferenceType
}

export class InsufficientCreditsError extends Error {
  constructor(required: number, available: number) {
    super(`Insufficient credits: required ${required}, available ${available}`)
    this.name = 'InsufficientCreditsError'
  }
}

/**
 * Get the current credit balance for an organization
 */
export async function getBalance(organizationId: string): Promise<CreditBalance> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      creditBalance: true,
      subscription: true,
    },
  })

  const plan = (org?.subscription?.plan || 'free') as PlanType
  const monthlyCredits = PLAN_CREDITS[plan] || PLAN_CREDITS.free

  if (!org?.creditBalance) {
    return {
      balance: 0,
      monthlyCredits,
      usedThisMonth: 0,
      cycleStartDate: new Date(),
      lastUpdated: new Date(),
    }
  }

  return {
    balance: org.creditBalance.balance,
    monthlyCredits: org.creditBalance.monthlyCredits || monthlyCredits,
    usedThisMonth: org.creditBalance.usedThisMonth || 0,
    cycleStartDate: org.creditBalance.cycleStartDate || new Date(),
    lastUpdated: org.creditBalance.lastUpdated,
  }
}

/**
 * Get simple balance (for backward compatibility)
 */
export async function getBalanceSimple(organizationId: string): Promise<CreditBalanceSimple> {
  const balance = await getBalance(organizationId)
  return {
    balance: balance.balance,
    lastUpdated: balance.lastUpdated,
  }
}

/**
 * Add credits to an organization (purchase, bonus, admin)
 */
export async function addCredits(input: CreditTransactionInput): Promise<CreditBalance> {
  const { organizationId, userId, type, amount, description, referenceId, referenceType } = input

  if (amount <= 0) {
    throw new Error('Amount must be positive when adding credits')
  }

  // Get current balance
  const currentBalance = await getBalance(organizationId)
  const newBalance = currentBalance.balance + amount

  // Update organization balance and create transaction in a transaction
  const [org] = await prisma.$transaction([
    prisma.organization.update({
      where: { id: organizationId },
      data: {
        creditBalance: {
          balance: newBalance,
          lastUpdated: new Date(),
        },
      },
    }),
    prisma.creditTransaction.create({
      data: {
        organizationId,
        userId,
        type,
        amount, // positive
        balanceAfter: newBalance,
        description,
        referenceId,
        referenceType,
      },
    }),
  ])

  return {
    balance: org.creditBalance?.balance ?? 0,
    lastUpdated: org.creditBalance?.lastUpdated ?? new Date(),
  }
}

/**
 * Deduct credits from an organization (usage)
 */
export async function deductCredits(input: CreditTransactionInput): Promise<CreditBalance> {
  const { organizationId, userId, amount, description, referenceId, referenceType } = input

  if (amount <= 0) {
    throw new Error('Amount must be positive when deducting credits')
  }

  // Get current balance
  const currentBalance = await getBalance(organizationId)

  if (currentBalance.balance < amount) {
    throw new InsufficientCreditsError(amount, currentBalance.balance)
  }

  const newBalance = currentBalance.balance - amount

  // Update organization balance and create transaction in a transaction
  const [org] = await prisma.$transaction([
    prisma.organization.update({
      where: { id: organizationId },
      data: {
        creditBalance: {
          balance: newBalance,
          lastUpdated: new Date(),
        },
      },
    }),
    prisma.creditTransaction.create({
      data: {
        organizationId,
        userId,
        type: 'usage',
        amount: -amount, // negative for usage
        balanceAfter: newBalance,
        description,
        referenceId,
        referenceType,
      },
    }),
  ])

  return {
    balance: org.creditBalance?.balance ?? 0,
    lastUpdated: org.creditBalance?.lastUpdated ?? new Date(),
  }
}

/**
 * Refund credits to an organization (failed generation)
 */
export async function refundCredits(input: CreditTransactionInput): Promise<CreditBalance> {
  const { organizationId, userId, amount, description, referenceId } = input

  if (amount <= 0) {
    throw new Error('Amount must be positive when refunding credits')
  }

  // Get current balance
  const currentBalance = await getBalance(organizationId)
  const newBalance = currentBalance.balance + amount

  // Update organization balance and create transaction in a transaction
  const [org] = await prisma.$transaction([
    prisma.organization.update({
      where: { id: organizationId },
      data: {
        creditBalance: {
          balance: newBalance,
          lastUpdated: new Date(),
        },
      },
    }),
    prisma.creditTransaction.create({
      data: {
        organizationId,
        userId,
        type: 'refund',
        amount, // positive for refund
        balanceAfter: newBalance,
        description: description || 'Refund for failed generation',
        referenceId,
        referenceType: 'generation',
      },
    }),
  ])

  return {
    balance: org.creditBalance?.balance ?? 0,
    lastUpdated: org.creditBalance?.lastUpdated ?? new Date(),
  }
}

/**
 * Check if organization has enough credits
 */
export async function hasCredits(organizationId: string, required: number = 1): Promise<boolean> {
  const balance = await getBalance(organizationId)
  return balance.balance >= required
}

/**
 * Get credit transaction history for an organization
 */
export async function getTransactions(
  organizationId: string,
  options: {
    page?: number
    limit?: number
    type?: CreditTransactionType
  } = {}
) {
  const { page = 1, limit = 20, type } = options
  const skip = (page - 1) * limit

  const where = {
    organizationId,
    ...(type && { type }),
  }

  const [transactions, total] = await prisma.$transaction([
    prisma.creditTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    }),
    prisma.creditTransaction.count({ where }),
  ])

  return {
    transactions,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }
}

/**
 * Admin: Set credit balance directly (use with caution)
 */
export async function setBalance(
  organizationId: string,
  userId: string,
  newBalance: number,
  description?: string
): Promise<CreditBalanceSimple> {
  const currentBalance = await getBalance(organizationId)
  const difference = newBalance - currentBalance.balance

  const [org] = await prisma.$transaction([
    prisma.organization.update({
      where: { id: organizationId },
      data: {
        creditBalance: {
          balance: newBalance,
          monthlyCredits: currentBalance.monthlyCredits,
          usedThisMonth: currentBalance.usedThisMonth,
          cycleStartDate: currentBalance.cycleStartDate,
          lastUpdated: new Date(),
        },
      },
    }),
    prisma.creditTransaction.create({
      data: {
        organizationId,
        userId,
        type: difference >= 0 ? 'bonus' : 'usage',
        amount: difference,
        balanceAfter: newBalance,
        description: description || `Admin balance adjustment: ${currentBalance.balance} -> ${newBalance}`,
        referenceType: 'admin',
      },
    }),
  ])

  return {
    balance: org.creditBalance?.balance ?? 0,
    lastUpdated: org.creditBalance?.lastUpdated ?? new Date(),
  }
}

/**
 * Initialize credits for a new organization based on their plan
 * Called when organization is created or plan is upgraded
 */
export async function initializeCredits(
  organizationId: string,
  userId: string,
  plan: PlanType = 'free'
): Promise<CreditBalance> {
  const monthlyCredits = PLAN_CREDITS[plan]
  const now = new Date()

  const [org] = await prisma.$transaction([
    prisma.organization.update({
      where: { id: organizationId },
      data: {
        creditBalance: {
          balance: monthlyCredits,
          monthlyCredits,
          usedThisMonth: 0,
          cycleStartDate: now,
          lastUpdated: now,
        },
      },
    }),
    prisma.creditTransaction.create({
      data: {
        organizationId,
        userId,
        type: 'monthly_allocation',
        amount: monthlyCredits,
        balanceAfter: monthlyCredits,
        description: `Initial ${plan} plan allocation: ${monthlyCredits} credits`,
        referenceType: 'system',
      },
    }),
  ])

  return {
    balance: org.creditBalance?.balance ?? monthlyCredits,
    monthlyCredits,
    usedThisMonth: 0,
    cycleStartDate: now,
    lastUpdated: now,
  }
}

/**
 * Upgrade organization plan and adjust credits
 */
export async function upgradePlan(
  organizationId: string,
  userId: string,
  newPlan: PlanType
): Promise<CreditBalance> {
  const currentBalance = await getBalance(organizationId)
  const newMonthlyCredits = PLAN_CREDITS[newPlan]
  const additionalCredits = Math.max(0, newMonthlyCredits - currentBalance.monthlyCredits)
  const newBalance = currentBalance.balance + additionalCredits
  const now = new Date()

  const [org] = await prisma.$transaction([
    prisma.organization.update({
      where: { id: organizationId },
      data: {
        subscription: {
          plan: newPlan,
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          seats: 1,
        },
        creditBalance: {
          balance: newBalance,
          monthlyCredits: newMonthlyCredits,
          usedThisMonth: currentBalance.usedThisMonth,
          cycleStartDate: currentBalance.cycleStartDate,
          lastUpdated: now,
        },
      },
    }),
    prisma.creditTransaction.create({
      data: {
        organizationId,
        userId,
        type: 'bonus',
        amount: additionalCredits,
        balanceAfter: newBalance,
        description: `Plan upgrade to ${newPlan}: +${additionalCredits} credits`,
        referenceType: 'system',
      },
    }),
  ])

  return {
    balance: org.creditBalance?.balance ?? newBalance,
    monthlyCredits: newMonthlyCredits,
    usedThisMonth: currentBalance.usedThisMonth,
    cycleStartDate: currentBalance.cycleStartDate,
    lastUpdated: now,
  }
}

/**
 * Check and allocate monthly credits if a new billing cycle has started
 * Should be called on user login or API access
 */
export async function checkAndAllocateMonthlyCredits(
  organizationId: string,
  userId: string
): Promise<CreditBalance> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      creditBalance: true,
      subscription: true,
    },
  })

  if (!org) {
    throw new Error('Organization not found')
  }

  const plan = (org.subscription?.plan || 'free') as PlanType
  const monthlyCredits = PLAN_CREDITS[plan]
  const now = new Date()

  // If no credit balance exists, initialize it
  if (!org.creditBalance) {
    return initializeCredits(organizationId, userId, plan)
  }

  const cycleStartDate = org.creditBalance.cycleStartDate || now
  const daysSinceCycleStart = Math.floor(
    (now.getTime() - cycleStartDate.getTime()) / (1000 * 60 * 60 * 24)
  )

  // If 30+ days have passed, allocate new monthly credits
  if (daysSinceCycleStart >= 30) {
    const newBalance = org.creditBalance.balance + monthlyCredits

    const [updatedOrg] = await prisma.$transaction([
      prisma.organization.update({
        where: { id: organizationId },
        data: {
          creditBalance: {
            balance: newBalance,
            monthlyCredits,
            usedThisMonth: 0,
            cycleStartDate: now,
            lastUpdated: now,
          },
        },
      }),
      prisma.creditTransaction.create({
        data: {
          organizationId,
          userId,
          type: 'monthly_allocation',
          amount: monthlyCredits,
          balanceAfter: newBalance,
          description: `Monthly ${plan} plan allocation: ${monthlyCredits} credits`,
          referenceType: 'system',
        },
      }),
    ])

    return {
      balance: updatedOrg.creditBalance?.balance ?? newBalance,
      monthlyCredits,
      usedThisMonth: 0,
      cycleStartDate: now,
      lastUpdated: now,
    }
  }

  // No allocation needed, return current balance
  return {
    balance: org.creditBalance.balance,
    monthlyCredits: org.creditBalance.monthlyCredits || monthlyCredits,
    usedThisMonth: org.creditBalance.usedThisMonth || 0,
    cycleStartDate,
    lastUpdated: org.creditBalance.lastUpdated,
  }
}
