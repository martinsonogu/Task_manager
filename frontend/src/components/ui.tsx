import React from 'react'
import { clsx } from 'clsx'

// ─── Avatar ──────────────────────────────────────────────
export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-11 h-11 text-base' }
  return (
    <div className={clsx('rounded-full bg-brand-500 text-white flex items-center justify-center font-semibold flex-shrink-0', sizes[size])}>
      {name?.[0]?.toUpperCase() ?? '?'}
    </div>
  )
}

// ─── Badge ───────────────────────────────────────────────
const STATUS_STYLES: Record<string, string> = {
  new:         'bg-gray-100 text-gray-700',
  in_progress: 'bg-amber-100 text-amber-700',
  blocked:     'bg-red-100 text-red-700',
  review:      'bg-blue-100 text-blue-700',
  completed:   'bg-green-100 text-green-700',
  planning:    'bg-gray-100 text-gray-600',
  active:      'bg-brand-100 text-brand-700',
  on_hold:     'bg-amber-100 text-amber-700',
  cancelled:   'bg-red-100 text-red-700',
  admin:       'bg-purple-100 text-purple-700',
  staff:       'bg-gray-100 text-gray-600',
}

const PRIORITY_STYLES: Record<string, string> = {
  low:      'bg-gray-100 text-gray-600',
  medium:   'bg-blue-100 text-blue-700',
  high:     'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
}

export function StatusBadge({ value }: { value: string }) {
  return (
    <span className={clsx('badge', STATUS_STYLES[value] ?? 'bg-gray-100 text-gray-600')}>
      {value.replace('_', ' ')}
    </span>
  )
}

export function PriorityBadge({ value }: { value: string }) {
  return (
    <span className={clsx('badge', PRIORITY_STYLES[value] ?? 'bg-gray-100 text-gray-600')}>
      {value}
    </span>
  )
}

// ─── Spinner ─────────────────────────────────────────────
export function Spinner({ className }: { className?: string }) {
  return (
    <div className={clsx('animate-spin rounded-full border-2 border-gray-200 border-t-brand-500', className ?? 'w-6 h-6')} />
  )
}

// ─── Modal ───────────────────────────────────────────────
export function Modal({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-4">{children}</div>
      </div>
    </div>
  )
}

// ─── Empty State ─────────────────────────────────────────
export function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <div className="text-5xl mb-3">{icon}</div>
      <p className="text-sm">{message}</p>
    </div>
  )
}

// ─── Page Header ─────────────────────────────────────────
export function PageHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      {action}
    </div>
  )
}
