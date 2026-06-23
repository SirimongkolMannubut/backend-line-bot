'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { useTheme } from './theme-provider'
import {
  LayoutDashboard,
  Receipt,
  FileText,
  Calendar,
  User,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  Sparkles,
  FileImage,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/transactions', label: 'Ledger', icon: Receipt },
  { href: '/dashboard/slips', label: 'OCR Slips', icon: FileText },
  { href: '/dashboard/pdf-creator', label: 'PDF Creator', icon: FileImage },
  { href: '/dashboard/calendar', label: 'Calendar', icon: Calendar },
  { href: '/dashboard/profile', label: 'Profile', icon: User },
]

export default function DashboardNav() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { theme, setTheme } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 border-r border-slate-800">
      {/* Brand Logo Header */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800">
        <div className="p-2 bg-indigo-600 rounded-xl text-white">
          <Sparkles className="h-6 w-6 animate-pulse" />
        </div>
        <div>
          <h1 className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            LouisAI
          </h1>
          <p className="text-xs text-indigo-400 font-medium">Web Dashboard</p>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-300 font-medium text-sm ${
                isActive
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User Session Footer & Settings */}
      <div className="p-4 border-t border-slate-800 space-y-4">
        {/* User Card */}
        {session?.user && (
          <div className="flex items-center gap-3 p-2 bg-slate-800/40 rounded-xl border border-slate-800/60">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center font-bold text-base">
              {session.user.name ? session.user.name[0].toUpperCase() : 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm truncate text-slate-100">
                {session.user.name || 'User'}
              </p>
              <p className="text-xs text-slate-500 truncate font-mono">
                {session.user.id}
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Theme Button */}
          <button
            onClick={toggleTheme}
            className="flex-1 flex items-center justify-center py-2.5 rounded-xl border border-slate-800 bg-slate-800/20 hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-all duration-300"
            title="Toggle Theme"
          >
            {theme === 'dark' ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>

          {/* Sign Out Button */}
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="flex-1 flex items-center justify-center py-2.5 rounded-xl border border-red-950 bg-red-950/10 hover:bg-red-900/30 text-red-400 hover:text-red-300 transition-all duration-300"
            title="Sign Out"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 h-screen sticky top-0 shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Top Navbar */}
      <div className="lg:hidden flex items-center justify-between bg-slate-900 text-slate-100 px-6 py-4 sticky top-0 z-40 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-indigo-500" />
          <span className="font-bold text-lg">LouisAI</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 text-slate-400 hover:text-slate-100 bg-slate-800 rounded-xl"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          {/* Sidebar Drawer */}
          <div className="relative w-64 max-w-xs flex-1 flex flex-col bg-slate-900 h-full animate-slide-in">
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  )
}
