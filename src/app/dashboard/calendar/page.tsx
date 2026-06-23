'use client'

import React, { useEffect, useState } from 'react'
import {
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  X,
  BellRing,
} from 'lucide-react'

interface Event {
  id: number
  title: string
  event_date: string
  event_time: string | null
  notified: number
}

export default function CalendarPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  // Add Event Form State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formTitle, setFormTitle] = useState('')
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0])
  const [formTime, setFormTime] = useState('09:00')

  const fetchEvents = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/events')
      if (res.ok) {
        const data = await res.json()
        setEvents(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitle.trim() || !formDate) return

    const payload = {
      title: formTitle,
      event_date: formDate,
      event_time: formTime || null,
    }

    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        fetchEvents()
        setIsModalOpen(false)
        setFormTitle('')
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this scheduled event?')) return

    try {
      const res = await fetch(`/api/events?id=${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        fetchEvents()
      }
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">Notification Schedules</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Manage events and notification reminders sent out by the LINE Bot.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 py-3 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-2xl shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
        >
          <Plus className="h-5 w-5" />
          Schedule Event
        </button>
      </div>

      {/* Events Feed */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto text-sm font-bold"></div>
          <p className="font-semibold text-sm">Loading notification schedules...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="p-16 text-center text-slate-500 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
          No scheduled events found. Add an event to trigger a LINE notification.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {events.map((event) => {
            const hasBeenNotified = event.notified === 1
            return (
              <div
                key={event.id}
                className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between"
              >
                <div className="space-y-3 min-w-0 pr-4">
                  {/* Event Status tag */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        hasBeenNotified
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-450'
                          : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                      }`}
                    >
                      {hasBeenNotified ? (
                        <>
                          <CheckCircle2 className="h-3 w-3" />
                          Notified
                        </>
                      ) : (
                        <>
                          <BellRing className="h-3 w-3 animate-pulse" />
                          Pending Alert
                        </>
                      )}
                    </span>
                  </div>

                  {/* Title & Metadata */}
                  <div className="space-y-1">
                    <h3 className="font-bold text-base truncate text-slate-900 dark:text-slate-100">
                      {event.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1 font-mono">
                        <CalendarIcon className="h-3.5 w-3.5" />
                        {event.event_date}
                      </span>
                      {event.event_time && (
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="h-3.5 w-3.5" />
                          {event.event_time}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Delete button */}
                <button
                  onClick={() => handleDelete(event.id)}
                  className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all shrink-0"
                  title="Remove Schedule"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Add Event Schedule Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />

          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl relative z-10 p-6 space-y-6 text-slate-100 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="font-extrabold text-lg">Schedule Notification Alert</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-100 bg-slate-800 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Event Title */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Notification Title / Reminder Message
                </label>
                <input
                  type="text"
                  placeholder="e.g. Pay Internet Bills, Meeting with Client..."
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl focus:outline-none text-slate-100 text-sm font-medium"
                  required
                />
              </div>

              {/* Event Date */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Notification Date
                </label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl focus:outline-none text-slate-100 text-sm font-mono"
                  required
                />
              </div>

              {/* Event Time */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Alert Time (Optional)
                </label>
                <input
                  type="time"
                  value={formTime}
                  onChange={(e) => setFormTime(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl focus:outline-none text-slate-100 text-sm font-mono"
                />
              </div>

              {/* Info Alert */}
              <div className="flex gap-2.5 bg-slate-950 border border-slate-850 p-4.5 rounded-xl text-xs text-slate-400">
                <AlertCircle className="h-4 w-4 shrink-0 text-indigo-400" />
                <p>
                  Reminders will be pushed to the user's LINE chat panel on the scheduled date and time automatically via the bot background service.
                </p>
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
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition-all"
                >
                  Save Reminder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
