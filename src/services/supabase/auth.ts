import { supabase, supabaseAdmin } from '../../config/supabase';
import { logger } from '../../config/logger';
import { AuthError, User, Session } from '@supabase/supabase-js';

export interface AuthResponse {
  user: User | null;
  session: Session | null;
  error: AuthError | null;
}

export interface UserProfile {
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
  role?: string;
}

export interface UserRole {
  id: string;
  name: string;
  description?: string;
  permissions: Record<string, any>;
}

class SupabaseAuthService {
  // =============================================
  // AUTHENTICATION METHODS
  // =============================================

  async signUp(email: string, password: string, metadata: {
    first_name: string;
    last_name: string;
    phone?: string;
  }): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: metadata.first_name,
            last_name: metadata.last_name,
            phone: metadata.phone
          }
        }
      });

      if (error) {
        logger.error('Sign up error:', error);
        return { user: null, session: null, error };
      }

      logger.info('User signed up successfully:', { email, user_id: data.user?.id });
      return { user: data.user, session: data.session, error: null };
    } catch (error: any) {
      logger.error('Sign up service error:', error);
      return { user: null, session: null, error };
    }
  }

  async signIn(email: string, password: string): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        logger.error('Sign in error:', error);
        return { user: null, session: null, error };
      }

      // Log the login
      if (data.user) {
        await this.logUserLogin(data.user.id);
      }

      logger.info('User signed in successfully:', { email, user_id: data.user?.id });
      return { user: data.user, session: data.session, error: null };
    } catch (error: any) {
      logger.error('Sign in service error:', error);
      return { user: null, session: null, error };
    }
  }

  async signOut(): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        logger.error('Sign out error:', error);
        return { error };
      }

      logger.info('User signed out successfully');
      return { error: null };
    } catch (error: any) {
      logger.error('Sign out service error:', error);
      return { error };
    }
  }

  async resetPassword(email: string): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.FRONTEND_URL}/auth/reset-password`
      });

      if (error) {
        logger.error('Reset password error:', error);
        return { error };
      }

      logger.info('Password reset email sent:', { email });
      return { error: null };
    } catch (error: any) {
      logger.error('Reset password service error:', error);
      return { error };
    }
  }

  async updatePassword(newPassword: string): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        logger.error('Update password error:', error);
        return { error };
      }

      logger.info('Password updated successfully');
      return { error: null };
    } catch (error: any) {
      logger.error('Update password service error:', error);
      return { error };
    }
  }

  async refreshSession(): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        logger.error('Refresh session error:', error);
        return { user: null, session: null, error };
      }

      return { user: data.user, session: data.session, error: null };
    } catch (error: any) {
      logger.error('Refresh session service error:', error);
      return { user: null, session: null, error };
    }
  }

  // =============================================
  // USER PROFILE METHODS
  // =============================================

  async getUserProfile(userId?: string): Promise<UserProfile | null> {
    try {
      const targetUserId = userId || (await supabase.auth.getUser()).data.user?.id;
      
      if (!targetUserId) {
        return null;
      }

      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          user_roles!inner(
            roles!inner(
              name,
              description,
              permissions
            )
          )
        `)
        .eq('id', targetUserId)
        .single();

      if (error) {
        logger.error('Get user profile error:', error);
        return null;
      }

      // Extract role from joined data
      const role = data.user_roles?.[0]?.roles?.name;

      return {
        ...data,
        role
      };
    } catch (error) {
      logger.error('Get user profile service error:', error);
      return null;
    }
  }

  async updateUserProfile(updates: Partial<UserProfile>): Promise<UserProfile | null> {
    try {
      const { data: user } = await supabase.auth.getUser();
      
      if (!user.user) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.user.id)
        .select()
        .single();

      if (error) {
        logger.error('Update user profile error:', error);
        return null;
      }

      logger.info('User profile updated:', { user_id: user.user.id, updates });
      return data;
    } catch (error) {
      logger.error('Update user profile service error:', error);
      return null;
    }
  }

  // =============================================
  // ROLE MANAGEMENT METHODS
  // =============================================

  async getUserRole(userId?: string): Promise<string | null> {
    try {
      const targetUserId = userId || (await supabase.auth.getUser()).data.user?.id;
      
      if (!targetUserId) {
        return null;
      }

      const { data, error } = await supabase.rpc('get_user_role', {
        user_uuid: targetUserId
      });

      if (error) {
        logger.error('Get user role error:', error);
        return null;
      }

      return data;
    } catch (error) {
      logger.error('Get user role service error:', error);
      return null;
    }
  }

  async assignUserRole(userId: string, roleName: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('assign_user_role', {
        user_uuid: userId,
        role_name: roleName
      });

      if (error) {
        logger.error('Assign user role error:', error);
        return false;
      }

      logger.info('User role assigned:', { user_id: userId, role: roleName });
      return data;
    } catch (error) {
      logger.error('Assign user role service error:', error);
      return false;
    }
  }

  async removeUserRole(userId: string, roleName: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('remove_user_role', {
        user_uuid: userId,
        role_name: roleName
      });

      if (error) {
        logger.error('Remove user role error:', error);
        return false;
      }

      logger.info('User role removed:', { user_id: userId, role: roleName });
      return data;
    } catch (error) {
      logger.error('Remove user role service error:', error);
      return false;
    }
  }

  async getUserRoles(): Promise<UserRole[]> {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('name');

      if (error) {
        logger.error('Get user roles error:', error);
        return [];
      }

      return data;
    } catch (error) {
      logger.error('Get user roles service error:', error);
      return [];
    }
  }

  // =============================================
  // USER MANAGEMENT (ADMIN ONLY)
  // =============================================

  async getAllUsers(page = 1, limit = 50): Promise<{ users: UserProfile[]; total: number }> {
    try {
      const offset = (page - 1) * limit;

      const { data, error, count } = await supabase
        .from('users')
        .select(`
          *,
          user_roles(
            roles(
              name,
              description,
              permissions
            )
          )
        `, { count: 'exact' })
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Get all users error:', error);
        return { users: [], total: 0 };
      }

      const users = data.map(user => ({
        ...user,
        role: user.user_roles?.[0]?.roles?.name
      }));

      return { users, total: count || 0 };
    } catch (error) {
      logger.error('Get all users service error:', error);
      return { users: [], total: 0 };
    }
  }

  async setUserStatus(userId: string, status: 'active' | 'inactive' | 'suspended'): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('set_user_status', {
        user_uuid: userId,
        new_status: status
      });

      if (error) {
        logger.error('Set user status error:', error);
        return false;
      }

      logger.info('User status updated:', { user_id: userId, status });
      return data;
    } catch (error) {
      logger.error('Set user status service error:', error);
      return false;
    }
  }

  async deleteUser(userId: string): Promise<boolean> {
    try {
      // Delete from auth.users (admin client required)
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

      if (error) {
        logger.error('Delete user error:', error);
        return false;
      }

      logger.info('User deleted:', { user_id: userId });
      return true;
    } catch (error) {
      logger.error('Delete user service error:', error);
      return false;
    }
  }

  // =============================================
  // UTILITY METHODS
  // =============================================

  async logUserLogin(userId: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('log_user_login', {
        user_uuid: userId
      });

      if (error) {
        logger.error('Log user login error:', error);
      }
    } catch (error) {
      logger.error('Log user login service error:', error);
    }
  }

  getCurrentUser(): Promise<{ data: { user: User | null }; error: AuthError | null }> {
    return supabase.auth.getUser();
  }

  getCurrentSession(): Promise<{ data: { session: Session | null }; error: AuthError | null }> {
    return supabase.auth.getSession();
  }

  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }
}

export default new SupabaseAuthService();