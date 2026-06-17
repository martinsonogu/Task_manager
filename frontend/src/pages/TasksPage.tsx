import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Edit2, Clock, MessageSquare, AlertTriangle } from 'lucide-react'
import { tasksApi, projectsApi, usersApi } from '../api/client'
import { Task, TaskStatus, TaskPriority } from '../types'
import { StatusBadge, PriorityBadge, Avatar, Modal, PageHeader, Spinner } from '../components/ui'
import { useAuthStore } from '../features/auth/authStore'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'

const COLUMNS: { status: TaskStatus; label: string; dot: string }[] = [
  { status: 'new',         label: 'New',         dot: 'bg-gray-400' },
  { status: 'in_progress', label: 'In Progress',  dot: 'bg-amber-400' },
  { status: 'blocked',     label: 'Blocked',      dot: 'bg-red-400' },
  { status: 'review',      label: 'Review',       dot: 'bg-blue-400' },
  { status: 'completed',   label: 'Completed',    dot: 'bg-emerald-400' },
]

const PRIORITY_BORDER: Record<string, string> = {
  low: 'border-l-gray-300', medium: 'border-l-blue-400', high: 'border-l-orange-400', critical: 'border-l-red-500'
}

function TaskCard({ task, onEdit, onDelete }: { task: Task; onEdit: (t: Task) => void; onDelete: (id: string) => void }) {
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed'
  return (
    <div className={clsx('bg-white rounded-lg border border-gray-100 border-l-4 shadow-sm p-3 cursor-default hover:shadow-md transition-shadow', PRIORITY_BORDER[task.priority])}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-medium text-gray-800 leading-snug flex-1">{task.title}</p>
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={() => onEdit(task)} className="text-gray-300 hover:text-gray-500 p-0.5"><Edit2 size={12} /></button>
          <button onClick={() => onDelete(task.id)} className="text-gray-300 hover:text-red-400 p-0.5"><Trash2 size={12} /></button>
        </div>
      </div>
      {task.description && <p className="text-xs text-gray-400 mb-2 line-clamp-2">{task.description}</p>}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          <PriorityBadge value={task.priority} />
          {task.comment_count > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-gray-400"><MessageSquare size={10} />{task.comment_count}</span>
          )}
          {task.total_hours > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-gray-400"><Clock size={10} />{task.total_hours}h</span>
          )}
        </div>
        {task.assignee && <Avatar name={task.assignee.name} size="sm" />}
      </div>
      {task.due_date && (
        <p className={clsx('text-xs mt-1.5 flex items-center gap-1', isOverdue ? 'text-red-500' : 'text-gray-400')}>
          {isOverdue && <AlertTriangle size={10} />}
          {isOverdue ? 'Overdue · ' : ''}{new Date(task.due_date).toLocaleDateString()}
        </p>
      )}
    </div>
  )
}

function TaskForm({ onClose, editTask, projects, users, defaultProjectId }: {
  onClose: () => void; editTask?: Task | null;
  projects: any[]; users: any[]; defaultProjectId?: string
}) {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const isEdit = !!editTask
  const [form, setForm] = useState({
    title: editTask?.title ?? '',
    description: editTask?.description ?? '',
    status: editTask?.status ?? 'new' as TaskStatus,
    priority: editTask?.priority ?? 'medium' as TaskPriority,
    project_id: editTask?.project_id ?? defaultProjectId ?? (projects[0]?.id ?? ''),
    assignee_id: editTask?.assignee_id ?? '',
    due_date: editTask?.due_date ? editTask.due_date.split('T')[0] : '',
    estimated_hours: editTask?.estimated_hours?.toString() ?? '',
  })
  const mut = useMutation({
    mutationFn: (d: any) => isEdit ? tasksApi.update(editTask!.id, d) : tasksApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); toast.success(isEdit ? 'Task updated' : 'Task created'); onClose() },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Error'),
  })
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    mut.mutate({
      ...form,
      assignee_id: form.assignee_id || null,
      due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
      estimated_hours: form.estimated_hours ? parseFloat(form.estimated_hours) : null,
    })
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <div><label className="label">Title</label><input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required /></div>
      <div><label className="label">Description</label><textarea className="input" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Status</label>
          <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as TaskStatus }))}>
            {COLUMNS.map(c => <option key={c.status} value={c.status}>{c.label}</option>)}
          </select>
        </div>
        <div><label className="label">Priority</label>
          <select className="input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as TaskPriority }))}>
            {['low','medium','high','critical'].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>
      <div><label className="label">Project</label>
        <select className="input" value={form.project_id} onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))} required>
          {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div><label className="label">Assignee</label>
        <select className="input" value={form.assignee_id} onChange={e => setForm(f => ({ ...f, assignee_id: e.target.value }))}>
          <option value="">Unassigned</option>
          {users.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Due Date</label><input className="input" type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} /></div>
        <div><label className="label">Est. Hours</label><input className="input" type="number" min="0" step="0.5" value={form.estimated_hours} onChange={e => setForm(f => ({ ...f, estimated_hours: e.target.value }))} /></div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={!form.title || !form.project_id || mut.isPending}>{isEdit ? 'Save' : 'Create'}</button>
      </div>
    </form>
  )
}

export default function TasksPage() {
  const qc = useQueryClient()
  const [projectFilter, setProjectFilter] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editTask, setEditTask] = useState<Task | null>(null)

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', projectFilter],
    queryFn: () => tasksApi.list(projectFilter ? { project_id: projectFilter } : {}),
  })
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: () => projectsApi.list() })
  const { data: users = [] } = useQuery({ queryKey: ['users-all'], queryFn: () => usersApi.list() })

  const deleteMut = useMutation({
    mutationFn: tasksApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); toast.success('Task deleted') },
  })

  const byStatus = (s: TaskStatus) => tasks.filter((t: Task) => t.status === s)

  if (isLoading) return <div className="flex justify-center py-20"><Spinner className="w-8 h-8" /></div>

  return (
    <div>
      <PageHeader title="Tasks" action={
        <div className="flex items-center gap-3">
          <select className="input w-44" value={projectFilter} onChange={e => setProjectFilter(e.target.value)}>
            <option value="">All Projects</option>
            {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button className="btn-primary" onClick={() => setCreateOpen(true)}><Plus size={16} />New Task</button>
        </div>
      } />

      {/* Kanban board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map(col => (
          <div key={col.status} className="flex-shrink-0 w-64">
            <div className="flex items-center gap-2 mb-3">
              <div className={clsx('w-2.5 h-2.5 rounded-full', col.dot)} />
              <span className="text-sm font-semibold text-gray-700">{col.label}</span>
              <span className="ml-auto text-xs font-medium text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                {byStatus(col.status).length}
              </span>
            </div>
            <div className="space-y-2.5 min-h-24 bg-gray-100/60 rounded-xl p-2.5">
              {byStatus(col.status).map((task: Task) => (
                <TaskCard key={task.id} task={task} onEdit={setEditTask} onDelete={id => deleteMut.mutate(id)} />
              ))}
              {byStatus(col.status).length === 0 && (
                <div className="text-xs text-gray-300 text-center py-6">Empty</div>
              )}
            </div>
          </div>
        ))}
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Task">
        <TaskForm onClose={() => setCreateOpen(false)} projects={projects} users={users} />
      </Modal>
      {editTask && (
        <Modal open onClose={() => setEditTask(null)} title="Edit Task">
          <TaskForm onClose={() => setEditTask(null)} editTask={editTask} projects={projects} users={users} />
        </Modal>
      )}
    </div>
  )
}
