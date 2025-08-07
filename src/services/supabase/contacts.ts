import { supabase } from '../../config/supabase';
import { logger } from '../../config/logger';
import { Database } from '../../config/supabase';

type Contact = Database['public']['Tables']['contacts']['Row'];
type ContactInsert = Database['public']['Tables']['contacts']['Insert'];
type ContactUpdate = Database['public']['Tables']['contacts']['Update'];

export interface ContactWithRelations extends Contact {
  company?: {
    id: string;
    name: string;
    website?: string;
  };
  owner?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  created_by_user?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export interface ContactsListResponse {
  contacts: ContactWithRelations[];
  total: number;
  page: number;
  limit: number;
}

export interface ContactFilters {
  search?: string;
  status?: 'active' | 'inactive' | 'unqualified';
  company_id?: string;
  owner_id?: string;
  lead_source?: string;
  tags?: string[];
}

class SupabaseContactsService {
  // =============================================
  // CRUD OPERATIONS
  // =============================================

  async getContacts(
    page = 1,
    limit = 50,
    filters: ContactFilters = {}
  ): Promise<ContactsListResponse> {
    try {
      const offset = (page - 1) * limit;
      
      let query = supabase
        .from('contacts')
        .select(`
          *,
          company:companies(id, name, website),
          owner:users!owner_id(id, first_name, last_name, email),
          created_by_user:users!created_by(id, first_name, last_name)
        `, { count: 'exact' })
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.search) {
        query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.company_id) {
        query = query.eq('company_id', filters.company_id);
      }

      if (filters.owner_id) {
        query = query.eq('owner_id', filters.owner_id);
      }

      if (filters.lead_source) {
        query = query.eq('lead_source', filters.lead_source);
      }

      const { data, error, count } = await query;

      if (error) {
        logger.error('Get contacts error:', error);
        return { contacts: [], total: 0, page, limit };
      }

      return {
        contacts: data as ContactWithRelations[],
        total: count || 0,
        page,
        limit
      };
    } catch (error) {
      logger.error('Get contacts service error:', error);
      return { contacts: [], total: 0, page, limit };
    }
  }

  async getContact(id: string): Promise<ContactWithRelations | null> {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select(`
          *,
          company:companies(id, name, website, industry),
          owner:users!owner_id(id, first_name, last_name, email),
          created_by_user:users!created_by(id, first_name, last_name)
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          logger.warn('Contact not found:', { id });
          return null;
        }
        logger.error('Get contact error:', error);
        return null;
      }

      return data as ContactWithRelations;
    } catch (error) {
      logger.error('Get contact service error:', error);
      return null;
    }
  }

  async createContact(contact: ContactInsert): Promise<Contact | null> {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      const contactData: ContactInsert = {
        ...contact,
        owner_id: contact.owner_id || user.id,
        created_by: user.id
      };

      const { data, error } = await supabase
        .from('contacts')
        .insert([contactData])
        .select()
        .single();

      if (error) {
        logger.error('Create contact error:', error);
        return null;
      }

      logger.info('Contact created successfully:', { id: data.id });
      return data;
    } catch (error) {
      logger.error('Create contact service error:', error);
      return null;
    }
  }

  async updateContact(id: string, updates: ContactUpdate): Promise<Contact | null> {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        logger.error('Update contact error:', error);
        return null;
      }

      logger.info('Contact updated successfully:', { id });
      return data;
    } catch (error) {
      logger.error('Update contact service error:', error);
      return null;
    }
  }

  async deleteContact(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id);

      if (error) {
        logger.error('Delete contact error:', error);
        return false;
      }

      logger.info('Contact deleted successfully:', { id });
      return true;
    } catch (error) {
      logger.error('Delete contact service error:', error);
      return false;
    }
  }

  // =============================================
  // BULK OPERATIONS
  // =============================================

  async createMultipleContacts(contacts: ContactInsert[]): Promise<Contact[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      const contactsData = contacts.map(contact => ({
        ...contact,
        owner_id: contact.owner_id || user.id,
        created_by: user.id
      }));

      const { data, error } = await supabase
        .from('contacts')
        .insert(contactsData)
        .select();

      if (error) {
        logger.error('Create multiple contacts error:', error);
        return [];
      }

      logger.info('Multiple contacts created successfully:', { count: data.length });
      return data;
    } catch (error) {
      logger.error('Create multiple contacts service error:', error);
      return [];
    }
  }

  async bulkUpdateContacts(updates: { id: string; data: ContactUpdate }[]): Promise<Contact[]> {
    try {
      const promises = updates.map(({ id, data }) => 
        supabase
          .from('contacts')
          .update(data)
          .eq('id', id)
          .select()
          .single()
      );

      const results = await Promise.allSettled(promises);
      const successful = results
        .filter(result => result.status === 'fulfilled')
        .map(result => (result as PromiseFulfilledResult<any>).value.data)
        .filter(data => data);

      logger.info('Bulk update contacts completed:', { 
        requested: updates.length, 
        successful: successful.length 
      });

      return successful;
    } catch (error) {
      logger.error('Bulk update contacts service error:', error);
      return [];
    }
  }

  async bulkDeleteContacts(ids: string[]): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .in('id', ids);

      if (error) {
        logger.error('Bulk delete contacts error:', error);
        return false;
      }

      logger.info('Bulk delete contacts successful:', { count: ids.length });
      return true;
    } catch (error) {
      logger.error('Bulk delete contacts service error:', error);
      return false;
    }
  }

  // =============================================
  // SEARCH AND FILTERING
  // =============================================

  async searchContacts(query: string, limit = 20): Promise<ContactWithRelations[]> {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select(`
          *,
          company:companies(id, name, website),
          owner:users!owner_id(id, first_name, last_name, email)
        `)
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(limit)
        .order('first_name');

      if (error) {
        logger.error('Search contacts error:', error);
        return [];
      }

      return data as ContactWithRelations[];
    } catch (error) {
      logger.error('Search contacts service error:', error);
      return [];
    }
  }

  async getContactsByOwner(ownerId: string, page = 1, limit = 50): Promise<ContactsListResponse> {
    return this.getContacts(page, limit, { owner_id: ownerId });
  }

  async getContactsByCompany(companyId: string, page = 1, limit = 50): Promise<ContactsListResponse> {
    return this.getContacts(page, limit, { company_id: companyId });
  }

  async getContactsByStatus(status: 'active' | 'inactive' | 'unqualified', page = 1, limit = 50): Promise<ContactsListResponse> {
    return this.getContacts(page, limit, { status });
  }

  // =============================================
  // STATISTICS AND ANALYTICS
  // =============================================

  async getContactsStats(): Promise<{
    total: number;
    by_status: Record<string, number>;
    by_lead_source: Record<string, number>;
    recent_count: number;
  }> {
    try {
      const [totalResult, statusResult, sourceResult, recentResult] = await Promise.all([
        // Total count
        supabase
          .from('contacts')
          .select('id', { count: 'exact', head: true }),
        
        // By status
        supabase
          .from('contacts')
          .select('status', { count: 'exact' })
          .neq('status', null),
        
        // By lead source
        supabase
          .from('contacts')
          .select('lead_source', { count: 'exact' })
          .neq('lead_source', null),
        
        // Recent (last 30 days)
        supabase
          .from('contacts')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      ]);

      const total = totalResult.count || 0;
      const recent_count = recentResult.count || 0;

      // Process status data
      const by_status: Record<string, number> = {};
      if (statusResult.data) {
        statusResult.data.forEach(item => {
          by_status[item.status] = (by_status[item.status] || 0) + 1;
        });
      }

      // Process lead source data
      const by_lead_source: Record<string, number> = {};
      if (sourceResult.data) {
        sourceResult.data.forEach(item => {
          if (item.lead_source) {
            by_lead_source[item.lead_source] = (by_lead_source[item.lead_source] || 0) + 1;
          }
        });
      }

      return {
        total,
        by_status,
        by_lead_source,
        recent_count
      };
    } catch (error) {
      logger.error('Get contacts stats service error:', error);
      return {
        total: 0,
        by_status: {},
        by_lead_source: {},
        recent_count: 0
      };
    }
  }

  // =============================================
  // DUPLICATE DETECTION
  // =============================================

  async findDuplicateContacts(email?: string, phone?: string): Promise<Contact[]> {
    try {
      if (!email && !phone) {
        return [];
      }

      let query = supabase.from('contacts').select('*');

      if (email && phone) {
        query = query.or(`email.eq.${email},phone.eq.${phone}`);
      } else if (email) {
        query = query.eq('email', email);
      } else if (phone) {
        query = query.eq('phone', phone);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Find duplicate contacts error:', error);
        return [];
      }

      return data;
    } catch (error) {
      logger.error('Find duplicate contacts service error:', error);
      return [];
    }
  }

  // =============================================
  // EXPORT/IMPORT
  // =============================================

  async exportContacts(filters: ContactFilters = {}): Promise<ContactWithRelations[]> {
    try {
      // Get all contacts without pagination for export
      let query = supabase
        .from('contacts')
        .select(`
          *,
          company:companies(id, name, website),
          owner:users!owner_id(id, first_name, last_name, email)
        `)
        .order('created_at', { ascending: false });

      // Apply filters (same as getContacts)
      if (filters.search) {
        query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.company_id) {
        query = query.eq('company_id', filters.company_id);
      }

      if (filters.owner_id) {
        query = query.eq('owner_id', filters.owner_id);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Export contacts error:', error);
        return [];
      }

      logger.info('Contacts exported successfully:', { count: data.length });
      return data as ContactWithRelations[];
    } catch (error) {
      logger.error('Export contacts service error:', error);
      return [];
    }
  }
}

export default new SupabaseContactsService();