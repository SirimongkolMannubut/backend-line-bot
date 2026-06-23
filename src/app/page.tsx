'use client'

import React, { useState, useEffect } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Sparkles, MessageCircle, ArrowRight, ShieldCheck, Database, Layout } from 'lucide-react'

export default function LoginPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [mockUserId, setMockUserId] = useState('U1234567890abcdef1234567890abcdef')
  const [mockName, setMockName] = useState('Louis Tester')
  const [showMockForm, setShowMockForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [liffLoading, setLiffLoading] = useState(false)

  // Redirect to dashboard if logged in
  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/dashboard')
    }
  }, [status, router])

  // Initialize LINE LIFF for auto-login inside LINE Client
  useEffect(() => {
    const initLiff = async () => {
      const liffId = process.env.NEXT_PUBLIC_LIFF_ID
      if (!liffId || liffId.includes('mock') || liffId.includes('your-liff-id')) {
        return // Skip if LIFF ID is not configured with a real one
      }

      setLiffLoading(true)
      try {
        const liffModule = await import('@line/liff')
        const liff = liffModule.default

        await liff.init({ liffId })
        
        if (liff.isLoggedIn()) {
          const profile = await liff.getProfile()
          if (profile?.userId) {
            // Auto sign in using NextAuth Credentials provider (mock-line)
            await signIn('mock-line', {
              userId: profile.userId,
              name: profile.displayName || 'LINE User',
              callbackUrl: '/dashboard',
              redirect: true,
            })
          }
        } else {
          // If running inside LINE Client app, trigger login immediately
          if (liff.isInClient()) {
            liff.login()
          }
        }
      } catch (err) {
        console.error('LIFF initialization failed:', err)
      } finally {
        setLiffLoading(false)
      }
    }

    initLiff()
  }, [])

  const handleLineLogin = async () => {
    setLoading(true)
    try {
      await signIn('line', { callbackUrl: '/dashboard' })
    } catch (e) {
      console.error(e)
      setLoading(false)
    }
  }

  const handleMockLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mockUserId.trim()) return

    setLoading(true)
    try {
      await signIn('mock-line', {
        userId: mockUserId,
        name: mockName,
        callbackUrl: '/dashboard',
        redirect: true,
      })
    } catch (e) {
      console.error(e)
      setLoading(false)
    }
  }

  if (status === 'loading' || status === 'authenticated' || liffLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-100">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-400 font-medium text-sm">
            {liffLoading ? 'Initializing LINE session...' : 'Redirecting to dashboard...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden select-none">
      {/* Dynamic Background Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-emerald-600/10 rounded-full blur-[130px]" />

      <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 shadow-2xl relative z-10 space-y-8">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-2xl mb-2 animate-bounce">
            <Sparkles className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            LouisAI Dashboard
          </h1>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">
            Synchronized dashboard for your LINE Bot financial manager, OCR slips, and user profile database.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          {/* Real LINE Login */}
          <button
            onClick={handleLineLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-5 bg-[#06C755] hover:bg-[#05b34c] disabled:opacity-60 text-white font-semibold rounded-2xl shadow-lg shadow-emerald-900/20 transition-all duration-300 transform active:scale-[0.98]"
          >
            <MessageCircle className="h-5 w-5 shrink-0 fill-white" />
            Sign in with LINE
          </button>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-800 w-full" />
            <span className="absolute bg-slate-900 px-4 text-xs font-mono text-slate-500 uppercase tracking-widest">
              OR
            </span>
          </div>

          {/* Toggle Developer Bypass */}
          {!showMockForm ? (
            <button
              onClick={() => setShowMockForm(true)}
              className="w-full py-3.5 px-5 bg-slate-800/60 hover:bg-slate-800 text-slate-300 font-semibold rounded-2xl border border-slate-700/50 hover:text-white transition-all duration-300 flex items-center justify-center gap-2"
            >
              Developer Login Bypass
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <form onSubmit={handleMockLogin} className="space-y-4 bg-slate-950/40 p-5 rounded-2xl border border-slate-800/80 animate-fade-in">
              <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">
                LINE Mock Credentials
              </h3>
              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Mock User ID
                  </label>
                  <input
                    type="text"
                    value={mockUserId}
                    onChange={(e) => setMockUserId(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={mockName}
                    onChange={(e) => setMockName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMockForm(false)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-slate-200 text-sm font-semibold rounded-xl transition-all duration-250"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-md transition-all duration-250"
                >
                  Bypass & Login
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Feature Highlights Footer */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-800/80 text-center">
          <div className="space-y-1.5 flex flex-col items-center">
            <Database className="h-5 w-5 text-indigo-400" />
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Sync DB
            </span>
          </div>
          <div className="space-y-1.5 flex flex-col items-center">
            <ShieldCheck className="h-5 w-5 text-indigo-400" />
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              LINE ID Link
            </span>
          </div>
          <div className="space-y-1.5 flex flex-col items-center">
            <Layout className="h-5 w-5 text-indigo-400" />
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Full Ledger
            </span>
          </div>
        </div>
      </div>
    </main>
  )
}
