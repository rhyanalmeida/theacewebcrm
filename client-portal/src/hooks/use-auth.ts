import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'
import toast from 'react-hot-toast'

export function useAuth() {
  const router = useRouter()
  const supabase = createSupabaseClient()
  const { 
    user, 
    profile, 
    loading, 
    initialized,
    setUser, 
    setProfile, 
    setLoading, 
    setInitialized,
    signOut: clearAuth 
  } = useAuthStore()

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          setUser(session.user)
          await fetchProfile(session.user.id)
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
      } finally {
        setLoading(false)
        setInitialized(true)
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user)
          await fetchProfile(session.user.id)
          setLoading(false)
        } else if (event === 'SIGNED_OUT') {
          clearAuth()
        }
      }
    )

    if (!initialized) {
      initAuth()
    }

    return () => subscription.unsubscribe()
  }, [initialized])

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .eq('role', 'client')
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // Profile doesn't exist, redirect to setup
          router.push('/setup-profile')
          return
        }
        throw error
      }

      setProfile(data)
    } catch (error) {
      console.error('Profile fetch error:', error)
      toast.error('Failed to load profile')
    }
  }

  const signIn = async (email: string, password: string) => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        toast.error(error.message)
        return { success: false, error }
      }

      toast.success('Welcome back!')
      return { success: true, data }
    } catch (error: any) {
      toast.error('An unexpected error occurred')
      return { success: false, error }
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email: string, password: string, fullName: string) => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: 'client',
          },
        },
      })

      if (error) {
        toast.error(error.message)
        return { success: false, error }
      }

      if (data.user && !data.session) {
        toast.success('Please check your email to confirm your account')
      }

      return { success: true, data }
    } catch (error: any) {
      toast.error('An unexpected error occurred')
      return { success: false, error }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        toast.error(error.message)
        return
      }

      clearAuth()
      router.push('/login')
      toast.success('Signed out successfully')
    } catch (error) {
      toast.error('Error signing out')
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async (email: string) => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        toast.error(error.message)
        return { success: false, error }
      }

      toast.success('Password reset email sent')
      return { success: true }
    } catch (error: any) {
      toast.error('An unexpected error occurred')
      return { success: false, error }
    } finally {
      setLoading(false)
    }
  }

  const updatePassword = async (password: string) => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })

      if (error) {
        toast.error(error.message)
        return { success: false, error }
      }

      toast.success('Password updated successfully')
      return { success: true }
    } catch (error: any) {
      toast.error('An unexpected error occurred')
      return { success: false, error }
    } finally {
      setLoading(false)
    }
  }

  const updateProfile = async (updates: Partial<typeof profile>) => {
    if (!user || !profile) return { success: false }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', user.id)
        .select()
        .single()

      if (error) {
        toast.error(error.message)
        return { success: false, error }
      }

      setProfile(data)
      toast.success('Profile updated successfully')
      return { success: true, data }
    } catch (error: any) {
      toast.error('An unexpected error occurred')
      return { success: false, error }
    } finally {
      setLoading(false)
    }
  }

  const isAuthenticated = !!user && !!profile
  const isClient = profile?.role === 'client'

  return {
    user,
    profile,
    loading,
    initialized,
    isAuthenticated,
    isClient,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    fetchProfile,
  }
}