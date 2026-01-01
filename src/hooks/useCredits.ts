/**
 * React Query hooks for Credit Management
 * Manages credit balance and transaction history
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'

// Query keys
const CREDITS_QUERY_KEY = 'credits'
const CREDIT_TRANSACTIONS_KEY = 'credit-transactions'

// Types
export interface CreditBalance {
  balance: number
  monthlyCredits: number
  usedThisMonth: number
  cycleStartDate: string
  lastUpdated: string
}

export interface CreditTransaction {
  id: string
  type: 'purchase' | 'usage' | 'refund' | 'bonus'
  amount: number
  balanceAfter: number
  description: string | null
  referenceId: string | null
  referenceType: string | null
  createdAt: string
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
  }
}

export interface CreditTransactionsResponse {
  transactions: CreditTransaction[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface AddCreditsInput {
  amount: number
  type?: 'bonus' | 'purchase'
  description?: string
}

// API functions
async function fetchCreditBalance(): Promise<{ data: CreditBalance }> {
  const response = await fetch('/api/credits')

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch credit balance')
  }

  return response.json()
}

async function fetchCreditTransactions(
  page: number = 1,
  limit: number = 20,
  type?: string
): Promise<{ data: CreditTransactionsResponse }> {
  const params = new URLSearchParams()
  params.append('page', page.toString())
  params.append('limit', limit.toString())
  if (type) params.append('type', type)

  const response = await fetch(`/api/credits/transactions?${params.toString()}`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch credit transactions')
  }

  return response.json()
}

async function addCredits(input: AddCreditsInput): Promise<{ data: CreditBalance & { message: string } }> {
  const response = await fetch('/api/credits', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to add credits')
  }

  return response.json()
}

/**
 * Hook to fetch credit balance
 */
export function useCreditBalance() {
  const { data: session } = useSession()

  return useQuery({
    queryKey: [CREDITS_QUERY_KEY],
    queryFn: fetchCreditBalance,
    enabled: !!session,
    select: (data) => data.data,
    staleTime: 30 * 1000, // 30 seconds - credits may change frequently
    refetchOnWindowFocus: true,
  })
}

/**
 * Hook to fetch credit transaction history
 */
export function useCreditTransactions(
  page: number = 1,
  limit: number = 20,
  type?: 'purchase' | 'usage' | 'refund' | 'bonus'
) {
  const { data: session } = useSession()

  return useQuery({
    queryKey: [CREDIT_TRANSACTIONS_KEY, page, limit, type],
    queryFn: () => fetchCreditTransactions(page, limit, type),
    enabled: !!session,
    select: (data) => data.data,
    staleTime: 30 * 1000, // 30 seconds
  })
}

/**
 * Hook to add credits (admin only)
 */
export function useAddCredits() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: addCredits,
    onSuccess: () => {
      // Invalidate credit queries to refetch new balance
      queryClient.invalidateQueries({ queryKey: [CREDITS_QUERY_KEY] })
      queryClient.invalidateQueries({ queryKey: [CREDIT_TRANSACTIONS_KEY] })
    },
  })
}

/**
 * Hook to check if user has enough credits
 */
export function useHasCredits(required: number = 1) {
  const { data: balance, isLoading } = useCreditBalance()

  return {
    hasCredits: (balance?.balance ?? 0) >= required,
    balance: balance?.balance ?? 0,
    isLoading,
  }
}

/**
 * Invalidate credit queries (useful after generation)
 */
export function useInvalidateCredits() {
  const queryClient = useQueryClient()

  return () => {
    queryClient.invalidateQueries({ queryKey: [CREDITS_QUERY_KEY] })
    queryClient.invalidateQueries({ queryKey: [CREDIT_TRANSACTIONS_KEY] })
  }
}
