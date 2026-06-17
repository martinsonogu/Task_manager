import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Plus, Edit2, Lock, UserX, CheckCircle } from 'lucide-react'
import { usersApi } from '../api/client'
import { User, UserRole } from '../types'
import { Avatar, StatusBadge, Modal, PageHeader, Spinner, EmptyState } from '../components/ui'
import toast from 'react-hot-toast'

const DEPTS = ['Engineering', 'Design', 'Product', 'Sales', 'Marketing', 'HR', 'Finance', 'Operations']

function UserForm({ onClose, editUser }: { onClose: () => void; editUser?: User | null }) {
  const qc = useQueryClient()
  const isEdit = !!editUser
  const [form, setForm] = useState({
    name: editUser?.name ?? '',
    email: editUser?.email ?? '',
    password: '',
    role: (editUser?.role ?? 'staff') as UserRole,
    department: editUser?.department ?? '',
  })
  const mut = useMutation({
    mutationFn: (d: any) => isEdit ? usersApi.update(editUser!.id, d) : usersApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success(isEdit ? 'User updated' : 'User created'); onClose() },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Error'),
  })
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload: any = { name: form.name, email: form.email, role: form.role, department: form.department }
    if (!isEdit) payload.password = form.password
    mut.mutate(payload)
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <div><label className="label">Full name</label><input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
      <div><label className="label">Email</label><input className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required /></div>
      {!isEdit && <div><label className="label">Password</label><input className="input" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={8} /></div>}
      <div><label className="label">Role</label>
        <select className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as UserRole }))}>
          <option value="staff">Staff</option><option value="admin">Admin</option>
        </select>
      </div>
      <div><label className="label">Department</label>
        <select className="input" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}>
          <option value="">— Select —</option>
          {DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={mut.isPending}>{isEdit ? 'Save' : 'Create'}</button>
      </div>
    </form>
  )
}

function ResetPwdForm({ user, onClose }: { user: User; onClose: () => void }) {
  const [pwd, setPwd] = useState('')
  const mut = useMutation({
    mutationFn: () => usersApi.resetPassword(user.id, pwd),
    onSuccess: () => { toast.success('Password reset'); onClose() },
    onError: () => toast.error('Failed to reset password'),
  })
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">Setting new password for <strong>{user.name}</strong></p>
      <div><label className="label">New Password</label><input className="input" type="password" value={pwd} onChange={e => setPwd(e.target.value)} minLength={8} /></div>
      <div className="flex justify-end gap-2 pt-2">
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-danger" disabled={pwd.length < 8 || mut.isPending} onClick={() => mut.mutate()}>Reset</button>
      </div>
    </div>
  )
}

export default function UsersPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [resetUser, setResetUser] = useState<User | null>(null)

  const { data: users = [], isLoading } = useQuery({ queryKey: ['users'], queryFn: () => usersApi.list() })
  const deactivate = useMutation({
    mutationFn: usersApi.deactivate,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('User deactivated') },
  })

  const filtered = users.filter((u: User) =>
    u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <PageHeader title="Users" action={<button className="btn-primary" onClick={() => setCreateOpen(true)}><Plus size={16} />New User</button>} />
      <div className="card">
        <div className="p-4 border-b border-gray-100">
          <div className="relative w-72">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input pl-9" placeholder="Search users…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        {isLoading ? <div className="flex justify-center py-12"><Spinner /></div> : (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-gray-400 uppercase tracking-wider border-b border-gray-100">
              <th className="px-5 py-3">User</th><th className="px-5 py-3">Role</th>
              <th className="px-5 py-3">Department</th><th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Joined</th><th className="px-5 py-3 text-right">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((user: User) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={user.name} size="sm" />
                      <div><p className="font-medium text-gray-800">{user.name}</p><p className="text-xs text-gray-400">{user.email}</p></div>
                    </div>
                  </td>
                  <td className="px-5 py-3"><StatusBadge value={user.role} /></td>
                  <td className="px-5 py-3 text-gray-600">{user.department || '—'}</td>
                  <td className="px-5 py-3"><StatusBadge value={user.status} /></td>
                  <td className="px-5 py-3 text-gray-400">{new Date(user.created_at).toLocaleDateString()}</td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <button className="btn-ghost p-1.5" onClick={() => setEditUser(user)} title="Edit"><Edit2 size={14} /></button>
                      <button className="btn-ghost p-1.5" onClick={() => setResetUser(user)} title="Reset password"><Lock size={14} /></button>
                      <button className="btn-ghost p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => deactivate.mutate(user.id)} title="Deactivate"><UserX size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!isLoading && filtered.length === 0 && <EmptyState icon="👤" message="No users found" />}
      </div>
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create User"><UserForm onClose={() => setCreateOpen(false)} /></Modal>
      {editUser && <Modal open onClose={() => setEditUser(null)} title="Edit User"><UserForm onClose={() => setEditUser(null)} editUser={editUser} /></Modal>}
      {resetUser && <Modal open onClose={() => setResetUser(null)} title="Reset Password"><ResetPwdForm user={resetUser} onClose={() => setResetUser(null)} /></Modal>}
    </div>
  )
}
