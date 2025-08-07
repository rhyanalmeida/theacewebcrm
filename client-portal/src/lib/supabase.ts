import { createClientComponentClient, createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

// Client-side Supabase client
export const createSupabaseClient = () =>
  createClientComponentClient<Database>()

// Server-side Supabase client
export const createSupabaseServerClient = () =>
  createServerComponentClient<Database>({ cookies })

// Service role client for admin operations
export const createSupabaseServiceClient = () =>
  createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )

// Client portal specific tables and RLS policies
export const CLIENT_TABLES = {
  projects: 'client_projects',
  files: 'project_files',
  invoices: 'client_invoices',
  payments: 'invoice_payments',
  tickets: 'support_tickets',
  messages: 'ticket_messages',
  feedback: 'project_feedback',
  knowledge_base: 'kb_articles',
  chat_rooms: 'chat_rooms',
  chat_messages: 'chat_messages',
  notifications: 'client_notifications',
  settings: 'client_settings',
} as const