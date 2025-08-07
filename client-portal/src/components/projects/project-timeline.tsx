'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  FileText,
  MessageSquare,
  Users,
  Target,
  Activity
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import type { Database } from '@/types/database'

type Project = Database['public']['Tables']['client_projects']['Row']

interface Milestone {
  id: string
  project_id: string
  title: string
  description?: string
  due_date: string
  status: 'pending' | 'in-progress' | 'completed' | 'overdue'
  progress: number
  created_at: string
}

interface ProjectTimelineProps {
  project: Project
  milestones: Milestone[]
  onFeedbackSubmit?: (milestoneId: string, feedback: string) => void
}

export function ProjectTimeline({ project, milestones, onFeedbackSubmit }: ProjectTimelineProps) {
  const [selectedMilestone, setSelectedMilestone] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500'
      case 'in-progress': return 'bg-blue-500'
      case 'overdue': return 'bg-red-500'
      default: return 'bg-gray-300'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4" />
      case 'in-progress': return <Clock className="h-4 w-4" />
      case 'overdue': return <AlertCircle className="h-4 w-4" />
      default: return <Target className="h-4 w-4" />
    }
  }

  const sortedMilestones = [...milestones].sort((a, b) => 
    new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
  )

  const completedMilestones = milestones.filter(m => m.status === 'completed').length
  const totalMilestones = milestones.length
  const overallProgress = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Project Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">{project.name}</CardTitle>
              <CardDescription className="mt-2">
                {project.description}
              </CardDescription>
            </div>
            <Badge variant={project.status === 'completed' ? 'default' : 'secondary'}>
              {project.status.replace('-', ' ').toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center text-sm text-muted-foreground">
                <Calendar className="h-4 w-4 mr-2" />
                Timeline
              </div>
              <div className="text-lg font-semibold">
                {project.start_date && format(new Date(project.start_date), 'MMM d, yyyy')}
                {' - '}
                {project.end_date && format(new Date(project.end_date), 'MMM d, yyyy')}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4 mr-2" />
                Overall Progress
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{Math.round(overallProgress)}% Complete</span>
                  <span>{completedMilestones}/{totalMilestones} Milestones</span>
                </div>
                <Progress value={overallProgress} className="h-2" />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center text-sm text-muted-foreground">
                <Activity className="h-4 w-4 mr-2" />
                Status
              </div>
              <div className="flex items-center space-x-2">
                {getStatusIcon(project.status)}
                <span className="font-medium capitalize">
                  {project.status.replace('-', ' ')}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline Tabs */}
      <Tabs defaultValue="timeline" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="timeline">Timeline View</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="activity">Activity Feed</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-4">
          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border" />
            
            {sortedMilestones.map((milestone, index) => (
              <div key={milestone.id} className="relative flex items-start space-x-4 pb-8">
                {/* Timeline Dot */}
                <div className={`
                  relative z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white
                  ${getStatusColor(milestone.status)}
                `}>
                  <div className="h-2 w-2 rounded-full bg-white" />
                </div>
                
                {/* Timeline Content */}
                <Card className="flex-1">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{milestone.title}</CardTitle>
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant={milestone.status === 'completed' ? 'default' : 'secondary'}
                        >
                          {milestone.status.replace('-', ' ')}
                        </Badge>
                        {milestone.status === 'overdue' && (
                          <Badge variant="destructive">Overdue</Badge>
                        )}
                      </div>
                    </div>
                    {milestone.description && (
                      <CardDescription>{milestone.description}</CardDescription>
                    )}
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center text-muted-foreground">
                        <Calendar className="h-4 w-4 mr-2" />
                        Due {format(new Date(milestone.due_date), 'MMM d, yyyy')}
                        <span className="ml-2">
                          ({formatDistanceToNow(new Date(milestone.due_date))} {new Date(milestone.due_date) > new Date() ? 'from now' : 'ago'})
                        </span>
                      </div>
                      <span className="font-medium">{milestone.progress}% Complete</span>
                    </div>
                    
                    <Progress value={milestone.progress} className="h-2" />
                    
                    {milestone.status !== 'completed' && (
                      <div className="flex items-center space-x-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedMilestone(
                            selectedMilestone === milestone.id ? null : milestone.id
                          )}
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Provide Feedback
                        </Button>
                      </div>
                    )}
                    
                    {selectedMilestone === milestone.id && (
                      <div className="space-y-3 pt-3 border-t">
                        <textarea
                          className="w-full p-3 border rounded-lg resize-none"
                          rows={3}
                          placeholder="Share your thoughts, feedback, or questions about this milestone..."
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                        />
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              if (feedback.trim() && onFeedbackSubmit) {
                                onFeedbackSubmit(milestone.id, feedback)
                                setFeedback('')
                                setSelectedMilestone(null)
                              }
                            }}
                            disabled={!feedback.trim()}
                          >
                            Submit Feedback
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedMilestone(null)
                              setFeedback('')
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="milestones">
          <div className="grid gap-4">
            {sortedMilestones.map((milestone) => (
              <Card key={milestone.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className={`
                          flex h-8 w-8 items-center justify-center rounded-full
                          ${getStatusColor(milestone.status)} text-white
                        `}>
                          {getStatusIcon(milestone.status)}
                        </div>
                        <h3 className="text-lg font-semibold">{milestone.title}</h3>
                      </div>
                      
                      {milestone.description && (
                        <p className="text-muted-foreground mb-3">{milestone.description}</p>
                      )}
                      
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span>Due: {format(new Date(milestone.due_date), 'MMM d, yyyy')}</span>
                        <span>Progress: {milestone.progress}%</span>
                      </div>
                    </div>
                    
                    <Badge 
                      variant={milestone.status === 'completed' ? 'default' : 'secondary'}
                    >
                      {milestone.status.replace('-', ' ')}
                    </Badge>
                  </div>
                  
                  <div className="mt-4">
                    <Progress value={milestone.progress} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest updates and changes to your project</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Activity items would be loaded from the backend */}
                <div className="flex items-start space-x-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">
                      <span className="font-medium">Design milestone</span> was completed
                    </p>
                    <p className="text-xs text-muted-foreground">2 hours ago</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">
                      New files uploaded to <span className="font-medium">Design Assets</span>
                    </p>
                    <p className="text-xs text-muted-foreground">Yesterday at 3:24 PM</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-600">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">
                      <span className="font-medium">Sarah Johnson</span> responded to your feedback
                    </p>
                    <p className="text-xs text-muted-foreground">2 days ago</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}