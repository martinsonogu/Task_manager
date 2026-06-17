import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, FolderOpen, CalendarDays, Users } from 'lucide-react'
import { projectsApi, usersApi } from '../api/client'
import { Project, ProjectStatus } from '../types'
import { StatusBadge, Modal, PageHeader, Spinner, EmptyState } from '../components/ui'
import { useAuthStore } from '../features/auth/authStore'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'

const STATUS_OPTIONS: ProjectStatus[] = ['planning', 'active', 'on_hold', 'completed', 'cancelled']

function CreateProjectForm({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: () => usersApi.list() })
  const [form, setForm] = useState({ name: '', description: '', status: 'planning' as ProjectStatus, start_date: '', end_date: '', member_ids: [] as string[] })
  const mut = useMutation({
    mutationFn: () => projectsApi.create({ ...form, start_date: form.start_date || null, end_date: form.end_date || null }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); toast.success('Project created'); onClose() },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Error'),
  })
  const toggleMember = (id: string) => setForm(f => ({
    ...f, member_ids: f.member_ids.includes(id) ? f.member_ids.filter(x => x !== id) : [...f.member_ids, id]
  }))
  return (
    <form onSubmit={e => { e.preventDefault(); mut.mutate() }} className="space-y-4">
      <div><label className="label">Project Name</label><input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
      <div><label className="label">Description</label><textarea className="input" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
      <div><label className="label">Status</label>
        <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as ProjectStatus }))}>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Start Date</label><input className="input" type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
        <div><label className="label">End Date</label><input className="input" type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} /></div>
      </div>
      <div>
        <label className="label">Members</label>
        <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-50">
          {users.filter((u: any) => u.id !== user?.id).map((u: any) => (
            <label key={u.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50">
              <input type="checkbox" checked={form.member_ids.includes(u.id)} onChange={() => toggleMember(u.id)} className="accent-brand-500" />
              <span className="text-sm text-gray-700">{u.name} <span className="text-gray-400">— {u.department || u.role}</span></span>
            </label>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={!form.name || mut.isPending}>Create</button>
      </div>
    </form>
  )
}

export default function ProjectsPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [createOpen, setCreateOpen] = useState(false)

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects', statusFilter],
    queryFn: () => projectsApi.list(statusFilter ? { status: statusFilter } : {}),
  })

  const filtered = projects.filter((p: Project) => p.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <PageHeader title="Projects" action={user?.role === 'admin' && <button className="btn-primary" onClick={() => setCreateOpen(true)}><Plus size={16} />New Project</button>} />
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <input className="input pl-9" placeholder="Search projects…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-40" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
      </div>

      {isLoading && <div className="flex justify-center py-20"><Spinner className="w-8 h-8" /></div>}
      {!isLoading && filtered.length === 0 && <EmptyState icon={<FolderOpen />} message="No projects found" />}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((project: Project) => (
          <div key={project.id} onClick={() => navigate(`/projects/${project.id}`)}
            className="card p-5 cursor-pointer hover:shadow-md transition-shadow flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-gray-900 leading-tight">{project.name}</h3>
              <StatusBadge value={project.status} />
            </div>
            {project.description && (
              <p className="text-sm text-gray-500 line-clamp-2">{project.description}</p>
            )}
            <div className="mt-auto flex items-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1"><Users size={12} />{project.member_count} members</span>
              <span className="flex items-center gap-1"><FolderOpen size={12} />{project.task_count} tasks</span>
              {project.end_date && <span className="flex items-center gap-1"><CalendarDays size={12} />{new Date(project.end_date).toLocaleDateString()}</span>}
            </div>
          </div>
        ))}
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Project">
        <CreateProjectForm onClose={() => setCreateOpen(false)} />
      </Modal>
    </div>
  )
}
