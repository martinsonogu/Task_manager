import React, { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  LayoutDashboard, Users, FolderOpen, CheckSquare, BarChart2,
  Bell, LogOut, ChevronLeft, Menu, X
} from 'lucide-react'
import { clsx } from 'clsx'
import { useAuthStore } from '../features/auth/authStore'
import { notificationsApi } from '../api/client'

const NAV = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/',         end: true,  admin: false },
  { label: 'Users',     icon: Users,           to: '/users',    end: false, admin: true  },
  { label: 'Projects',  icon: FolderOpen,      to: '/projects', end: false, admin: false },
  { label: 'Tasks',     icon: CheckSquare,     to: '/tasks',    end: false, admin: false },
  { label: 'Reports',   icon: BarChart2,       to: '/reports',  end: false, admin: true  },
]

export function AppLayout() {
  const { user, logout } = useAuthStore()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const { data: notifCount } = useQuery({
    queryKey: ['notif-count'],
    queryFn: notificationsApi.unreadCount,
    refetchInterval: 30_000,
  })

  const visibleNav = NAV.filter(n => !n.admin || user?.role === 'admin')

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
        <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">O</span>
        </div>
        {!collapsed && <span className="text-white font-semibold text-lg">OpsHub</span>}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5">
        {visibleNav.map(({ label, icon: Icon, to, end }) => (
          <NavLink
            key={to} to={to} end={end}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) => clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
              collapsed ? 'justify-center' : '',
              isActive
                ? 'bg-white/15 text-white font-medium'
                : 'text-white/60 hover:bg-white/10 hover:text-white'
            )}
          >
            <Icon size={18} className="flex-shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User + collapse */}
      <div className="border-t border-white/10 p-3">
        {!collapsed && (
          <div className="flex items-center gap-2 px-2 py-2 mb-1">
            <div className="w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-semibold">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">{user?.name}</p>
              <p className="text-white/50 text-xs truncate">{user?.role}</p>
            </div>
          </div>
        )}
        <button
          onClick={logout}
          className={clsx(
            'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-white/60 hover:bg-white/10 hover:text-white text-sm transition-colors',
            collapsed ? 'justify-center' : ''
          )}
        >
          <LogOut size={16} />
          {!collapsed && 'Logout'}
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Desktop sidebar */}
      <aside className={clsx(
        'hidden md:flex flex-col flex-shrink-0 bg-gray-900 transition-all duration-200',
        collapsed ? 'w-16' : 'w-56'
      )}>
        <SidebarContent />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute left-0 top-1/2 -translate-y-1/2 translate-x-full bg-gray-900 text-white/40 hover:text-white p-1 rounded-r-lg hidden md:flex"
        >
          <ChevronLeft size={14} className={clsx('transition-transform', collapsed ? 'rotate-180' : '')} />
        </button>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-56 h-full bg-gray-900 flex flex-col">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <button onClick={() => setMobileOpen(true)} className="md:hidden text-gray-500">
            <Menu size={20} />
          </button>
          <div className="flex-1" />
          <button className="relative text-gray-500 hover:text-gray-700">
            <Bell size={20} />
            {(notifCount?.count ?? 0) > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {notifCount.count > 9 ? '9+' : notifCount.count}
              </span>
            )}
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
