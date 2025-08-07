import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  resetPassword: (email: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      loading: true,

      login: async (email: string, password: string) => {
        try {
          set({ loading: true });
          
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) {
            toast.error(error.message);
            throw error;
          }

          set({
            user: data.user,
            loading: false,
          });
          
          toast.success('Logged in successfully!');
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },

      register: async (email: string, password: string, firstName: string, lastName: string) => {
        try {
          set({ loading: true });
          
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                first_name: firstName,
                last_name: lastName,
              }
            }
          });

          if (error) {
            toast.error(error.message);
            throw error;
          }

          if (data.user && !data.session) {
            toast.success('Check your email for verification link!');
          }

          set({
            user: data.user,
            loading: false,
          });
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          await supabase.auth.signOut();
          set({
            user: null,
            loading: false,
          });
          toast.success('Logged out successfully!');
        } catch (error) {
          console.error('Error logging out:', error);
        }
      },

      resetPassword: async (email: string) => {
        try {
          const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/reset-password`,
          });

          if (error) {
            toast.error(error.message);
            throw error;
          }

          toast.success('Password reset email sent!');
        } catch (error) {
          throw error;
        }
      },

      setUser: (user) => {
        set({ user });
      },

      setLoading: (loading) => {
        set({ loading });
      },
    }),
    {
      name: 'supabase-auth-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user }),
    }
  )
);