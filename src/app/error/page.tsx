'use client'

import React, { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AlertOctagon, ArrowLeft, HelpCircle } from 'lucide-react'

function ErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const getErrorDetails = () => {
    switch (error?.toLowerCase()) {
      case 'accessdenied':
        return {
          title: 'Access Denied',
          message: 'The authorization request was denied or cancelled. Please make sure you grant required permissions on LINE.',
        }
      case 'verification':
        return {
          title: 'Verification Failed',
          message: 'We could not verify your identity. Please try logging in again.',
        }
      case 'configuration':
        return {
          title: 'Server Configuration Error',
          message: 'There is a configuration issue with the LINE Provider client secrets. Please contact the administrator.',
        }
      default:
        return {
          title: 'Authentication Error',
          message: error || 'An unexpected authentication error occurred. Please try again.',
        }
    }
  }

  const details = getErrorDetails()

  return (
    <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 shadow-2xl relative z-10 space-y-6 text-slate-100">
      <div className="text-center space-y-3 flex flex-col items-center">
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl animate-pulse">
          <AlertOctagon className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-white mt-2">
          {details.title}
        </h1>
        <p className="text-sm text-slate-400 max-w-xs leading-relaxed">
          {details.message}
        </p>
      </div>

      {/* Action button */}
      <div className="space-y-3 pt-2">
        <Link
          href="/"
          className="w-full py-3 px-5 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white font-semibold rounded-2xl border border-slate-750/50 transition-all duration-300 flex items-center justify-center gap-2 text-sm shadow-md"
        >
          <ArrowLeft className="h-4.5 w-4.5" />
          Back to Login Portal
        </Link>
      </div>

      {/* Support note */}
      <div className="flex gap-2.5 bg-slate-950 border border-slate-850 p-4 rounded-xl text-xs text-slate-400 mt-2">
        <HelpCircle className="h-4.5 w-4.5 shrink-0 text-slate-500" />
        <p>
          If you are developing locally, you can use the **LINE Developer Bypass** form on the home login screen to bypass LINE Login setup.
        </p>
      </div>
    </div>
  )
}

export default function ErrorPage() {
  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden select-none">
      {/* Background decoration */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-rose-600/10 rounded-full blur-[120px]" />
      
      <Suspense fallback={
        <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 shadow-2xl relative z-10 flex flex-col items-center justify-center py-16 space-y-4">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 font-semibold text-xs uppercase tracking-wider">Loading error details...</p>
        </div>
      }>
        <ErrorContent />
      </Suspense>
    </main>
  )
}
