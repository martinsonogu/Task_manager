import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Upload, UserPlus, CheckSquare, Users, FileText } from 'lucide-react'
import { projectsApi, tasksApi, docsApi, usersApi } from '../api/client'
import { Task, ProjectDocument } from '../types'
import { StatusBadge, PriorityBadge, Avatar, Spinner, Modal } from '../components/ui'
import { useAuthStore } from '../features/auth/authStore'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'

const TABS = ['Tasks', 'Members', 'Documents']

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [tab, setTab] = useState(0)
  const [addMemberOpen, setAddMemberOpen] = useState(false)
  const [newMemberId, setNewMemberId] = useState('')

  const { data: project, isLoading } = useQuery({ queryKey: ['project', id], queryFn: () => projectsApi.get(id!), enabled: !!id })
  const { data: tasks = [] } = useQuery({ queryKey: ['tasks', id], queryFn: () => tasksApi.list({ project_id: id }), enabled: !!id })
  const { data: docs = [] } = useQuery({ queryKey: ['docs', id], queryFn: () => docsApi.list({ project_id: id }), enabled: !!id })
  const { data: allUsers = [] } = useQuery({ queryKey: ['users'], queryFn: () => usersApi.list(), enabled: user?.role === 'admin' })

  const uploadMut = useMutation({
    mutationFn: (file: File) => docsApi.upload(file, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['docs', id] }); toast.success('Uploaded') },
    onError: () => toast.error('Upload failed'),
  })

  const addMemberMut = useMutation({
    mutationFn: () => projectsApi.addMember(id!, newMemberId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['project', id] }); toast.success('Member added'); setAddMemberOpen(false); setNewMemberId('') },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Error'),
  })

  if (isLoading) return <div className="flex justify-center py-20"><Spinner className="w-8 h-8" /></div>
  if (!project) return <div className="text-center py-20 text-gray-400">Project not found</div>

  const completed = tasks.filter((t: Task) => t.status === 'completed').length
  const progress = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0
  const memberIds = (project.members ?? []).map((m: any) => m.user_id)
  const nonMembers = allUsers.filter((u: any) => !memberIds.includes(u.id))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={() => navigate('/projects')} className="btn-ghost p-2 mt-0.5"><ArrowLeft size={18} /></button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            <StatusBadge value={project.status} />
          </div>
          {project.description && <p className="text-gray-500 text-sm mt-1">{project.description}</p>}
        </div>
      </div>

      {/* Stats bar */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className="text-sm text-gray-400 ml-auto">{completed}/{tasks.length} tasks</span>
          <span className="text-sm font-semibold text-brand-600">{progress}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5">
          <div className="bg-brand-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <div className="grid grid-cols-3 gap-4 mt-5 pt-4 border-t border-gray-100 text-center">
          <div><p className="text-2xl font-bold text-gray-900">{tasks.length}</p><p className="text-xs text-gray-400 mt-0.5">Tasks</p></div>
          <div><p className="text-2xl font-bold text-gray-900">{project.member_count}</p><p className="text-xs text-gray-400 mt-0.5">Members</p></div>
          <div><p className="text-2xl font-bold text-gray-900">{docs.length}</p><p className="text-xs text-gray-400 mt-0.5">Documents</p></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-6">
          {TABS.map((t, i) => (
            <button key={t} onClick={() => setTab(i)}
              className={clsx('pb-3 text-sm font-medium border-b-2 transition-colors', tab === i ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700')}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Tasks tab */}
      {tab === 0 && (
        <div className="card divide-y divide-gray-50">
          {tasks.length === 0 && <div className="py-12 text-center text-gray-400 text-sm">No tasks yet</div>}
          {tasks.map((task: Task) => (
            <div key={task.id} className="flex items-center justify-between px-5 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-800 truncate">{task.title}</p>
                {task.assignee && <p className="text-xs text-gray-400 mt-0.5">{task.assignee.name}</p>}
              </div>
              <div className="flex items-center gap-2 ml-4">
                <StatusBadge value={task.status} />
                <PriorityBadge value={task.priority} />
                {task.due_date && <span className="text-xs text-gray-400">{new Date(task.due_date).toLocaleDateString()}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Members tab */}
      {tab === 1 && (
        <div className="card p-5">
          {user?.role === 'admin' && (
            <button className="btn-secondary mb-4" onClick={() => setAddMemberOpen(true)}><UserPlus size={15} />Add Member</button>
          )}
          <div className="space-y-3">
            {(project.members ?? []).map((m: any) => (
              <div key={m.id} className="flex items-center gap-3">
                <Avatar name={m.user?.name ?? '?'} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{m.user?.name ?? m.user_id}</p>
                  <p className="text-xs text-gray-400">{m.user?.department ?? m.user?.role}</p>
                </div>
                {m.user_id === project.owner_id && <span className="badge bg-brand-100 text-brand-700">Owner</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Documents tab */}
      {tab === 2 && (
        <div className="card p-5">
          <label className="btn-secondary cursor-pointer mb-4 inline-flex">
            <Upload size={15} />Upload Document
            <input type="file" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadMut.mutate(f) }} />
          </label>
          {docs.length === 0 && <div className="py-8 text-center text-gray-400 text-sm">No documents uploaded</div>}
          <div className="divide-y divide-gray-50">
            {docs.map((doc: ProjectDocument) => (
              <div key={doc.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <FileText size={16} className="text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{doc.file_name}</p>
                    <p className="text-xs text-gray-400">{doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB · ` : ''}{new Date(doc.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                {doc.file_type && <span className="badge bg-gray-100 text-gray-500">{doc.file_type.split('/')[1] ?? 'file'}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add member modal */}
      <Modal open={addMemberOpen} onClose={() => setAddMemberOpen(false)} title="Add Member">
        <div className="space-y-4">
          <div>
            <label className="label">Select User</label>
            <select className="input" value={newMemberId} onChange={e => setNewMemberId(e.target.value)}>
              <option value="">— Choose user —</option>
              {nonMembers.map((u: any) => <option key={u.id} value={u.id}>{u.name} — {u.department ?? u.role}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setAddMemberOpen(false)}>Cancel</button>
            <button className="btn-primary" disabled={!newMemberId || addMemberMut.isPending} onClick={() => addMemberMut.mutate()}>Add</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
