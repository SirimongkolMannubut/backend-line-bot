'use client'

import React, { useEffect, useState, useMemo } from 'react'
import OverviewChart from '@/components/overview-chart'
import RecentTransactions from '@/components/recent-transactions'
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  FileText,
  Calendar as CalendarIcon,
  RefreshCw,
  Plus,
} from 'lucide-react'
import Link from 'next/link'

interface Transaction {
  id: number
  type: string
  amount: number
  category: string | null
  note: string | null
  date: string
}

interface Slip {
  id: number
  amount: number | null
  bank: string | null
  ref: string | null
  created: string
}

export default function DashboardPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [slips, setSlips] = useState<Slip[]>([])
  const [loading, setLoading] = useState(true)
  const [filterPeriod, setFilterPeriod] = useState<'7days' | '30days' | 'year' | 'all'>('30days')

  const fetchData = async () => {
    setLoading(true)
    try {
      const [txRes, slipRes] = await Promise.all([
        fetch('/api/transactions?limit=100'),
        fetch('/api/slips?limit=10'),
      ])
      if (txRes.ok) {
        const txData = await txRes.json()
        setTransactions(txData)
      }
      if (slipRes.ok) {
        const slipData = await slipRes.json()
        setSlips(slipData)
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Filter transactions based on selected period
  const filteredTransactions = useMemo(() => {
    const now = new Date()
    return transactions.filter((tx) => {
      const txDate = new Date(tx.date)
      const diffTime = Math.abs(now.getTime() - txDate.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      if (filterPeriod === '7days') return diffDays <= 7
      if (filterPeriod === '30days') return diffDays <= 30
      if (filterPeriod === 'year') return txDate.getFullYear() === now.getFullYear()
      return true
    })
  }, [transactions, filterPeriod])

  // Aggregate Metrics
  const metrics = useMemo(() => {
    let income = 0
    let expense = 0
    filteredTransactions.forEach((tx) => {
      const amt = tx.amount
      if (tx.type.toLowerCase() === 'income') {
        income += amt
      } else {
        expense += amt
      }
    })
    return {
      income,
      expense,
      net: income - expense,
    }
  }, [filteredTransactions])

  // Group transactions by date for the Chart
  const chartData = useMemo(() => {
    const groups: { [key: string]: { income: number; expense: number } } = {}

    filteredTransactions.forEach((tx) => {
      const dateStr = tx.date
      if (!groups[dateStr]) {
        groups[dateStr] = { income: 0, expense: 0 }
      }
      if (tx.type.toLowerCase() === 'income') {
        groups[dateStr].income += tx.amount
      } else {
        groups[dateStr].expense += tx.amount
      }
    })

    return Object.keys(groups).map((date) => ({
      date,
      income: groups[date].income,
      expense: groups[date].expense,
    }))
  }, [filteredTransactions])

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val)
  }

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        {/* Header Skeleton */}
        <div className="flex justify-between items-center">
          <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
          <div className="h-10 w-32 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
        </div>
        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
          ))}
        </div>
        {/* Chart Skeleton */}
        <div className="h-[400px] bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">Overview Dashboard</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Real-time analytics and synchronization with LINE Bot ledger database.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Refresh Button */}
          <button
            onClick={fetchData}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
            title="Refresh Data"
          >
            <RefreshCw className="h-5 w-5" />
          </button>

          {/* Timeframe Selectors */}
          <div className="bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl flex gap-1 border border-slate-200/50 dark:border-slate-800/40">
            {(['7days', '30days', 'year', 'all'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setFilterPeriod(period)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-300 ${
                  filterPeriod === period
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {period === '7days' && '7D'}
                {period === '30days' && '30D'}
                {period === 'year' && 'Year'}
                {period === 'all' && 'All'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Income */}
        <div className="bg-white dark:bg-slate-900/60 backdrop-blur border border-slate-200 dark:border-slate-800/80 p-6 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              Total Income
            </span>
            <p className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
              {formatCurrency(metrics.income)}
            </p>
          </div>
          <div className="p-3 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl">
            <TrendingUp className="h-6 w-6" />
          </div>
        </div>

        {/* Total Expense */}
        <div className="bg-white dark:bg-slate-900/60 backdrop-blur border border-slate-200 dark:border-slate-800/80 p-6 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              Total Expense
            </span>
            <p className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
              {formatCurrency(metrics.expense)}
            </p>
          </div>
          <div className="p-3 bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-2xl">
            <TrendingDown className="h-6 w-6" />
          </div>
        </div>

        {/* Net Balance */}
        <div className="bg-white dark:bg-slate-900/60 backdrop-blur border border-slate-200 dark:border-slate-800/80 p-6 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              Net Balance
            </span>
            <p className={`text-2xl font-black tabular-nums ${metrics.net >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {formatCurrency(metrics.net)}
            </p>
          </div>
          <div className="p-3 bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-2xl">
            <Wallet className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Main Charts & Feeds Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recharts Analytics */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 p-6 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
              Financial Breakdown
            </h3>
            <span className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <CalendarIcon className="h-3.5 w-3.5" />
              Interactive Timeline
            </span>
          </div>
          <OverviewChart data={chartData} />
        </div>

        {/* Recent Feed Side panel */}
        <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                Recent Activity
              </h3>
              <Link
                href="/dashboard/transactions"
                className="text-xs font-semibold text-indigo-500 hover:text-indigo-400 transition-colors"
              >
                View Ledger
              </Link>
            </div>
            <RecentTransactions transactions={transactions} />
          </div>

          {/* Quick OCR Slip Summary footer */}
          <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-6 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-slate-400" />
              Parsed Slips: {slips.length} total
            </span>
            {slips.length > 0 && slips[0].amount && (
              <span className="font-mono text-slate-400">
                Latest: ฿{slips[0].amount}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
