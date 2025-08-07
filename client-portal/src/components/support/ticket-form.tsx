'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { supportService } from '@/services/support'
import { useAuthContext } from '@/components/auth/auth-provider'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

const ticketSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  category: z.enum(['bug', 'feature', 'support', 'billing', 'other']),
  projectId: z.string().optional(),
})

type TicketFormData = z.infer<typeof ticketSchema>

interface TicketFormProps {
  onSubmit?: (ticket: any) => void
  projects?: Array<{ id: string; name: string }>
}

export function TicketForm({ onSubmit, projects = [] }: TicketFormProps) {
  const { profile } = useAuthContext()
  const [loading, setLoading] = useState(false)

  const form = useForm<TicketFormData>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'medium',
      category: 'support',
    },
  })

  const handleSubmit = async (data: TicketFormData) => {
    if (!profile?.id) return

    setLoading(true)
    try {
      const ticket = await supportService.createTicket({
        client_id: profile.id,
        project_id: data.projectId || null,
        title: data.title,
        description: data.description,
        priority: data.priority,
        category: data.category,
        status: 'open',
        assigned_to: null,
        resolution: null,
        resolved_at: null,
      })

      toast.success('Support ticket created successfully')
      form.reset()
      onSubmit?.(ticket)
    } catch (error) {
      console.error('Failed to create ticket:', error)
      toast.error('Failed to create support ticket')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Support Ticket</CardTitle>
        <CardDescription>
          Describe your issue and we'll help you resolve it quickly
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              {...form.register('title')}
              placeholder="Brief description of your issue"
            />
            {form.formState.errors.title && (
              <p className="text-sm text-red-600 mt-1">
                {form.formState.errors.title.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={form.watch('priority')}
                onValueChange={(value: any) => form.setValue('priority', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Select
                value={form.watch('category')}
                onValueChange={(value: any) => form.setValue('category', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bug">Bug Report</SelectItem>
                  <SelectItem value="feature">Feature Request</SelectItem>
                  <SelectItem value="support">General Support</SelectItem>
                  <SelectItem value="billing">Billing Question</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {projects.length > 0 && (
            <div>
              <Label htmlFor="project">Related Project (Optional)</Label>
              <Select
                value={form.watch('projectId')}
                onValueChange={(value) => form.setValue('projectId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...form.register('description')}
              placeholder="Please provide detailed information about your issue..."
              rows={4}
            />
            {form.formState.errors.description && (
              <p className="text-sm text-red-600 mt-1">
                {form.formState.errors.description.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating ticket...
              </>
            ) : (
              'Create Support Ticket'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}