import { Request, Response } from 'express';
import { supabase, supabaseAdmin } from '../config/supabase';
import { logger } from '../config/logger';

export class SupabaseContactController {
  
  // Get all contacts with pagination and filters
  async getContacts(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const search = req.query.search as string;
      const status = req.query.status as string;
      const company_id = req.query.company_id as string;
      const owner_id = req.query.owner_id as string;

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
      if (search) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
      }

      if (status) {
        query = query.eq('status', status);
      }

      if (company_id) {
        query = query.eq('company_id', company_id);
      }

      if (owner_id) {
        query = query.eq('owner_id', owner_id);
      }

      const { data, error, count } = await query;

      if (error) {
        logger.error('Get contacts error:', error);
        return res.status(400).json({
          success: false,
          error: 'Failed to fetch contacts',
          details: error.message
        });
      }

      res.json({
        success: true,
        data: {
          contacts: data,
          pagination: {
            page,
            limit,
            total: count || 0,
            totalPages: Math.ceil((count || 0) / limit)
          }
        }
      });
    } catch (error: any) {
      logger.error('Get contacts controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  // Get single contact by ID
  async getContact(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

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
          return res.status(404).json({
            success: false,
            error: 'Contact not found'
          });
        }
        logger.error('Get contact error:', error);
        return res.status(400).json({
          success: false,
          error: 'Failed to fetch contact',
          details: error.message
        });
      }

      res.json({
        success: true,
        data: data
      });
    } catch (error: any) {
      logger.error('Get contact controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  // Create new contact
  async createContact(req: Request, res: Response): Promise<void> {
    try {
      const contactData = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      // Add audit fields
      const newContact = {
        ...contactData,
        owner_id: contactData.owner_id || userId,
        created_by: userId
      };

      const { data, error } = await supabase
        .from('contacts')
        .insert([newContact])
        .select(`
          *,
          company:companies(id, name, website),
          owner:users!owner_id(id, first_name, last_name, email)
        `)
        .single();

      if (error) {
        logger.error('Create contact error:', error);
        return res.status(400).json({
          success: false,
          error: 'Failed to create contact',
          details: error.message
        });
      }

      logger.info('Contact created successfully:', { id: data.id, created_by: userId });

      res.status(201).json({
        success: true,
        data: data,
        message: 'Contact created successfully'
      });
    } catch (error: any) {
      logger.error('Create contact controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  // Update contact
  async updateContact(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates = req.body;

      const { data, error } = await supabase
        .from('contacts')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          company:companies(id, name, website),
          owner:users!owner_id(id, first_name, last_name, email)
        `)
        .single();

      if (error) {
        logger.error('Update contact error:', error);
        return res.status(400).json({
          success: false,
          error: 'Failed to update contact',
          details: error.message
        });
      }

      logger.info('Contact updated successfully:', { id });

      res.json({
        success: true,
        data: data,
        message: 'Contact updated successfully'
      });
    } catch (error: any) {
      logger.error('Update contact controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  // Delete contact
  async deleteContact(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id);

      if (error) {
        logger.error('Delete contact error:', error);
        return res.status(400).json({
          success: false,
          error: 'Failed to delete contact',
          details: error.message
        });
      }

      logger.info('Contact deleted successfully:', { id });

      res.json({
        success: true,
        message: 'Contact deleted successfully'
      });
    } catch (error: any) {
      logger.error('Delete contact controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  // Bulk operations
  async bulkCreateContacts(req: Request, res: Response): Promise<void> {
    try {
      const { contacts } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      if (!Array.isArray(contacts) || contacts.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No contacts provided'
        });
      }

      // Add audit fields to all contacts
      const contactsData = contacts.map(contact => ({
        ...contact,
        owner_id: contact.owner_id || userId,
        created_by: userId
      }));

      const { data, error } = await supabase
        .from('contacts')
        .insert(contactsData)
        .select();

      if (error) {
        logger.error('Bulk create contacts error:', error);
        return res.status(400).json({
          success: false,
          error: 'Failed to create contacts',
          details: error.message
        });
      }

      logger.info('Bulk contacts created successfully:', { 
        count: data.length, 
        created_by: userId 
      });

      res.status(201).json({
        success: true,
        data: data,
        message: `${data.length} contacts created successfully`
      });
    } catch (error: any) {
      logger.error('Bulk create contacts controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  async bulkDeleteContacts(req: Request, res: Response): Promise<void> {
    try {
      const { ids } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No contact IDs provided'
        });
      }

      const { error } = await supabase
        .from('contacts')
        .delete()
        .in('id', ids);

      if (error) {
        logger.error('Bulk delete contacts error:', error);
        return res.status(400).json({
          success: false,
          error: 'Failed to delete contacts',
          details: error.message
        });
      }

      logger.info('Bulk contacts deleted successfully:', { count: ids.length });

      res.json({
        success: true,
        message: `${ids.length} contacts deleted successfully`
      });
    } catch (error: any) {
      logger.error('Bulk delete contacts controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  // Search contacts
  async searchContacts(req: Request, res: Response): Promise<void> {
    try {
      const { q: query } = req.query;
      const limit = parseInt(req.query.limit as string) || 20;

      if (!query || query.toString().length < 2) {
        return res.status(400).json({
          success: false,
          error: 'Search query must be at least 2 characters'
        });
      }

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
        return res.status(400).json({
          success: false,
          error: 'Failed to search contacts',
          details: error.message
        });
      }

      res.json({
        success: true,
        data: data,
        query: query.toString()
      });
    } catch (error: any) {
      logger.error('Search contacts controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  // Get contact statistics
  async getContactStats(req: Request, res: Response): Promise<void> {
    try {
      const [totalResult, statusResult, sourceResult, recentResult] = await Promise.all([
        // Total count
        supabase
          .from('contacts')
          .select('id', { count: 'exact', head: true }),
        
        // By status
        supabase
          .from('contacts')
          .select('status')
          .neq('status', null),
        
        // By lead source
        supabase
          .from('contacts')
          .select('lead_source')
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
        statusResult.data.forEach((item: any) => {
          by_status[item.status] = (by_status[item.status] || 0) + 1;
        });
      }

      // Process lead source data
      const by_lead_source: Record<string, number> = {};
      if (sourceResult.data) {
        sourceResult.data.forEach((item: any) => {
          if (item.lead_source) {
            by_lead_source[item.lead_source] = (by_lead_source[item.lead_source] || 0) + 1;
          }
        });
      }

      res.json({
        success: true,
        data: {
          total,
          by_status,
          by_lead_source,
          recent_count,
          growth_rate: total > 0 ? ((recent_count / total) * 100).toFixed(2) : 0
        }
      });
    } catch (error: any) {
      logger.error('Get contact stats controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }

  // Export contacts
  async exportContacts(req: Request, res: Response): Promise<void> {
    try {
      const search = req.query.search as string;
      const status = req.query.status as string;
      const company_id = req.query.company_id as string;
      const owner_id = req.query.owner_id as string;
      const format = req.query.format as string || 'json';

      let query = supabase
        .from('contacts')
        .select(`
          *,
          company:companies(id, name, website),
          owner:users!owner_id(id, first_name, last_name, email)
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (search) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
      }

      if (status) {
        query = query.eq('status', status);
      }

      if (company_id) {
        query = query.eq('company_id', company_id);
      }

      if (owner_id) {
        query = query.eq('owner_id', owner_id);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Export contacts error:', error);
        return res.status(400).json({
          success: false,
          error: 'Failed to export contacts',
          details: error.message
        });
      }

      if (format === 'csv') {
        // Convert to CSV
        const csvHeaders = [
          'ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Title', 
          'Company', 'Status', 'Lead Source', 'Created At'
        ];
        
        const csvRows = data.map((contact: any) => [
          contact.id,
          contact.first_name,
          contact.last_name,
          contact.email || '',
          contact.phone || '',
          contact.title || '',
          contact.company?.name || '',
          contact.status,
          contact.lead_source || '',
          contact.created_at
        ]);

        const csvContent = [csvHeaders, ...csvRows]
          .map(row => row.map(field => `"${field}"`).join(','))
          .join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=contacts_export.csv');
        res.send(csvContent);
      } else {
        res.json({
          success: true,
          data: data,
          exported_at: new Date().toISOString(),
          count: data.length
        });
      }

      logger.info('Contacts exported successfully:', { 
        count: data.length, 
        format,
        filters: { search, status, company_id, owner_id }
      });
    } catch (error: any) {
      logger.error('Export contacts controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    }
  }
}