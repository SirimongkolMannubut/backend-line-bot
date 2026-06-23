'use client'

import React, { useEffect, useState } from 'react'
import { User, Briefcase, MapPin, Calendar, Check, Save, Sparkles, MessageSquare } from 'lucide-react'

interface UserProfile {
  user_id: string
  name: string | null
  age: string | null
  job: string | null
  location: string | null
  data_json: string
  updated_at: string | null
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)

  // Form Fields
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [job, setJob] = useState('')
  const [location, setLocation] = useState('')

  const fetchProfile = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/profile')
      if (res.ok) {
        const data: UserProfile = await res.json()
        setProfile(data)
        setName(data.name || '')
        setAge(data.age || '')
        setJob(data.job || '')
        setLocation(data.location || '')
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSavedSuccess(false)

    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          age,
          job,
          location,
        }),
      })

      if (res.ok) {
        const updatedData = await res.json()
        setProfile(updatedData)
        setSavedSuccess(true)
        setTimeout(() => setSavedSuccess(false), 3000)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-[450px] bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
          <div className="h-[300px] bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight">Sync User Profile</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Configure profile metadata. Changes are synced instantly to the LINE Bot database.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Editor Form */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 p-6 rounded-2xl shadow-sm space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800/80">
            <div className="p-2 bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 rounded-xl">
              <User className="h-5 w-5" />
            </div>
            <h3 className="font-extrabold text-base">Metadata Fields</h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Display Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-500" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name..."
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-sm font-medium"
                  />
                </div>
              </div>

              {/* Age */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Age
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-500" />
                  <input
                    type="text"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="Enter your age..."
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-sm font-medium"
                  />
                </div>
              </div>

              {/* Job */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Current Job / Occupation
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-500" />
                  <input
                    type="text"
                    value={job}
                    onChange={(e) => setJob(e.target.value)}
                    placeholder="Enter occupation..."
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-sm font-medium"
                  />
                </div>
              </div>

              {/* Location */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Current Location / Address
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-500" />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Enter location..."
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-sm font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Sync Timestamp Info */}
            {profile?.updated_at && (
              <p className="text-xs text-slate-400 font-medium">
                Last synchronized: <span className="font-mono">{new Date(profile.updated_at).toLocaleString()}</span>
              </p>
            )}

            {/* Save Buttons */}
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 py-3 px-6 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-500/20 transition-all active:scale-95 cursor-pointer"
              >
                {savedSuccess ? (
                  <>
                    <Check className="h-4.5 w-4.5" />
                    Profile Synced!
                  </>
                ) : (
                  <>
                    <Save className="h-4.5 w-4.5" />
                    {saving ? 'Syncing...' : 'Save & Sync to Bot'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* LINE Chat Bot Preview Panel */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-800">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
                <MessageSquare className="h-5 w-5" />
              </div>
              <h3 className="font-extrabold text-base text-slate-100">LINE Bot Preview</h3>
            </div>

            {/* Mock Chat Panel */}
            <div className="space-y-3.5 text-xs">
              {/* User Bubble */}
              <div className="flex justify-end">
                <div className="bg-emerald-600 text-white py-2.5 px-3.5 rounded-2xl rounded-tr-sm max-w-[80%] shadow-md">
                  ข้อมูลโปรไฟล์
                </div>
              </div>

              {/* Bot Response Bubble */}
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 shrink-0 bg-indigo-600 rounded-xl text-white flex items-center justify-center font-bold text-xs shadow-md">
                  AI
                </div>
                <div className="bg-slate-950 border border-slate-800 text-slate-200 py-3 px-4 rounded-2xl rounded-tl-sm max-w-[80%] space-y-2 shadow-md">
                  <p className="font-semibold text-indigo-400">LouisAI Bot:</p>
                  <p>นี่คือรายละเอียดข้อมูลของคุณครับ:</p>
                  <ul className="space-y-1 bg-slate-900/40 p-2.5 rounded-xl border border-slate-800 text-[11px] font-mono leading-relaxed">
                    <li>
                      <span className="text-slate-500">ชื่อ:</span> {name || 'ยังไม่ได้ระบุ'}
                    </li>
                    <li>
                      <span className="text-slate-500">อายุ:</span> {age || 'ยังไม่ได้ระบุ'}
                    </li>
                    <li>
                      <span className="text-slate-500">อาชีพ:</span> {job || 'ยังไม่ได้ระบุ'}
                    </li>
                    <li>
                      <span className="text-slate-500">สถานที่:</span> {location || 'ยังไม่ได้ระบุ'}
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Sync badge footer */}
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest pt-4 border-t border-slate-800/80 mt-6">
            <Sparkles className="h-4 w-4 text-emerald-400 animate-pulse" />
            Live Sync: Connected
          </div>
        </div>
      </div>
    </div>
  )
}
