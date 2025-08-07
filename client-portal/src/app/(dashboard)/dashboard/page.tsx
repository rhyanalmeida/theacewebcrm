'use client'

import { useEffect, useState } from 'react'
import { StatsCard } from '@/components/dashboard/stats-card'
import { ProjectCard } from '@/components/dashboard/project-card'
import { RecentActivity } from '@/components/dashboard/recent-activity'
import { useAuthContext } from '@/components/auth/auth-provider'
import { projectService } from '@/services/projects'
import { 
  FolderOpen, 
  CheckCircle2, 
  Clock, 
  TrendingUp,
  FileText,
  CreditCard,
  MessageSquare
} from 'lucide-react'
import type { Database } from '@/types/database'

type Project = Database['public']['Tables']['client_projects']['Row']

export default function DashboardPage() {
  const { profile } = useAuthContext()
  const [projects, setProjects] = useState<Project[]>([])
  const [stats, setStats] = useState<any>(null)
  const [activity, setActivity] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile?.id) {
      loadDashboardData()
    }
  }, [profile])

  const loadDashboardData = async () => {
    if (!profile?.id) return

    try {
      setLoading(true)
      
      // Load all data in parallel
      const [projectsData, statsData, activityData] = await Promise.all([
        projectService.getProjects(profile.id),
        projectService.getProjectStats(profile.id),
        projectService.getRecentActivity(profile.id, 10)
      ])

      setProjects(projectsData)
      setStats(statsData)
      setActivity(activityData)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-96 bg-muted animate-pulse rounded-lg" />
          <div className="h-96 bg-muted animate-pulse rounded-lg" />
        </div>
      </div>
    )
  }

  const recentProjects = projects.slice(0, 3)

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Welcome back, {profile?.full_name?.split(' ')[0] || 'there'}!
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          Here's what's happening with your projects today.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Projects"
          value={stats?.total || 0}
          description="All your projects"
          icon={FolderOpen}
        />
        <StatsCard
          title="Active Projects"
          value={stats?.active || 0}
          description="Currently in progress"
          icon={Clock}
          badge={{ text: 'In Progress', variant: 'secondary' }}
        />
        <StatsCard
          title="Completed"
          value={stats?.completed || 0}
          description="Successfully delivered"
          icon={CheckCircle2}
          trend={{ value: 12, label: 'vs last month', type: 'up' }}
        />
        <StatsCard
          title="Average Progress"
          value={`${Math.round(stats?.averageProgress || 0)}%`}
          description="Across all projects"
          icon={TrendingUp}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Projects */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Recent Projects
          </h2>
          {recentProjects.length > 0 ? (
            <div className="space-y-4">
              {recentProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  compact
                />
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-sm border text-center">
              <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                No projects yet
              </h3>
              <p className="mt-2 text-gray-600 dark:text-gray-300">
                Your projects will appear here once they're created.
              </p>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <RecentActivity activities={activity} />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Browse Files
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Access project deliverables and documents
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <CreditCard className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                View Invoices
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Check payment status and download receipts
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <MessageSquare className="h-8 w-8 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Start Chat
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Connect with your project team
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}