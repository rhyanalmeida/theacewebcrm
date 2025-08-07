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
      users: {
        Row: {
          id: string
          email: string
          first_name: string
          last_name: string
          role: 'admin' | 'manager' | 'agent' | 'client'
          is_active: boolean
          avatar_url: string | null
          phone: string | null
          department: string | null
          hire_date: string | null
          last_login: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          first_name: string
          last_name: string
          role?: 'admin' | 'manager' | 'agent' | 'client'
          is_active?: boolean
          avatar_url?: string | null
          phone?: string | null
          department?: string | null
          hire_date?: string | null
          last_login?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          first_name?: string
          last_name?: string
          role?: 'admin' | 'manager' | 'agent' | 'client'
          is_active?: boolean
          avatar_url?: string | null
          phone?: string | null
          department?: string | null
          hire_date?: string | null
          last_login?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      leads: {
        Row: {
          id: string
          first_name: string
          last_name: string
          email: string
          phone: string | null
          company: string | null
          website: string | null
          source: string | null
          status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost'
          score: number | null
          notes: string | null
          assigned_to: string | null
          expected_value: number | null
          expected_close_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          first_name: string
          last_name: string
          email: string
          phone?: string | null
          company?: string | null
          website?: string | null
          source?: string | null
          status?: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost'
          score?: number | null
          notes?: string | null
          assigned_to?: string | null
          expected_value?: number | null
          expected_close_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          first_name?: string
          last_name?: string
          email?: string
          phone?: string | null
          company?: string | null
          website?: string | null
          source?: string | null
          status?: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost'
          score?: number | null
          notes?: string | null
          assigned_to?: string | null
          expected_value?: number | null
          expected_close_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      contacts: {
        Row: {
          id: string
          first_name: string
          last_name: string
          email: string
          phone: string | null
          company_id: string | null
          position: string | null
          is_primary: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          first_name: string
          last_name: string
          email: string
          phone?: string | null
          company_id?: string | null
          position?: string | null
          is_primary?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          first_name?: string
          last_name?: string
          email?: string
          phone?: string | null
          company_id?: string | null
          position?: string | null
          is_primary?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      companies: {
        Row: {
          id: string
          name: string
          domain: string | null
          industry: string | null
          size: string | null
          annual_revenue: number | null
          address: Json | null
          phone: string | null
          website: string | null
          logo_url: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          domain?: string | null
          industry?: string | null
          size?: string | null
          annual_revenue?: number | null
          address?: Json | null
          phone?: string | null
          website?: string | null
          logo_url?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          domain?: string | null
          industry?: string | null
          size?: string | null
          annual_revenue?: number | null
          address?: Json | null
          phone?: string | null
          website?: string | null
          logo_url?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      deals: {
        Row: {
          id: string
          title: string
          description: string | null
          value: number
          stage: 'prospecting' | 'qualification' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost'
          probability: number
          expected_close_date: string | null
          company_id: string | null
          contact_id: string | null
          assigned_to: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          value: number
          stage?: 'prospecting' | 'qualification' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost'
          probability?: number
          expected_close_date?: string | null
          company_id?: string | null
          contact_id?: string | null
          assigned_to?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          value?: number
          stage?: 'prospecting' | 'qualification' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost'
          probability?: number
          expected_close_date?: string | null
          company_id?: string | null
          contact_id?: string | null
          assigned_to?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          name: string
          description: string | null
          status: 'planning' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled'
          priority: 'low' | 'medium' | 'high' | 'urgent'
          start_date: string | null
          due_date: string | null
          completion_date: string | null
          budget: number | null
          actual_cost: number | null
          company_id: string | null
          assigned_to: string | null
          created_by: string
          progress: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          status?: 'planning' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          start_date?: string | null
          due_date?: string | null
          completion_date?: string | null
          budget?: number | null
          actual_cost?: number | null
          company_id?: string | null
          assigned_to?: string | null
          created_by: string
          progress?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          status?: 'planning' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          start_date?: string | null
          due_date?: string | null
          completion_date?: string | null
          budget?: number | null
          actual_cost?: number | null
          company_id?: string | null
          assigned_to?: string | null
          created_by?: string
          progress?: number
          created_at?: string
          updated_at?: string
        }
      }
      invoices: {
        Row: {
          id: string
          invoice_number: string
          client_id: string
          project_id: string | null
          status: 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled'
          subtotal: number
          tax_rate: number
          tax_amount: number
          total: number
          currency: string
          issue_date: string
          due_date: string
          paid_date: string | null
          payment_terms: string | null
          notes: string | null
          stripe_payment_intent_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          invoice_number: string
          client_id: string
          project_id?: string | null
          status?: 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled'
          subtotal: number
          tax_rate?: number
          tax_amount?: number
          total: number
          currency?: string
          issue_date: string
          due_date: string
          paid_date?: string | null
          payment_terms?: string | null
          notes?: string | null
          stripe_payment_intent_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          invoice_number?: string
          client_id?: string
          project_id?: string | null
          status?: 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled'
          subtotal?: number
          tax_rate?: number
          tax_amount?: number
          total?: number
          currency?: string
          issue_date?: string
          due_date?: string
          paid_date?: string | null
          payment_terms?: string | null
          notes?: string | null
          stripe_payment_intent_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          invoice_id: string
          amount: number
          currency: string
          method: 'credit_card' | 'bank_transfer' | 'cash' | 'check' | 'other'
          status: 'pending' | 'completed' | 'failed' | 'refunded'
          stripe_payment_intent_id: string | null
          transaction_id: string | null
          processed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          invoice_id: string
          amount: number
          currency?: string
          method?: 'credit_card' | 'bank_transfer' | 'cash' | 'check' | 'other'
          status?: 'pending' | 'completed' | 'failed' | 'refunded'
          stripe_payment_intent_id?: string | null
          transaction_id?: string | null
          processed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          invoice_id?: string
          amount?: number
          currency?: string
          method?: 'credit_card' | 'bank_transfer' | 'cash' | 'check' | 'other'
          status?: 'pending' | 'completed' | 'failed' | 'refunded'
          stripe_payment_intent_id?: string | null
          transaction_id?: string | null
          processed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      files: {
        Row: {
          id: string
          filename: string
          original_name: string
          mime_type: string
          size: number
          path: string
          url: string | null
          related_type: 'lead' | 'contact' | 'company' | 'deal' | 'project' | 'invoice' | 'user'
          related_id: string | null
          uploaded_by: string
          is_public: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          filename: string
          original_name: string
          mime_type: string
          size: number
          path: string
          url?: string | null
          related_type?: 'lead' | 'contact' | 'company' | 'deal' | 'project' | 'invoice' | 'user'
          related_id?: string | null
          uploaded_by: string
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          filename?: string
          original_name?: string
          mime_type?: string
          size?: number
          path?: string
          url?: string | null
          related_type?: 'lead' | 'contact' | 'company' | 'deal' | 'project' | 'invoice' | 'user'
          related_id?: string | null
          uploaded_by?: string
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      email_templates: {
        Row: {
          id: string
          name: string
          subject: string
          body: string
          type: 'welcome' | 'password_reset' | 'invoice' | 'notification' | 'marketing' | 'custom'
          is_active: boolean
          variables: Json | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          subject: string
          body: string
          type?: 'welcome' | 'password_reset' | 'invoice' | 'notification' | 'marketing' | 'custom'
          is_active?: boolean
          variables?: Json | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          subject?: string
          body?: string
          type?: 'welcome' | 'password_reset' | 'invoice' | 'notification' | 'marketing' | 'custom'
          is_active?: boolean
          variables?: Json | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      activities: {
        Row: {
          id: string
          type: 'call' | 'email' | 'meeting' | 'note' | 'task' | 'file' | 'payment'
          title: string
          description: string | null
          related_type: 'lead' | 'contact' | 'company' | 'deal' | 'project' | 'invoice'
          related_id: string
          user_id: string
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          type: 'call' | 'email' | 'meeting' | 'note' | 'task' | 'file' | 'payment'
          title: string
          description?: string | null
          related_type: 'lead' | 'contact' | 'company' | 'deal' | 'project' | 'invoice'
          related_id: string
          user_id: string
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          type?: 'call' | 'email' | 'meeting' | 'note' | 'task' | 'file' | 'payment'
          title?: string
          description?: string | null
          related_type?: 'lead' | 'contact' | 'company' | 'deal' | 'project' | 'invoice'
          related_id?: string
          user_id?: string
          metadata?: Json | null
          created_at?: string
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
  }
}