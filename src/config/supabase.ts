import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from './logger';

// Type definitions for our database schema
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          first_name: string;
          last_name: string;
          phone?: string;
          avatar_url?: string;
          timezone: string;
          language: string;
          status: 'active' | 'inactive' | 'suspended';
          email_verified: boolean;
          last_login_at?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          first_name: string;
          last_name: string;
          phone?: string;
          avatar_url?: string;
          timezone?: string;
          language?: string;
          status?: 'active' | 'inactive' | 'suspended';
          email_verified?: boolean;
          last_login_at?: string;
        };
        Update: {
          email?: string;
          first_name?: string;
          last_name?: string;
          phone?: string;
          avatar_url?: string;
          timezone?: string;
          language?: string;
          status?: 'active' | 'inactive' | 'suspended';
          email_verified?: boolean;
          last_login_at?: string;
        };
      };
      companies: {
        Row: {
          id: string;
          name: string;
          legal_name?: string;
          website?: string;
          industry?: string;
          company_size?: string;
          annual_revenue?: number;
          description?: string;
          logo_url?: string;
          address?: any;
          social_media?: any;
          status: 'active' | 'inactive' | 'prospect';
          owner_id?: string;
          created_by?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          legal_name?: string;
          website?: string;
          industry?: string;
          company_size?: string;
          annual_revenue?: number;
          description?: string;
          logo_url?: string;
          address?: any;
          social_media?: any;
          status?: 'active' | 'inactive' | 'prospect';
          owner_id?: string;
          created_by?: string;
        };
        Update: {
          name?: string;
          legal_name?: string;
          website?: string;
          industry?: string;
          company_size?: string;
          annual_revenue?: number;
          description?: string;
          logo_url?: string;
          address?: any;
          social_media?: any;
          status?: 'active' | 'inactive' | 'prospect';
          owner_id?: string;
        };
      };
      contacts: {
        Row: {
          id: string;
          company_id?: string;
          email?: string;
          first_name: string;
          last_name: string;
          title?: string;
          department?: string;
          phone?: string;
          mobile_phone?: string;
          avatar_url?: string;
          linkedin_url?: string;
          address?: any;
          birthday?: string;
          notes?: string;
          status: 'active' | 'inactive' | 'unqualified';
          lead_source?: string;
          owner_id?: string;
          created_by?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id?: string;
          email?: string;
          first_name: string;
          last_name: string;
          title?: string;
          department?: string;
          phone?: string;
          mobile_phone?: string;
          avatar_url?: string;
          linkedin_url?: string;
          address?: any;
          birthday?: string;
          notes?: string;
          status?: 'active' | 'inactive' | 'unqualified';
          lead_source?: string;
          owner_id?: string;
          created_by?: string;
        };
        Update: {
          company_id?: string;
          email?: string;
          first_name?: string;
          last_name?: string;
          title?: string;
          department?: string;
          phone?: string;
          mobile_phone?: string;
          avatar_url?: string;
          linkedin_url?: string;
          address?: any;
          birthday?: string;
          notes?: string;
          status?: 'active' | 'inactive' | 'unqualified';
          lead_source?: string;
          owner_id?: string;
        };
      };
      leads: {
        Row: {
          id: string;
          contact_id?: string;
          company_id?: string;
          title: string;
          description?: string;
          status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
          priority: 'low' | 'medium' | 'high' | 'urgent';
          lead_source?: string;
          estimated_value?: number;
          estimated_close_date?: string;
          probability: number;
          next_action?: string;
          next_action_date?: string;
          owner_id?: string;
          created_by?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          contact_id?: string;
          company_id?: string;
          title: string;
          description?: string;
          status?: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
          priority?: 'low' | 'medium' | 'high' | 'urgent';
          lead_source?: string;
          estimated_value?: number;
          estimated_close_date?: string;
          probability?: number;
          next_action?: string;
          next_action_date?: string;
          owner_id?: string;
          created_by?: string;
        };
        Update: {
          contact_id?: string;
          company_id?: string;
          title?: string;
          description?: string;
          status?: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
          priority?: 'low' | 'medium' | 'high' | 'urgent';
          lead_source?: string;
          estimated_value?: number;
          estimated_close_date?: string;
          probability?: number;
          next_action?: string;
          next_action_date?: string;
          owner_id?: string;
        };
      };
      deals: {
        Row: {
          id: string;
          lead_id?: string;
          contact_id?: string;
          company_id?: string;
          title: string;
          description?: string;
          deal_type?: string;
          stage: 'discovery' | 'proposal' | 'negotiation' | 'contract' | 'project' | 'completed' | 'lost';
          value: number;
          currency: string;
          close_date?: string;
          probability: number;
          next_action?: string;
          next_action_date?: string;
          won_reason?: string;
          lost_reason?: string;
          competitor?: string;
          owner_id?: string;
          created_by?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          lead_id?: string;
          contact_id?: string;
          company_id?: string;
          title: string;
          description?: string;
          deal_type?: string;
          stage?: 'discovery' | 'proposal' | 'negotiation' | 'contract' | 'project' | 'completed' | 'lost';
          value: number;
          currency?: string;
          close_date?: string;
          probability?: number;
          next_action?: string;
          next_action_date?: string;
          won_reason?: string;
          lost_reason?: string;
          competitor?: string;
          owner_id?: string;
          created_by?: string;
        };
        Update: {
          lead_id?: string;
          contact_id?: string;
          company_id?: string;
          title?: string;
          description?: string;
          deal_type?: string;
          stage?: 'discovery' | 'proposal' | 'negotiation' | 'contract' | 'project' | 'completed' | 'lost';
          value?: number;
          currency?: string;
          close_date?: string;
          probability?: number;
          next_action?: string;
          next_action_date?: string;
          won_reason?: string;
          lost_reason?: string;
          competitor?: string;
          owner_id?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          deal_id?: string;
          company_id?: string;
          contact_id?: string;
          name: string;
          description?: string;
          project_type?: string;
          status: 'planned' | 'active' | 'on_hold' | 'completed' | 'cancelled';
          priority: 'low' | 'medium' | 'high' | 'urgent';
          start_date?: string;
          due_date?: string;
          completion_date?: string;
          budget?: number;
          hours_estimated?: number;
          hours_actual?: number;
          project_manager_id?: string;
          team_members?: string[];
          tags?: string[];
          custom_fields?: any;
          created_by?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          deal_id?: string;
          company_id?: string;
          contact_id?: string;
          name: string;
          description?: string;
          project_type?: string;
          status?: 'planned' | 'active' | 'on_hold' | 'completed' | 'cancelled';
          priority?: 'low' | 'medium' | 'high' | 'urgent';
          start_date?: string;
          due_date?: string;
          completion_date?: string;
          budget?: number;
          hours_estimated?: number;
          hours_actual?: number;
          project_manager_id?: string;
          team_members?: string[];
          tags?: string[];
          custom_fields?: any;
          created_by?: string;
        };
        Update: {
          deal_id?: string;
          company_id?: string;
          contact_id?: string;
          name?: string;
          description?: string;
          project_type?: string;
          status?: 'planned' | 'active' | 'on_hold' | 'completed' | 'cancelled';
          priority?: 'low' | 'medium' | 'high' | 'urgent';
          start_date?: string;
          due_date?: string;
          completion_date?: string;
          budget?: number;
          hours_estimated?: number;
          hours_actual?: number;
          project_manager_id?: string;
          team_members?: string[];
          tags?: string[];
          custom_fields?: any;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

class SupabaseConfig {
  private static instance: SupabaseClient<Database>;
  private static adminClient: SupabaseClient<Database>;

  public static getClient(): SupabaseClient<Database> {
    if (!SupabaseConfig.instance) {
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Missing Supabase configuration. Please check your environment variables.');
      }

      SupabaseConfig.instance = createClient<Database>(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false
        },
        realtime: {
          params: {
            eventsPerSecond: 10
          }
        }
      });

      logger.info('Supabase client initialized successfully');
    }

    return SupabaseConfig.instance;
  }

  public static getAdminClient(): SupabaseClient<Database> {
    if (!SupabaseConfig.adminClient) {
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Missing Supabase admin configuration. Please check your environment variables.');
      }

      SupabaseConfig.adminClient = createClient<Database>(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });

      logger.info('Supabase admin client initialized successfully');
    }

    return SupabaseConfig.adminClient;
  }

  // Helper method to check connection
  public static async testConnection(): Promise<boolean> {
    try {
      const client = SupabaseConfig.getClient();
      const { data, error } = await client.from('users').select('count').single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned, which is OK for connection test
        logger.error('Supabase connection test failed:', error);
        return false;
      }
      
      logger.info('Supabase connection test successful');
      return true;
    } catch (error) {
      logger.error('Supabase connection test error:', error);
      return false;
    }
  }

  // Helper method for database health check
  public static async healthCheck(): Promise<{
    connected: boolean;
    latency?: number;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      const client = SupabaseConfig.getClient();
      await client.from('users').select('id').limit(1).single();
      
      const latency = Date.now() - startTime;
      return {
        connected: true,
        latency
      };
    } catch (error: any) {
      return {
        connected: false,
        error: error.message
      };
    }
  }
}

export const supabase = SupabaseConfig.getClient();
export const supabaseAdmin = SupabaseConfig.getAdminClient();
export default SupabaseConfig;