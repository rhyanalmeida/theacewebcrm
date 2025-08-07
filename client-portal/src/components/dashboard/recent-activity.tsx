'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { 
  FileText, 
  MessageSquare, 
  CreditCard, 
  Star, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  ExternalLink
} from 'lucide-react'
import Link from 'next/link'

interface Activity {
  id: string
  type: 'project' | 'file' | 'invoice' | 'feedback' | 'support' | 'chat'
  title: string
  description: string
  timestamp: string
  status?: string
  link?: string
  metadata?: any
}

interface RecentActivityProps {
  activities: Activity[]
  showAll?: boolean
}

export function RecentActivity({ activities, showAll = false }: RecentActivityProps) {
  const displayActivities = showAll ? activities : activities.slice(0, 5)

  const getActivityIcon = (type: string, status?: string) => {
    switch (type) {
      case 'project':
        return status === 'completed' ? CheckCircle2 : Clock
      case 'file':
        return FileText
      case 'invoice':
        return CreditCard
      case 'feedback':
        return Star
      case 'support':
        return AlertCircle
      case 'chat':
        return MessageSquare
      default:
        return Clock
    }
  }

  const getActivityColor = (type: string, status?: string) => {
    switch (type) {
      case 'project':
        return status === 'completed' ? 'text-green-600' : 'text-blue-600'
      case 'file':
        return 'text-purple-600'
      case 'invoice':
        return status === 'paid' ? 'text-green-600' : 'text-orange-600'
      case 'feedback':
        return 'text-yellow-600'
      case 'support':
        return 'text-red-600'
      case 'chat':
        return 'text-blue-600'
      default:
        return 'text-gray-600'
    }
  }

  const getStatusBadge = (type: string, status?: string) => {
    if (!status) return null

    const badgeVariant = 
      status === 'completed' || status === 'paid' || status === 'resolved' 
        ? 'default'
        : status === 'pending' || status === 'open'
        ? 'secondary'
        : 'outline'

    return (
      <Badge variant={badgeVariant} className="text-xs">
        {status.replace('-', ' ')}
      </Badge>
    )
  }

  if (displayActivities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your latest project updates and notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Clock className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-sm font-medium text-muted-foreground">No recent activity</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Check back later for updates on your projects
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest project updates and notifications</CardDescription>
          </div>
          {!showAll && activities.length > 5 && (
            <Button variant="outline" size="sm" asChild>
              <Link href="/activity">
                View All
                <ExternalLink className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {displayActivities.map((activity) => {
            const Icon = getActivityIcon(activity.type, activity.status)
            const iconColor = getActivityColor(activity.type, activity.status)
            
            return (
              <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div className={`flex-shrink-0 ${iconColor}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-foreground truncate">
                      {activity.link ? (
                        <Link 
                          href={activity.link}
                          className="hover:text-primary transition-colors"
                        >
                          {activity.title}
                        </Link>
                      ) : (
                        activity.title
                      )}
                    </h4>
                    <div className="flex items-center space-x-2 ml-2">
                      {getStatusBadge(activity.type, activity.status)}
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(activity.timestamp, { 
                          month: 'short', 
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {activity.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {showAll && activities.length > displayActivities.length && (
          <div className="mt-4 pt-4 border-t">
            <Button variant="outline" className="w-full">
              Load More Activity
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}