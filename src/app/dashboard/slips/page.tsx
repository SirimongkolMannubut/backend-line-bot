'use client'

import React, { useEffect, useState } from 'react'
import { FileText, Search, ExternalLink, Calendar, Banknote, ShieldAlert, X, Eye } from 'lucide-react'

interface Slip {
  id: number
  user_id: string
  amount: number | null
  bank: string | null
  ref: string | null
  datetime: string | null
  raw_text: string | null
  created: string
  batch_id: string | null
}

export default function SlipsPage() {
  const [slips, setSlips] = useState<Slip[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedSlip, setSelectedSlip] = useState<Slip | null>(null)

  const fetchSlips = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/slips?limit=100')
      if (res.ok) {
        const data = await res.json()
        setSlips(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSlips()
  }, [])

  const filteredSlips = slips.filter((slip) => {
    const searchLower = search.toLowerCase()
    return (
      (slip.bank || '').toLowerCase().includes(searchLower) ||
      (slip.ref || '').toLowerCase().includes(searchLower) ||
      (slip.amount?.toString() || '').includes(searchLower)
    )
  })

  // Format the JSON raw text nicely
  const renderRawText = (rawText: string | null) => {
    if (!rawText) return <p className="text-slate-500 italic">No OCR raw text extracted</p>
    try {
      // Try parsing if it's stored as a JSON string
      const parsed = JSON.parse(rawText)
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {Object.entries(parsed).map(([key, val]) => (
            <div key={key} className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                {key.replace(/_/g, ' ')}
              </span>
              <span className="font-semibold text-slate-200">
                {typeof val === 'object' ? JSON.stringify(val) : String(val)}
              </span>
            </div>
          ))}
        </div>
      )
    } catch (e) {
      // Fallback if it is not valid JSON
      return (
        <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono text-slate-350 overflow-x-auto whitespace-pre-wrap">
          {rawText}
        </pre>
      )
    }
  }

  const formatCurrency = (amt: number | null) => {
    if (amt === null) return '฿0.00'
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
    }).format(amt)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight">Slip Database (OCR)</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          View scanned bank transfer slips and metadata processed by the LINE bot.
        </p>
      </div>

      {/* Search Filter */}
      <div className="bg-white dark:bg-slate-900/60 backdrop-blur border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex items-center relative">
        <Search className="absolute left-7 top-7 h-4.5 w-4.5 text-slate-400" />
        <input
          type="text"
          placeholder="Search by bank name, ref code, or amount..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-sm"
        />
      </div>

      {/* Slips Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto font-bold text-sm"></div>
          <p className="font-semibold text-sm">Loading slip details...</p>
        </div>
      ) : filteredSlips.length === 0 ? (
        <div className="p-16 text-center text-slate-500 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
          No slips found in database.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSlips.map((slip) => (
            <div
              key={slip.id}
              className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between"
            >
              {/* Slip Card Header */}
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider">
                    <Banknote className="h-3.5 w-3.5" />
                    {slip.bank || 'Unknown Bank'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">ID #{slip.id}</span>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                    Amount
                  </span>
                  <p className="text-2xl font-black text-slate-950 dark:text-slate-100 tabular-nums">
                    {formatCurrency(slip.amount)}
                  </p>
                </div>

                <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-150 dark:border-slate-800/80 pt-3">
                  <p className="flex justify-between">
                    <span>Reference:</span>
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                      {slip.ref || 'N/A'}
                    </span>
                  </p>
                  <p className="flex justify-between">
                    <span>Slip Date:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-350">
                      {slip.datetime || 'N/A'}
                    </span>
                  </p>
                  <p className="flex justify-between">
                    <span>Uploaded:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-350">
                      {slip.created.split(' ')[0]}
                    </span>
                  </p>
                </div>
              </div>

              {/* View Detail Action */}
              <button
                onClick={() => setSelectedSlip(slip)}
                className="mt-5 w-full flex items-center justify-center gap-2 py-2 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-all"
              >
                <Eye className="h-4 w-4" />
                Inspect OCR Data
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Slip Inspect Modal */}
      {selectedSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedSlip(null)} />

          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl relative z-10 p-6 space-y-6 text-slate-100 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="font-extrabold text-lg flex items-center gap-2">
                  <FileText className="h-5.5 w-5.5 text-indigo-500" />
                  OCR JSON Data Inspection
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">
                  Slip ID: #{selectedSlip.id} | Batch: {selectedSlip.batch_id || 'None'}
                </p>
              </div>
              <button
                onClick={() => setSelectedSlip(null)}
                className="p-1.5 text-slate-400 hover:text-slate-100 bg-slate-800 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Quick stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-semibold bg-slate-950 p-4 border border-slate-800 rounded-xl">
              <div>
                <span className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                  Bank
                </span>
                <span className="text-sm font-bold text-indigo-400">
                  {selectedSlip.bank || 'Unknown'}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                  Amount
                </span>
                <span className="text-sm font-black text-slate-100">
                  {formatCurrency(selectedSlip.amount)}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                  Ref Code
                </span>
                <span className="text-sm font-bold text-slate-100 truncate block">
                  {selectedSlip.ref || 'N/A'}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                  Transaction Date
                </span>
                <span className="text-sm font-bold text-slate-100">
                  {selectedSlip.datetime || 'N/A'}
                </span>
              </div>
            </div>

            {/* OCR JSON Content */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                Extracted OCR JSON Fields
              </label>
              <div className="max-h-64 overflow-y-auto pr-1">
                {renderRawText(selectedSlip.raw_text)}
              </div>
            </div>

            {/* Warning Alert */}
            <div className="flex gap-3 bg-indigo-950/20 border border-indigo-900/60 p-4 rounded-xl text-xs text-indigo-300">
              <ShieldAlert className="h-5 w-5 shrink-0" />
              <p>
                OCR extraction values are parsed automatically using vision LLM templates in the LINE Bot. Ensure values match database logs.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
