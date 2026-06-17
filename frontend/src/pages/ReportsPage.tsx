import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { reportsApi } from '../api/client'
import { Spinner, PageHeader } from '../components/ui'
import { clsx } from 'clsx'

const TABS = ['Staff Performance', 'Project Summary', 'Time Tracking']

const STATUS_COLORS: Record<string, string> = {
  planning: '#94a3b8', active: '#6366f1', on_hold: '#f59e0b', completed: '#10b981', cancelled: '#ef4444',
}

export default function ReportsPage() {
  const [tab, setTab] = useState(0)
  const { data: staff = [], isLoading: ls } = useQuery({ queryKey: ['rpt-staff'], queryFn: reportsApi.staffPerformance })
  const { data: projects = [], isLoading: lp } = useQuery({ queryKey: ['rpt-projects'], queryFn: reportsApi.projectSummary })
  const { data: time = [], isLoading: lt } = useQuery({ queryKey: ['rpt-time'], queryFn: reportsApi.timeTracking })

  const isLoading = ls || lp || lt

  const projectPie = Object.entries(
    projects.reduce((acc: any, p: any) => { acc[p.status] = (acc[p.status] || 0) + 1; return acc }, {})
  ).map(([name, value]) => ({ name, value }))

  return (
    <div>
      <PageHeader title="Reports" />
      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-6">
          {TABS.map((t, i) => (
            <button key={t} onClick={() => setTab(i)}
              className={clsx('pb-3 text-sm font-medium border-b-2 transition-colors', tab === i ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700')}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <div className="flex justify-center py-20"><Spinner className="w-8 h-8" /></div>}

      {!isLoading && tab === 0 && (
        <div className="space-y-6">
          <div className="card p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Tasks completed vs in progress</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={staff}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="user_name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="tasks_completed" name="Completed" fill="#10b981" radius={[4,4,0,0]} />
                <Bar dataKey="tasks_in_progress" name="In Progress" fill="#6366f1" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wider border-b border-gray-100">
                <th className="px-5 py-3 text-left">Staff Member</th>
                <th className="px-5 py-3 text-right">Completed</th>
                <th className="px-5 py-3 text-right">In Progress</th>
                <th className="px-5 py-3 text-right">Total Hours</th>
                <th className="px-5 py-3 text-right">Projects</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {staff.map((s: any) => (
                  <tr key={s.user_id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-800">{s.user_name}</td>
                    <td className="px-5 py-3 text-right text-emerald-600 font-medium">{s.tasks_completed}</td>
                    <td className="px-5 py-3 text-right text-amber-600 font-medium">{s.tasks_in_progress}</td>
                    <td className="px-5 py-3 text-right text-gray-600">{s.total_hours}h</td>
                    <td className="px-5 py-3 text-right text-gray-600">{s.projects_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!isLoading && tab === 1 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-5">
              <h2 className="font-semibold text-gray-800 mb-4">Projects by status</h2>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={projectPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                    {projectPie.map((e: any) => <Cell key={e.name} fill={STATUS_COLORS[e.name] ?? '#94a3b8'} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="card p-5">
              <h2 className="font-semibold text-gray-800 mb-4">Project progress</h2>
              <div className="space-y-4 overflow-y-auto max-h-56">
                {projects.map((p: any) => (
                  <div key={p.project_id}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700 truncate mr-2">{p.project_name}</span>
                      <span className="text-gray-400 flex-shrink-0">{p.completed_tasks}/{p.total_tasks} · {p.progress_percent}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="bg-brand-500 h-2 rounded-full" style={{ width: `${p.progress_percent}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wider border-b border-gray-100">
                <th className="px-5 py-3 text-left">Project</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-right">Tasks</th>
                <th className="px-5 py-3 text-right">Done</th>
                <th className="px-5 py-3 text-right">Progress</th>
                <th className="px-5 py-3 text-right">Hours</th>
                <th className="px-5 py-3 text-right">Members</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {projects.map((p: any) => (
                  <tr key={p.project_id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-800">{p.project_name}</td>
                    <td className="px-5 py-3"><span className="badge" style={{ background: STATUS_COLORS[p.status] + '25', color: STATUS_COLORS[p.status] }}>{p.status}</span></td>
                    <td className="px-5 py-3 text-right">{p.total_tasks}</td>
                    <td className="px-5 py-3 text-right text-emerald-600">{p.completed_tasks}</td>
                    <td className="px-5 py-3 text-right font-medium">{p.progress_percent}%</td>
                    <td className="px-5 py-3 text-right">{p.total_hours}h</td>
                    <td className="px-5 py-3 text-right">{p.member_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!isLoading && tab === 2 && (
        <div className="space-y-6">
          <div className="card p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Hours by staff member</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={time}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="user_name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: any) => [`${v}h`, 'Hours']} />
                <Bar dataKey="total_hours" fill="#6366f1" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wider border-b border-gray-100">
                <th className="px-5 py-3 text-left">Staff Member</th>
                <th className="px-5 py-3 text-left">Project</th>
                <th className="px-5 py-3 text-right">Total Hours</th>
                <th className="px-5 py-3 text-right">Entries</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {time.map((r: any, i: number) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-800">{r.user_name}</td>
                    <td className="px-5 py-3 text-gray-600">{r.project_name}</td>
                    <td className="px-5 py-3 text-right font-medium text-brand-600">{r.total_hours}h</td>
                    <td className="px-5 py-3 text-right text-gray-500">{r.entry_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
