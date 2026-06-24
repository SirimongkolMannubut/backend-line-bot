'use client'

import React, { useState, useMemo } from 'react'
import {
  ComposedChart,
  Bar,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
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
  const [chartType, setChartType] = useState<'compare' | 'trend'>('compare')

  // Sort data chronologically for the chart
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => a.date.localeCompare(b.date))
  }, [data])

  // Compute cumulative net trend data
  const cumulativeData = useMemo(() => {
    let runningNet = 0
    return sortedData.map((d) => {
      const net = d.income - d.expense
      runningNet += net
      return {
        ...d,
        balance: runningNet,
      }
    })
  }, [sortedData])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatDateLabel = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return dateStr
      return new Intl.DateTimeFormat('th-TH', {
        day: 'numeric',
        month: 'short',
      }).format(date)
    } catch {
      return dateStr
    }
  }

  const formatDateFull = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return dateStr
      return new Intl.DateTimeFormat('th-TH', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(date)
    } catch {
      return dateStr
    }
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dateFormatted = formatDateFull(label)
      if (chartType === 'compare') {
        // Safe data extraction matching Recharts payload paths
        const income = payload.find((p: any) => p.dataKey === 'income' || p.name === 'รายรับ')?.value || 0
        const expense = payload.find((p: any) => p.dataKey === 'expense' || p.name === 'รายจ่าย')?.value || 0
        const net = income - expense
        
        return (
          <div className="bg-slate-950/95 border border-slate-800/80 text-slate-100 p-4 rounded-2xl shadow-xl backdrop-blur-md min-w-[200px] space-y-2">
            <p className="text-xs text-slate-400 font-bold border-b border-slate-800 pb-1.5">{dateFormatted}</p>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between gap-4 font-semibold text-emerald-400">
                <span>รายรับ:</span>
                <span>+{formatCurrency(income)}</span>
              </div>
              <div className="flex justify-between gap-4 font-semibold text-rose-400">
                <span>รายจ่าย:</span>
                <span>-{formatCurrency(expense)}</span>
              </div>
              <div className="border-t border-slate-800/80 my-1 pt-1.5 flex justify-between font-bold text-indigo-400">
                <span>ยอดสุทธิ (Net):</span>
                <span>{formatCurrency(net)}</span>
              </div>
            </div>
          </div>
        )
      } else {
        const balance = payload[0]?.value || 0
        return (
          <div className="bg-slate-950/95 border border-slate-800/80 text-slate-100 p-4 rounded-2xl shadow-xl backdrop-blur-md min-w-[200px] space-y-2">
            <p className="text-xs text-slate-400 font-bold border-b border-slate-800 pb-1.5">{dateFormatted}</p>
            <div className="space-y-1 text-xs font-semibold">
              <div className="flex justify-between gap-4 text-indigo-400">
                <span>ยอดเงินคงเหลือสะสม:</span>
                <span className="font-black text-sm">{formatCurrency(balance)}</span>
              </div>
            </div>
          </div>
        )
      }
    }
    return null
  }

  return (
    <div className="w-full flex flex-col space-y-4">
      {/* Toggle Chart Type Header */}
      {sortedData.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-4">
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl">
            <button
              onClick={() => setChartType('compare')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                chartType === 'compare'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-200/20'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              📊 เปรียบเทียบ รายรับ-รายจ่าย
            </button>
            <button
              onClick={() => setChartType('trend')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                chartType === 'trend'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/20'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              📈 ยอดเงินสะสม
            </button>
          </div>
          
          {/* Legend and Guide */}
          <div className="text-[11px] font-mono text-slate-400 flex gap-3">
            {chartType === 'compare' ? (
              <>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/20 border border-emerald-500 inline-block" />
                  รายรับ
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/20 border border-rose-500 inline-block" />
                  รายจ่าย
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block animate-pulse" />
                  ยอดสุทธิรายวัน
                </span>
              </>
            ) : (
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block animate-pulse" />
                แนวโน้มยอดสะสม
              </span>
            )}
          </div>
        </div>
      )}

      {/* Chart container */}
      <div className="w-full h-[320px] md:h-[360px]">
        {sortedData.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/10 text-slate-500 font-medium">
            ไม่มีข้อมูลธุรกรรมสำหรับช่วงเวลานี้
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'compare' ? (
              <ComposedChart
                data={sortedData}
                margin={{ top: 10, right: 5, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.12} />
                <XAxis
                  dataKey="date"
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                  tickFormatter={formatDateLabel}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `฿${v}`}
                  dx={-5}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  name="รายรับ"
                  dataKey="income"
                  fill="url(#colorIncome)"
                  stroke="#10b981"
                  strokeWidth={1.5}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
                <Bar
                  name="รายจ่าย"
                  dataKey="expense"
                  fill="url(#colorExpense)"
                  stroke="#ef4444"
                  strokeWidth={1.5}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
                <Line
                  name="ยอดสุทธิ"
                  type="monotone"
                  dataKey={(d) => d.income - d.expense}
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#6366f1', strokeWidth: 1 }}
                  activeDot={{ r: 5 }}
                />
              </ComposedChart>
            ) : (
              <AreaChart
                data={cumulativeData}
                margin={{ top: 10, right: 5, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.12} />
                <XAxis
                  dataKey="date"
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                  tickFormatter={formatDateLabel}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `฿${v}`}
                  dx={-5}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  name="ยอดเงินคงเหลือสะสม"
                  type="monotone"
                  dataKey="balance"
                  stroke="#6366f1"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorBalance)"
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
