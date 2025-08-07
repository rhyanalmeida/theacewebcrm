'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string | number
  description?: string
  icon: LucideIcon
  trend?: {
    value: number
    label: string
    type: 'up' | 'down' | 'neutral'
  }
  badge?: {
    text: string
    variant?: 'default' | 'secondary' | 'destructive' | 'outline'
  }
  className?: string
}

export function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  badge,
  className,
}: StatsCardProps) {
  return (
    <Card className={cn('animate-fade-in', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="flex items-center space-x-2">
          {badge && (
            <Badge variant={badge.variant}>{badge.text}</Badge>
          )}
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {(description || trend) && (
          <div className="flex items-center justify-between mt-2">
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
            {trend && (
              <div
                className={cn(
                  'text-xs font-medium flex items-center',
                  trend.type === 'up' && 'text-green-600',
                  trend.type === 'down' && 'text-red-600',
                  trend.type === 'neutral' && 'text-gray-600'
                )}
              >
                {trend.type === 'up' && '↗'}
                {trend.type === 'down' && '↘'}
                {trend.type === 'neutral' && '→'}
                {trend.value}% {trend.label}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}