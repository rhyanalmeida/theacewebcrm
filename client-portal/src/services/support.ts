import { createSupabaseClient } from '@/lib/supabase'
import type { Database } from '@/types/database'

type SupportTicket = Database['public']['Tables']['support_tickets']['Row']
type TicketMessage = Database['public']['Tables']['ticket_messages']['Row']

class SupportService {
  private supabase = createSupabaseClient()

  async getTickets(clientId: string) {
    const { data, error } = await this.supabase
      .from('support_tickets')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  async getTicket(id: string) {
    const { data, error } = await this.supabase
      .from('support_tickets')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  }

  async createTicket(ticket: Omit<SupportTicket, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await this.supabase
      .from('support_tickets')
      .insert(ticket)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateTicket(id: string, updates: Partial<SupportTicket>) {
    const { data, error } = await this.supabase
      .from('support_tickets')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getTicketMessages(ticketId: string) {
    const { data, error } = await this.supabase
      .from('ticket_messages')
      .select(`
        *,
        profiles:user_id (
          full_name,
          avatar_url,
          role
        )
      `)
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data
  }

  async addTicketMessage(message: Omit<TicketMessage, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await this.supabase
      .from('ticket_messages')
      .insert(message)
      .select(`
        *,
        profiles:user_id (
          full_name,
          avatar_url,
          role
        )
      `)
      .single()

    if (error) throw error
    return data
  }

  async getTicketStats(clientId: string) {
    const { data: tickets, error } = await this.supabase
      .from('support_tickets')
      .select('status, priority, created_at')
      .eq('client_id', clientId)

    if (error) throw error

    const stats = {
      total: tickets.length,
      open: tickets.filter(t => t.status === 'open').length,
      inProgress: tickets.filter(t => t.status === 'in-progress').length,
      resolved: tickets.filter(t => t.status === 'resolved').length,
      closed: tickets.filter(t => t.status === 'closed').length,
      urgent: tickets.filter(t => t.priority === 'urgent').length,
      high: tickets.filter(t => t.priority === 'high').length,
      avgResponseTime: 0, // Would calculate from message timestamps
    }

    return stats
  }

  // Real-time subscriptions
  subscribeToTicketUpdates(clientId: string, callback: (payload: any) => void) {
    return this.supabase
      .channel('ticket-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_tickets',
          filter: `client_id=eq.${clientId}`
        },
        callback
      )
      .subscribe()
  }

  subscribeToTicketMessages(ticketId: string, callback: (payload: any) => void) {
    return this.supabase
      .channel('ticket-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ticket_messages',
          filter: `ticket_id=eq.${ticketId}`
        },
        callback
      )
      .subscribe()
  }
}

export const supportService = new SupportService()