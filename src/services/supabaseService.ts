import { supabase, supabaseAdmin } from '../config/supabase';
import { CustomError } from '../middleware/errorHandler';
import { Database } from '../config/supabase';

export class SupabaseService {
  // Generic CRUD operations
  static async findAll<T>(
    table: keyof Database['public']['Tables'],
    filters?: Record<string, any>,
    page: number = 1,
    limit: number = 20,
    sortBy: string = 'created_at',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<{ data: T[]; count: number }> {
    try {
      let query = supabase
        .from(table as any)
        .select('*', { count: 'exact' });

      // Apply filters
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            if (typeof value === 'string' && key.includes('search')) {
              query = query.ilike(key.replace('_search', ''), `%${value}%`);
            } else {
              query = query.eq(key, value);
            }
          }
        });
      }

      // Apply pagination and sorting
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      query = query
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(from, to);

      const { data, error, count } = await query;

      if (error) {
        throw new CustomError(`Failed to fetch ${table}: ${error.message}`, 500);
      }

      return { data: data as T[], count: count || 0 };
    } catch (error) {
      throw error instanceof CustomError ? error : new CustomError(`Database operation failed`, 500);
    }
  }

  static async findById<T>(
    table: keyof Database['public']['Tables'],
    id: string
  ): Promise<T | null> {
    try {
      const { data, error } = await supabase
        .from(table as any)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // Not found
          return null;
        }
        throw new CustomError(`Failed to fetch ${table}: ${error.message}`, 500);
      }

      return data as T;
    } catch (error) {
      throw error instanceof CustomError ? error : new CustomError(`Database operation failed`, 500);
    }
  }

  static async create<T>(
    table: keyof Database['public']['Tables'],
    data: Record<string, any>
  ): Promise<T> {
    try {
      const { data: result, error } = await supabase
        .from(table as any)
        .insert(data)
        .select()
        .single();

      if (error) {
        throw new CustomError(`Failed to create ${table}: ${error.message}`, 400);
      }

      return result as T;
    } catch (error) {
      throw error instanceof CustomError ? error : new CustomError(`Database operation failed`, 500);
    }
  }

  static async update<T>(
    table: keyof Database['public']['Tables'],
    id: string,
    data: Record<string, any>
  ): Promise<T> {
    try {
      const updateData = {
        ...data,
        updated_at: new Date().toISOString()
      };

      const { data: result, error } = await supabase
        .from(table as any)
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new CustomError(`Failed to update ${table}: ${error.message}`, 400);
      }

      return result as T;
    } catch (error) {
      throw error instanceof CustomError ? error : new CustomError(`Database operation failed`, 500);
    }
  }

  static async delete(
    table: keyof Database['public']['Tables'],
    id: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from(table as any)
        .delete()
        .eq('id', id);

      if (error) {
        throw new CustomError(`Failed to delete ${table}: ${error.message}`, 400);
      }
    } catch (error) {
      throw error instanceof CustomError ? error : new CustomError(`Database operation failed`, 500);
    }
  }

  // Activity logging
  static async logActivity(
    type: 'call' | 'email' | 'meeting' | 'note' | 'task' | 'file' | 'payment',
    title: string,
    relatedType: 'lead' | 'contact' | 'company' | 'deal' | 'project' | 'invoice',
    relatedId: string,
    userId: string,
    description?: string,
    metadata?: any
  ): Promise<void> {
    try {
      await supabase
        .from('activities')
        .insert({
          type,
          title,
          description,
          related_type: relatedType,
          related_id: relatedId,
          user_id: userId,
          metadata
        });
    } catch (error) {
      // Log error but don't fail the main operation
      console.error('Failed to log activity:', error);
    }
  }

  // Search functionality
  static async search<T>(
    table: keyof Database['public']['Tables'],
    searchTerm: string,
    searchFields: string[] = ['name', 'title', 'first_name', 'last_name', 'email'],
    limit: number = 50
  ): Promise<T[]> {
    try {
      let query = supabase
        .from(table as any)
        .select('*')
        .limit(limit);

      // Build search query - OR conditions for each field
      const orConditions = searchFields.map(field => `${field}.ilike.%${searchTerm}%`).join(',');
      query = query.or(orConditions);

      const { data, error } = await query;

      if (error) {
        throw new CustomError(`Search failed: ${error.message}`, 500);
      }

      return data as T[];
    } catch (error) {
      throw error instanceof CustomError ? error : new CustomError(`Search operation failed`, 500);
    }
  }

  // Batch operations
  static async batchCreate<T>(
    table: keyof Database['public']['Tables'],
    dataArray: Record<string, any>[]
  ): Promise<T[]> {
    try {
      const { data, error } = await supabase
        .from(table as any)
        .insert(dataArray)
        .select();

      if (error) {
        throw new CustomError(`Batch create failed: ${error.message}`, 400);
      }

      return data as T[];
    } catch (error) {
      throw error instanceof CustomError ? error : new CustomError(`Batch operation failed`, 500);
    }
  }

  // Statistics helpers
  static async getCount(
    table: keyof Database['public']['Tables'],
    filters?: Record<string, any>
  ): Promise<number> {
    try {
      let query = supabase
        .from(table as any)
        .select('*', { count: 'exact', head: true });

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        });
      }

      const { count, error } = await query;

      if (error) {
        throw new CustomError(`Count failed: ${error.message}`, 500);
      }

      return count || 0;
    } catch (error) {
      throw error instanceof CustomError ? error : new CustomError(`Count operation failed`, 500);
    }
  }

  // Relationship helpers
  static async findWithRelations<T>(
    table: keyof Database['public']['Tables'],
    id: string,
    relations: string[]
  ): Promise<T | null> {
    try {
      const selectFields = ['*', ...relations].join(', ');
      
      const { data, error } = await supabase
        .from(table as any)
        .select(selectFields)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // Not found
          return null;
        }
        throw new CustomError(`Failed to fetch ${table} with relations: ${error.message}`, 500);
      }

      return data as T;
    } catch (error) {
      throw error instanceof CustomError ? error : new CustomError(`Database operation failed`, 500);
    }
  }
}