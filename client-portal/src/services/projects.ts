import { createSupabaseClient } from '@/lib/supabase'
import type { Database } from '@/types/database'

type Project = Database['public']['Tables']['client_projects']['Row']
type ProjectFile = Database['public']['Tables']['project_files']['Row']
type ProjectFeedback = Database['public']['Tables']['project_feedback']['Row']

class ProjectService {
  private supabase = createSupabaseClient()

  async getProjects(clientId: string) {
    const { data, error } = await this.supabase
      .from('client_projects')
      .select('*')
      .eq('client_id', clientId)
      .order('updated_at', { ascending: false })

    if (error) throw error
    return data
  }

  async getProject(id: string) {
    const { data, error } = await this.supabase
      .from('client_projects')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  }

  async getProjectFiles(projectId: string) {
    const { data, error } = await this.supabase
      .from('project_files')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_client_visible', true)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  async downloadFile(fileId: string) {
    // First get file info
    const { data: fileData, error: fileError } = await this.supabase
      .from('project_files')
      .select('*')
      .eq('id', fileId)
      .eq('is_client_visible', true)
      .single()

    if (fileError) throw fileError

    // Download from storage
    const { data, error } = await this.supabase.storage
      .from('project-files')
      .download(fileData.file_path)

    if (error) throw error

    // Update download count
    await this.supabase
      .from('project_files')
      .update({ 
        download_count: fileData.download_count + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', fileId)

    return { file: data, filename: fileData.name }
  }

  async getProjectFeedback(projectId: string) {
    const { data, error } = await this.supabase
      .from('project_feedback')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  async submitFeedback(feedback: Omit<ProjectFeedback, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await this.supabase
      .from('project_feedback')
      .insert(feedback)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateFeedback(id: string, updates: Partial<ProjectFeedback>) {
    const { data, error } = await this.supabase
      .from('project_feedback')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getProjectStats(clientId: string) {
    const { data: projects, error } = await this.supabase
      .from('client_projects')
      .select('status, progress')
      .eq('client_id', clientId)

    if (error) throw error

    const stats = {
      total: projects.length,
      active: projects.filter(p => p.status === 'in-progress').length,
      completed: projects.filter(p => p.status === 'completed').length,
      pending: projects.filter(p => p.status === 'planning' || p.status === 'review').length,
      averageProgress: projects.reduce((acc, p) => acc + p.progress, 0) / projects.length || 0
    }

    return stats
  }

  async getRecentActivity(clientId: string, limit: number = 10) {
    // This would typically combine multiple tables
    // For now, we'll just get recent project updates
    const { data: projects, error } = await this.supabase
      .from('client_projects')
      .select('id, name, status, updated_at')
      .eq('client_id', clientId)
      .order('updated_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return projects.map(project => ({
      id: project.id,
      type: 'project' as const,
      title: project.name,
      description: `Project status updated to ${project.status.replace('-', ' ')}`,
      timestamp: project.updated_at,
      status: project.status,
      link: `/projects/${project.id}`
    }))
  }

  // Real-time subscriptions
  subscribeToProjectUpdates(clientId: string, callback: (payload: any) => void) {
    return this.supabase
      .channel('project-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'client_projects',
          filter: `client_id=eq.${clientId}`
        },
        callback
      )
      .subscribe()
  }

  subscribeToFileUpdates(projectId: string, callback: (payload: any) => void) {
    return this.supabase
      .channel('file-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_files',
          filter: `project_id=eq.${projectId}`
        },
        callback
      )
      .subscribe()
  }

  subscribeToFeedbackUpdates(projectId: string, callback: (payload: any) => void) {
    return this.supabase
      .channel('feedback-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_feedback',
          filter: `project_id=eq.${projectId}`
        },
        callback
      )
      .subscribe()
  }
}

export const projectService = new ProjectService()