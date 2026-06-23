'use client'

import React from 'react'
import { ArrowUpRight, ArrowDownLeft, Tag, Calendar } from 'lucide-react'

interface Transaction {
  id: number
  type: string
  amount: number
  category: string | null
  note: string | null
  date: string
}

interface RecentTransactionsProps {
  transactions: Transaction[]
}

export default function RecentTransactions({ transactions }: RecentTransactionsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
    }).format(amount)
  }

  return (
    <div className="space-y-4">
      {transactions.length === 0 ? (
        <div className="text-center py-8 text-slate-500 border border-dashed border-slate-800 rounded-2xl">
          No recent transactions found
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {transactions.slice(0, 5).map((tx) => {
            const isIncome = tx.type.toLowerCase() === 'income'
            return (
              <div
                key={tx.id}
                className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  {/* Type Icon */}
                  <div
                    className={`p-2.5 rounded-xl shrink-0 ${
                      isIncome
                        ? 'bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-500 dark:bg-rose-500/20'
                    }`}
                  >
                    {isIncome ? (
                      <ArrowUpRight className="h-5 w-5" />
                    ) : (
                      <ArrowDownLeft className="h-5 w-5" />
                    )}
                  </div>

                  {/* Transaction Metadata */}
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate text-slate-900 dark:text-slate-100">
                      {tx.note || 'No note'}
                    </p>
                    <div className="flex items-center gap-2.5 mt-1 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1 font-medium bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-md">
                        <Tag className="h-3 w-3" />
                        {tx.category || 'Uncategorized'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {tx.date}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Amount */}
                <div
                  className={`text-sm font-bold tabular-nums shrink-0 ${
                    isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {isIncome ? '+' : '-'}
                  {formatCurrency(tx.amount)}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
