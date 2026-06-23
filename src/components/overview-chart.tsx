'use client'

import React from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

interface ChartData {
  date: string
  income: number
  expense: number
}

interface OverviewChartProps {
  data: ChartData[]
}

export default function OverviewChart({ data }: OverviewChartProps) {
  // Sort data chronologically for the chart
  const sortedData = [...data].sort((a, b) => a.date.localeCompare(b.date))

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-950/95 border border-slate-800 text-slate-100 p-4 rounded-xl shadow-xl backdrop-blur-md">
          <p className="text-xs text-slate-400 font-mono mb-2">{label}</p>
          <div className="space-y-1 text-sm font-semibold">
            <p className="text-emerald-400 flex justify-between gap-4">
              <span>Income:</span>
              <span>{formatCurrency(payload[0].value)}</span>
            </p>
            <p className="text-rose-400 flex justify-between gap-4">
              <span>Expense:</span>
              <span>{formatCurrency(payload[1].value)}</span>
            </p>
            <div className="border-t border-slate-800 my-1 pt-1 flex justify-between text-xs text-indigo-300 font-mono">
              <span>Net:</span>
              <span>{formatCurrency(payload[0].value - payload[1].value)}</span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="w-full h-[320px] md:h-[400px]">
      {sortedData.length === 0 ? (
        <div className="flex h-full items-center justify-center rounded-2xl border-2 border-dashed border-slate-800 bg-slate-900/10 text-slate-500 font-medium">
          No transaction data for this period
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={sortedData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
            <XAxis
              dataKey="date"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              dy={10}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `฿${v}`}
              dx={-5}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              height={36}
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: '13px', fontWeight: 500, paddingBottom: '10px' }}
            />
            <Area
              name="Income"
              type="monotone"
              dataKey="income"
              stroke="#10b981"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorIncome)"
            />
            <Area
              name="Expense"
              type="monotone"
              dataKey="expense"
              stroke="#ef4444"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorExpense)"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
