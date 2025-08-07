'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { formatDate, formatCurrency, getStatusColor, getProgressColor } from '@/lib/utils'
import { Calendar, DollarSign, ExternalLink, FileText, MessageSquare } from 'lucide-react'
import type { Database } from '@/types/database'

type Project = Database['public']['Tables']['client_projects']['Row']

interface ProjectCardProps {
  project: Project
  showActions?: boolean
  compact?: boolean
}

export function ProjectCard({ project, showActions = true, compact = false }: ProjectCardProps) {
  const statusColor = getStatusColor(project.status)
  const progressColor = getProgressColor(project.progress)

  return (
    <Card className="group hover:shadow-md transition-shadow duration-200">
      <CardHeader className={compact ? 'pb-3' : undefined}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg group-hover:text-primary transition-colors">
              <Link href={`/projects/${project.id}`}>{project.name}</Link>
            </CardTitle>
            {project.description && (
              <CardDescription className="mt-1 line-clamp-2">
                {project.description}
              </CardDescription>
            )}
          </div>
          <Badge className={statusColor}>
            {project.status.replace('-', ' ')}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{project.progress}%</span>
          </div>
          <Progress value={project.progress} className="h-2" />
        </div>

        {/* Project Details */}
        {!compact && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            {project.start_date && (
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Start:</span>
                <span>{formatDate(project.start_date)}</span>
              </div>
            )}
            {project.end_date && (
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Due:</span>
                <span>{formatDate(project.end_date)}</span>
              </div>
            )}
            {project.budget && (
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Budget:</span>
                <span>{formatCurrency(project.budget)}</span>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/projects/${project.id}`}>
                  <ExternalLink className="h-3 w-3 mr-1" />
                  View
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/projects/${project.id}/files`}>
                  <FileText className="h-3 w-3 mr-1" />
                  Files
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/projects/${project.id}/chat`}>
                  <MessageSquare className="h-3 w-3 mr-1" />
                  Chat
                </Link>
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              Updated {formatDate(project.updated_at, { 
                month: 'short', 
                day: 'numeric' 
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}