'use client'

import React, { useEffect, useState } from 'react'
import { User, Briefcase, MapPin, Calendar, Check, Save, Sparkles, MessageSquare, Target, PiggyBank, Palette, Smile } from 'lucide-react'

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
  const [customJob, setCustomJob] = useState('')
  const [location, setLocation] = useState('')

  // Customization & Goals Fields
  const [avatar, setAvatar] = useState('💻')
  const [themeColor, setThemeColor] = useState('indigo')
  const [monthlyLimit, setMonthlyLimit] = useState('')
  const [savingsGoal, setSavingsGoal] = useState('')

  const fetchProfile = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/profile')
      if (res.ok) {
        const data: UserProfile = await res.json()
        setProfile(data)
        setName(data.name || '')
        setAge(data.age || '')
        setLocation(data.location || '')
        
        // Handle Job selector dropdown & custom entry
        const retrievedJob = data.job || ''
        const popularJobs = [
          'นักเรียน / นักศึกษา',
          'พนักงานบริษัท',
          'ข้าราชการ / รัฐวิสาหกิจ',
          'เจ้าของกิจการ / ธุรกิจส่วนตัว',
          'ฟรีแลนซ์ / อิสระ',
          'ว่างงาน / ค้นหาตัวเอง'
        ]
        if (retrievedJob === '' || popularJobs.includes(retrievedJob)) {
          setJob(retrievedJob)
          setCustomJob('')
        } else {
          setJob('other')
          setCustomJob(retrievedJob)
        }

        // Parse data_json
        try {
          const parsed = JSON.parse(data.data_json || '{}')
          setAvatar(parsed.avatar || '💻')
          setThemeColor(parsed.themeColor || 'indigo')
          setMonthlyLimit(parsed.monthlyLimit || '')
          setSavingsGoal(parsed.savingsGoal || '')
        } catch (e) {
          setAvatar('💻')
          setThemeColor('indigo')
          setMonthlyLimit('')
          setSavingsGoal('')
        }
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

    const finalJob = job === 'other' ? customJob : job
    const finalDataJson = JSON.stringify({
      avatar,
      themeColor,
      monthlyLimit,
      savingsGoal
    })

    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          age,
          job: finalJob,
          location,
          data_json: finalDataJson,
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

  // Map theme name to CSS class for accent color
  const themeColorsMap: Record<string, { text: string, bg: string, border: string, shadow: string }> = {
    indigo: { text: 'text-indigo-400', bg: 'bg-indigo-600 hover:bg-indigo-700', border: 'border-indigo-500/25', shadow: 'shadow-indigo-500/20' },
    emerald: { text: 'text-emerald-400', bg: 'bg-emerald-600 hover:bg-emerald-700', border: 'border-emerald-500/25', shadow: 'shadow-emerald-500/20' },
    amber: { text: 'text-amber-400', bg: 'bg-amber-600 hover:bg-amber-700', border: 'border-amber-500/25', shadow: 'shadow-amber-500/20' },
    rose: { text: 'text-rose-400', bg: 'bg-rose-600 hover:bg-rose-700', border: 'border-rose-500/25', shadow: 'shadow-rose-500/20' },
    sky: { text: 'text-sky-400', bg: 'bg-sky-600 hover:bg-sky-700', border: 'border-sky-500/25', shadow: 'shadow-sky-500/20' },
  }
  const currentTheme = themeColorsMap[themeColor] || themeColorsMap.indigo

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight">Sync User Profile</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Configure profile metadata and financial goals. Changes are synced instantly to the LINE Bot.
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

          <form onSubmit={handleSubmit} className="space-y-6">
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

              {/* Job Dropdown */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Current Job / Occupation
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-500 pointer-events-none" />
                  <select
                    value={job}
                    onChange={(e) => setJob(e.target.value)}
                    className="w-full pl-11 pr-10 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-sm font-medium appearance-none"
                  >
                    <option value="">เลือกอาชีพ...</option>
                    <option value="นักเรียน / นักศึกษา">นักเรียน / นักศึกษา (Student)</option>
                    <option value="พนักงานบริษัท">พนักงานบริษัท (Corporate Employee)</option>
                    <option value="ข้าราชการ / รัฐวิสาหกิจ">ข้าราชการ / รัฐวิสาหกิจ (Government Official)</option>
                    <option value="เจ้าของกิจการ / ธุรกิจส่วนตัว">เจ้าของกิจการ / ธุรกิจส่วนตัว (Business Owner)</option>
                    <option value="ฟรีแลนซ์ / อิสระ">ฟรีแลนซ์ / อิสระ (Freelancer)</option>
                    <option value="ว่างงาน / ค้นหาตัวเอง">ว่างงาน / ค้นหาตัวเอง (Unemployed)</option>
                    <option value="other">อื่นๆ (ระบุเอง...)</option>
                  </select>
                  <div className="absolute right-3.5 top-4 pointer-events-none border-l border-slate-200 dark:border-slate-800 pl-2">
                    <span className="border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-500 block h-0 w-0"></span>
                  </div>
                </div>
                {job === 'other' && (
                  <input
                    type="text"
                    value={customJob}
                    onChange={(e) => setCustomJob(e.target.value)}
                    placeholder="กรุณาระบุอาชีพของคุณ..."
                    className="w-full mt-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-sm font-medium"
                  />
                )}
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

            {/* Customization & Financial Goals */}
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800/80 space-y-6">
              <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Sparkles className="h-4.5 w-4.5 text-indigo-500 dark:text-indigo-400" />
                Customization & Financial Goals
              </h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Avatar Selector */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                    Profile Avatar Emoji
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['💻', '📚', '💼', '🎨', '🚀', '👤', '💰', '🎮'].map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setAvatar(emoji)}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg border transition-all ${
                          avatar === emoji
                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/15 scale-105'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-400 hover:border-slate-400 dark:hover:border-slate-600'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Theme Selector */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                    Profile Theme Color
                  </label>
                  <div className="flex gap-2">
                    {[
                      { name: 'indigo', color: 'bg-indigo-500' },
                      { name: 'emerald', color: 'bg-emerald-500' },
                      { name: 'amber', color: 'bg-amber-500' },
                      { name: 'rose', color: 'bg-rose-500' },
                      { name: 'sky', color: 'bg-sky-500' },
                    ].map((t) => (
                      <button
                        key={t.name}
                        type="button"
                        onClick={() => setThemeColor(t.name)}
                        className={`w-8 h-8 rounded-full transition-all flex items-center justify-center border-2 ${t.color} ${
                          themeColor === t.name
                            ? 'border-white dark:border-slate-200 scale-110 shadow-lg'
                            : 'border-transparent opacity-70 hover:opacity-100 hover:scale-105'
                        }`}
                        title={t.name}
                      >
                        {themeColor === t.name && <Check className="h-4 w-4 text-white" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Monthly Expense Limit */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <PiggyBank className="h-3.5 w-3.5" />
                    Monthly Expense Limit (THB)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-3 text-sm font-bold text-slate-500">฿</span>
                    <input
                      type="number"
                      value={monthlyLimit}
                      onChange={(e) => setMonthlyLimit(e.target.value)}
                      placeholder="เช่น 15000"
                      className="w-full pl-9 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-sm font-medium"
                    />
                  </div>
                </div>

                {/* Monthly Savings Goal */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Target className="h-3.5 w-3.5" />
                    Monthly Savings Goal (THB)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-3 text-sm font-bold text-slate-500">฿</span>
                    <input
                      type="number"
                      value={savingsGoal}
                      onChange={(e) => setSavingsGoal(e.target.value)}
                      placeholder="เช่น 5000"
                      className="w-full pl-9 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-sm font-medium"
                    />
                  </div>
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
                className={`inline-flex items-center justify-center gap-2 py-3 px-6 text-white font-bold text-sm rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer ${currentTheme.bg} ${currentTheme.shadow} disabled:opacity-60`}
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
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm flex flex-col justify-between h-[380px]">
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
                  <div className="bg-slate-950 border border-slate-800 text-slate-200 py-3 px-4 rounded-2xl rounded-tl-sm max-w-[80%] space-y-2 shadow-md w-full">
                    <p className={`font-semibold ${currentTheme.text}`}>LouisAI Bot:</p>
                    <p className="font-bold text-[11px] border-b border-slate-800 pb-1 text-slate-300">
                      {avatar} โปรไฟล์ของฉัน
                    </p>
                    <ul className="space-y-1 text-[11px] font-mono leading-relaxed">
                      <li>
                        <span className="text-slate-500">ชื่อ:</span> {name || 'ยังไม่ได้ระบุ'}
                      </li>
                      <li>
                        <span className="text-slate-500">อายุ:</span> {age ? `${age} ปี` : 'ยังไม่ได้ระบุ'}
                      </li>
                      <li>
                        <span className="text-slate-500">อาชีพ:</span> {job === 'other' ? (customJob || 'ระบุอาชีพใหม่') : (job || 'ยังไม่ได้ระบุ')}
                      </li>
                      <li>
                        <span className="text-slate-500">สถานที่:</span> {location || 'ยังไม่ได้ระบุ'}
                      </li>
                      {(monthlyLimit || savingsGoal) && (
                        <>
                          <hr className="border-slate-800 my-1.5" />
                          <span className="text-[10px] text-slate-400 font-bold block mb-0.5">📊 เป้าหมายการเงินรายเดือน:</span>
                          {monthlyLimit && (
                            <li>
                              <span className="text-slate-500">💸 จำกัดรายจ่าย:</span> {Number(monthlyLimit).toLocaleString()} บาท
                            </li>
                          )}
                          {savingsGoal && (
                            <li>
                              <span className="text-slate-500">🎯 เป้าหมายออม:</span> {Number(savingsGoal).toLocaleString()} บาท
                            </li>
                          )}
                        </>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Sync badge footer */}
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest pt-4 border-t border-slate-800/80">
              <Sparkles className="h-4 w-4 text-emerald-400 animate-pulse" />
              Live Sync: Connected
            </div>
          </div>

          {/* Goal Summary Widget */}
          {(monthlyLimit || savingsGoal) && (
            <div className="bg-slate-900/50 border border-slate-800/60 p-5 rounded-2xl space-y-4">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">Financial Setup Overview</h4>
              
              <div className="space-y-3.5">
                {monthlyLimit && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-slate-300">
                      <span>Monthly Budget Limit</span>
                      <span className="font-mono text-rose-400">฿{Number(monthlyLimit).toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-rose-500 h-full w-[45%]" />
                    </div>
                  </div>
                )}
                {savingsGoal && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-slate-300">
                      <span>Savings Target Goal</span>
                      <span className="font-mono text-emerald-400">฿{Number(savingsGoal).toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full w-[30%]" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
