export type UserRole = 'admin' | 'staff'
export type UserStatus = 'active' | 'inactive'
export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled'
export type TaskStatus = 'new' | 'in_progress' | 'blocked' | 'review' | 'completed'
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  department?: string
  status: UserStatus
  avatar_url?: string
  created_at: string
  last_login?: string
}

export interface ProjectDocument {
  id: number
  file_name: string
  file_size?: number
  file_type?: string
  created_at: string
}

export interface Project {
  id: string
  name: string
  description?: string
  status: ProjectStatus
  owner_id: string
  owner: User
  start_date?: string
  end_date?: string
  created_at: string
  updated_at?: string
  member_count: number
  task_count: number
}

export interface Task {
  id: string
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  assignee_id?: string
  assignee?: User
  creator_id: string
  creator?: User
  project_id: string
  parent_task_id?: string
  due_date?: string
  estimated_hours?: number
  created_at: string
  updated_at?: string
  comment_count: number
  total_hours: number
}

export interface Comment {
  id: string
  task_id: string
  user_id: string
  content: string
  created_at: string
  user: User
}

export interface TimeEntry {
  id: string
  task_id: string
  user_id: string
  hours: number
  notes?: string
  date: string
  created_at: string
  user?: User
}

export interface Notification {
  id: string
  type: string
  title: string
  message: string
  is_read: boolean
  related_id?: string
  created_at: string
}

export interface DashboardStats {
  total_projects: number
  active_projects: number
  total_tasks: number
  open_tasks: number
  completed_tasks: number
  total_users: number
  active_users: number
  total_hours_this_month: number
}

export interface StaffPerformance {
  user_id: string
  user_name: string
  tasks_completed: number
  tasks_in_progress: number
  total_hours: number
  projects_count: number
}

export interface ProjectSummary {
  project_id: string
  project_name: string
  status: string
  total_tasks: number
  completed_tasks: number
  progress_percent: number
  total_hours: number
  member_count: number
}
