export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      client_projects: {
        Row: {
          id: string
          client_id: string
          name: string
          description: string | null
          status: 'planning' | 'in-progress' | 'review' | 'completed' | 'cancelled'
          progress: number
          start_date: string | null
          end_date: string | null
          budget: number | null
          created_at: string
          updated_at: string
          metadata: Json | null
        }
        Insert: {
          id?: string
          client_id: string
          name: string
          description?: string | null
          status?: 'planning' | 'in-progress' | 'review' | 'completed' | 'cancelled'
          progress?: number
          start_date?: string | null
          end_date?: string | null
          budget?: number | null
          created_at?: string
          updated_at?: string
          metadata?: Json | null
        }
        Update: {
          id?: string
          client_id?: string
          name?: string
          description?: string | null
          status?: 'planning' | 'in-progress' | 'review' | 'completed' | 'cancelled'
          progress?: number
          start_date?: string | null
          end_date?: string | null
          budget?: number | null
          created_at?: string
          updated_at?: string
          metadata?: Json | null
        }
      }
      project_files: {
        Row: {
          id: string
          project_id: string
          name: string
          file_path: string
          file_size: number
          file_type: string
          category: 'deliverable' | 'asset' | 'document' | 'feedback' | 'other'
          uploaded_by: string
          is_client_visible: boolean
          download_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          file_path: string
          file_size: number
          file_type: string
          category?: 'deliverable' | 'asset' | 'document' | 'feedback' | 'other'
          uploaded_by: string
          is_client_visible?: boolean
          download_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          category?: 'deliverable' | 'asset' | 'document' | 'feedback' | 'other'
          uploaded_by?: string
          is_client_visible?: boolean
          download_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      client_invoices: {
        Row: {
          id: string
          client_id: string
          project_id: string | null
          invoice_number: string
          amount: number
          currency: string
          status: 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled'
          due_date: string
          paid_date: string | null
          stripe_payment_intent_id: string | null
          line_items: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          project_id?: string | null
          invoice_number: string
          amount: number
          currency?: string
          status?: 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled'
          due_date: string
          paid_date?: string | null
          stripe_payment_intent_id?: string | null
          line_items: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          project_id?: string | null
          invoice_number?: string
          amount?: number
          currency?: string
          status?: 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled'
          due_date?: string
          paid_date?: string | null
          stripe_payment_intent_id?: string | null
          line_items?: Json
          created_at?: string
          updated_at?: string
        }
      }
      support_tickets: {
        Row: {
          id: string
          client_id: string
          project_id: string | null
          title: string
          description: string
          status: 'open' | 'in-progress' | 'waiting-client' | 'resolved' | 'closed'
          priority: 'low' | 'medium' | 'high' | 'urgent'
          category: 'bug' | 'feature' | 'support' | 'billing' | 'other'
          assigned_to: string | null
          resolution: string | null
          created_at: string
          updated_at: string
          resolved_at: string | null
        }
        Insert: {
          id?: string
          client_id: string
          project_id?: string | null
          title: string
          description: string
          status?: 'open' | 'in-progress' | 'waiting-client' | 'resolved' | 'closed'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          category?: 'bug' | 'feature' | 'support' | 'billing' | 'other'
          assigned_to?: string | null
          resolution?: string | null
          created_at?: string
          updated_at?: string
          resolved_at?: string | null
        }
        Update: {
          id?: string
          client_id?: string
          project_id?: string | null
          title?: string
          description?: string
          status?: 'open' | 'in-progress' | 'waiting-client' | 'resolved' | 'closed'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          category?: 'bug' | 'feature' | 'support' | 'billing' | 'other'
          assigned_to?: string | null
          resolution?: string | null
          created_at?: string
          updated_at?: string
          resolved_at?: string | null
        }
      }
      project_feedback: {
        Row: {
          id: string
          project_id: string
          client_id: string
          item_type: 'project' | 'file' | 'milestone'
          item_id: string
          feedback_text: string
          status: 'pending' | 'approved' | 'rejected' | 'revision'
          rating: number | null
          created_at: string
          updated_at: string
          response: string | null
          responded_by: string | null
          responded_at: string | null
        }
        Insert: {
          id?: string
          project_id: string
          client_id: string
          item_type: 'project' | 'file' | 'milestone'
          item_id: string
          feedback_text: string
          status?: 'pending' | 'approved' | 'rejected' | 'revision'
          rating?: number | null
          created_at?: string
          updated_at?: string
          response?: string | null
          responded_by?: string | null
          responded_at?: string | null
        }
        Update: {
          id?: string
          project_id?: string
          client_id?: string
          item_type?: 'project' | 'file' | 'milestone'
          item_id?: string
          feedback_text?: string
          status?: 'pending' | 'approved' | 'rejected' | 'revision'
          rating?: number | null
          created_at?: string
          updated_at?: string
          response?: string | null
          responded_by?: string | null
          responded_at?: string | null
        }
      }
      chat_rooms: {
        Row: {
          id: string
          name: string
          type: 'project' | 'support' | 'general'
          project_id: string | null
          participants: string[]
          created_at: string
          updated_at: string
          last_message_at: string | null
        }
        Insert: {
          id?: string
          name: string
          type: 'project' | 'support' | 'general'
          project_id?: string | null
          participants: string[]
          created_at?: string
          updated_at?: string
          last_message_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          type?: 'project' | 'support' | 'general'
          project_id?: string | null
          participants?: string[]
          created_at?: string
          updated_at?: string
          last_message_at?: string | null
        }
      }
      chat_messages: {
        Row: {
          id: string
          room_id: string
          user_id: string
          message: string
          message_type: 'text' | 'file' | 'system'
          file_url: string | null
          created_at: string
          updated_at: string
          edited_at: string | null
        }
        Insert: {
          id?: string
          room_id: string
          user_id: string
          message: string
          message_type?: 'text' | 'file' | 'system'
          file_url?: string | null
          created_at?: string
          updated_at?: string
          edited_at?: string | null
        }
        Update: {
          id?: string
          room_id?: string
          user_id?: string
          message?: string
          message_type?: 'text' | 'file' | 'system'
          file_url?: string | null
          created_at?: string
          updated_at?: string
          edited_at?: string | null
        }
      }
      kb_articles: {
        Row: {
          id: string
          title: string
          content: string
          category: string
          tags: string[]
          is_published: boolean
          client_visible: boolean
          created_at: string
          updated_at: string
          view_count: number
          helpful_count: number
        }
        Insert: {
          id?: string
          title: string
          content: string
          category: string
          tags?: string[]
          is_published?: boolean
          client_visible?: boolean
          created_at?: string
          updated_at?: string
          view_count?: number
          helpful_count?: number
        }
        Update: {
          id?: string
          title?: string
          content?: string
          category?: string
          tags?: string[]
          is_published?: boolean
          client_visible?: boolean
          created_at?: string
          updated_at?: string
          view_count?: number
          helpful_count?: number
        }
      }
      client_notifications: {
        Row: {
          id: string
          client_id: string
          title: string
          message: string
          type: 'project' | 'invoice' | 'support' | 'system'
          data: Json | null
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          title: string
          message: string
          type: 'project' | 'invoice' | 'support' | 'system'
          data?: Json | null
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          title?: string
          message?: string
          type?: 'project' | 'invoice' | 'support' | 'system'
          data?: Json | null
          is_read?: boolean
          created_at?: string
        }
      }
      client_settings: {
        Row: {
          id: string
          client_id: string
          theme: 'light' | 'dark' | 'system'
          language: string
          timezone: string
          email_notifications: Json
          brand_settings: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          theme?: 'light' | 'dark' | 'system'
          language?: string
          timezone?: string
          email_notifications?: Json
          brand_settings?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          theme?: 'light' | 'dark' | 'system'
          language?: string
          timezone?: string
          email_notifications?: Json
          brand_settings?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          role: 'client' | 'admin' | 'team'
          company_name: string | null
          phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          role?: 'client' | 'admin' | 'team'
          company_name?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          role?: 'client' | 'admin' | 'team'
          company_name?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}