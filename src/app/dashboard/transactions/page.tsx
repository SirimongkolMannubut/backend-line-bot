'use client'

import React, { useEffect, useState, useMemo } from 'react'
import {
  Plus,
  Search,
  Filter,
  Trash2,
  Edit2,
  Calendar,
  Tag,
  FileText,
  TrendingUp,
  TrendingDown,
  X,
  Check,
} from 'lucide-react'

interface Transaction {
  id: number
  type: string
  amount: number
  category: string | null
  note: string | null
  date: string
}

const CATEGORIES = [
  'Food',
  'Travel',
  'Shopping',
  'Utilities',
  'Salary',
  'Investment',
  'Rent',
  'Healthcare',
  'Entertainment',
  'Other',
]

export default function LedgerPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all')
  const [filterCategory, setFilterCategory] = useState('all')

  // Form Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentId, setCurrentId] = useState<number | null>(null)
  const [formType, setFormType] = useState<'income' | 'expense'>('expense')
  const [formAmount, setFormAmount] = useState('')
  const [formCategory, setFormCategory] = useState('Food')
  const [formNote, setFormNote] = useState('')
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0])

  const fetchTransactions = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/transactions?limit=200')
      if (res.ok) {
        const data = await res.json()
        setTransactions(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTransactions()
  }, [])

  const handleOpenAddModal = () => {
    setCurrentId(null)
    setFormType('expense')
    setFormAmount('')
    setFormCategory('Food')
    setFormNote('')
    setFormDate(new Date().toISOString().split('T')[0])
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (tx: Transaction) => {
    setCurrentId(tx.id)
    setFormType(tx.type.toLowerCase() as 'income' | 'expense')
    setFormAmount(tx.amount.toString())
    setFormCategory(tx.category || 'Other')
    setFormNote(tx.note || '')
    setFormDate(tx.date)
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formAmount || isNaN(parseFloat(formAmount))) return

    const payload = {
      id: currentId,
      type: formType,
      amount: parseFloat(formAmount),
      category: formCategory,
      note: formNote,
      date: formDate,
    }

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        fetchTransactions()
        setIsModalOpen(false)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return

    try {
      const res = await fetch(`/api/transactions?id=${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        fetchTransactions()
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Filtered & Searched Data
  const filteredData = useMemo(() => {
    return transactions.filter((tx) => {
      const matchesSearch =
        search === '' ||
        (tx.note || '').toLowerCase().includes(search.toLowerCase()) ||
        (tx.category || '').toLowerCase().includes(search.toLowerCase())

      const matchesType = filterType === 'all' || tx.type.toLowerCase() === filterType
      const matchesCategory = filterCategory === 'all' || tx.category === filterCategory

      return matchesSearch && matchesType && matchesCategory
    })
  }, [transactions, search, filterType, filterCategory])

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
    }).format(amt)
  }

  return (
    <div className="space-y-6">
      {/* Page Title & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">Transaction Ledger</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Browse, search, edit, and record manual financial entries.
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center justify-center gap-2 py-3 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-2xl shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
        >
          <Plus className="h-5 w-5" />
          Add Entry
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900/60 backdrop-blur border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search note or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-sm"
          />
        </div>

        {/* Type Filter */}
        <div className="flex gap-1.5 p-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shrink-0">
          {(['all', 'income', 'expense'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all ${
                filterType === type
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Category Filter */}
        <div className="shrink-0">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full md:w-48 px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-sm font-medium"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="font-semibold text-sm">Loading ledger entries...</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="p-16 text-center text-slate-500 border-2 border-dashed border-slate-200 dark:border-slate-800/80 rounded-2xl m-4">
            No transactions found matching your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Note / Details</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
                {filteredData.map((tx) => {
                  const isIncome = tx.type.toLowerCase() === 'income'
                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all"
                    >
                      {/* Type */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                            isIncome
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {isIncome ? (
                            <TrendingUp className="h-3.5 w-3.5" />
                          ) : (
                            <TrendingDown className="h-3.5 w-3.5" />
                          )}
                          {tx.type}
                        </span>
                      </td>

                      {/* Category */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-350">
                          <Tag className="h-3.5 w-3.5 text-slate-400" />
                          {tx.category || 'Uncategorized'}
                        </span>
                      </td>

                      {/* Note */}
                      <td className="px-6 py-4 max-w-xs truncate font-medium text-slate-900 dark:text-slate-200">
                        {tx.note || '-'}
                      </td>

                      {/* Date */}
                      <td className="px-6 py-4 whitespace-nowrap text-slate-500 dark:text-slate-450 font-mono text-xs">
                        {tx.date}
                      </td>

                      {/* Amount */}
                      <td className={`px-6 py-4 whitespace-nowrap text-right font-bold tabular-nums ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {isIncome ? '+' : '-'}
                        {formatCurrency(tx.amount)}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenEditModal(tx)}
                            className="p-1.5 text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                            title="Edit Entry"
                          >
                            <Edit2 className="h-4.5 w-4.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(tx.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                            title="Delete Entry"
                          >
                            <Trash2 className="h-4.5 w-4.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Transaction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />

          {/* Modal Container */}
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl relative z-10 p-6 space-y-6 text-slate-100 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="font-extrabold text-lg">
                {currentId ? 'Edit Ledger Entry' : 'Create Ledger Entry'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-100 bg-slate-800 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Type Switcher */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Transaction Type
                </label>
                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 border border-slate-800 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setFormType('income')}
                    className={`py-2 px-3 rounded-lg text-sm font-bold transition-all ${
                      formType === 'income'
                        ? 'bg-emerald-500 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Income
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormType('expense')}
                    className={`py-2 px-3 rounded-lg text-sm font-bold transition-all ${
                      formType === 'expense'
                        ? 'bg-rose-500 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Expense
                  </button>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Amount (THB)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl focus:outline-none text-slate-100 text-sm font-medium"
                  required
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Category
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl focus:outline-none text-slate-100 text-sm font-medium"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Transaction Date
                </label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl focus:outline-none text-slate-100 text-sm font-mono"
                  required
                />
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Note / Note Details
                </label>
                <textarea
                  placeholder="Provide note description (e.g. Starbucks, Lunch)..."
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl focus:outline-none text-slate-100 text-sm font-medium resize-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-350 hover:text-slate-100 text-sm font-semibold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-1.5"
                >
                  <Check className="h-4.5 w-4.5" />
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
