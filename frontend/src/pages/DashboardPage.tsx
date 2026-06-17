import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { FolderOpen, CheckSquare, Clock, Users, TrendingUp, AlertCircle } from 'lucide-react'
import { dashboardApi, reportsApi } from '../api/client'
import { useAuthStore } from '../features/auth/authStore'
import { StatusBadge, PriorityBadge, Spinner } from '../components/ui'

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: any; color: string }) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'

  const { data: stats, isLoading } = useQuery({ queryKey: ['dashboard-stats'], queryFn: dashboardApi.stats })
  const { data: activity } = useQuery({ queryKey: ['recent-activity'], queryFn: dashboardApi.recentActivity })
  const { data: projectSummary } = useQuery({ queryKey: ['project-summary'], queryFn: reportsApi.projectSummary, enabled: isAdmin })

  if (isLoading) return <div className="flex justify-center py-20"><Spinner className="w-8 h-8" /></div>

  const pieData = stats ? [
    { name: 'Open', value: stats.open_tasks, fill: '#6366f1' },
    { name: 'Done', value: stats.completed_tasks, fill: '#10b981' },
  ] : []

  const h = new Date().getHours()
  const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{greeting}, {user?.name?.split(' ')[0]} 👋</h1>
        <p className="text-gray-500 text-sm mt-0.5">Here's what's happening today.</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Projects"    value={stats?.active_projects ?? 0}         icon={FolderOpen}   color="bg-brand-500" />
        <StatCard label="Open Tasks"         value={stats?.open_tasks ?? 0}              icon={CheckSquare}  color="bg-amber-500" />
        <StatCard label="Completed Tasks"    value={stats?.completed_tasks ?? 0}         icon={TrendingUp}   color="bg-emerald-500" />
        <StatCard label="Hours This Month"   value={stats?.total_hours_this_month ?? 0}  icon={Clock}        color="bg-purple-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pie chart */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Task overview</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                {pieData.map(entry => <Cell key={entry.name} fill={entry.fill} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Project progress */}
        {isAdmin && projectSummary && projectSummary.length > 0 && (
          <div className="card p-5 lg:col-span-2">
            <h2 className="font-semibold text-gray-800 mb-4">Project progress</h2>
            <div className="space-y-3">
              {projectSummary.slice(0, 5).map((p: any) => (
                <div key={p.project_id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700 font-medium truncate mr-2">{p.project_name}</span>
                    <span className="text-gray-400 flex-shrink-0">{p.progress_percent}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-brand-500 h-2 rounded-full transition-all" style={{ width: `${p.progress_percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Recent activity */}
      <div className="card">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Recent activity</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {(activity ?? []).length === 0 && (
            <div className="py-10 text-center text-gray-400 text-sm">No recent activity</div>
          )}
          {(activity ?? []).map((task: any) => (
            <div key={task.id} className="flex items-center justify-between px-5 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-800 truncate">{task.title}</p>
                {task.assignee && (
                  <p className="text-xs text-gray-400 mt-0.5">{task.assignee.name}</p>
                )}
              </div>
              <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                <StatusBadge value={task.status} />
                <PriorityBadge value={task.priority} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
