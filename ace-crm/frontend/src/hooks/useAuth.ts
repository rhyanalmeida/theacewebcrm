import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authService } from '../services/auth';
import { CACHE_KEYS } from '../config/api';
import { LoginForm, RegisterForm, User } from '../types';
import toast from 'react-hot-toast';

export const useAuth = () => {
  const queryClient = useQueryClient();

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: (credentials: LoginForm) => authService.login(credentials),
    onSuccess: (data) => {
      queryClient.setQueryData(CACHE_KEYS.profile, data.user);
      toast.success('Login successful!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Login failed');
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: (userData: RegisterForm) => authService.register(userData),
    onSuccess: () => {
      toast.success('Registration successful! Please login.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Registration failed');
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      queryClient.clear();
      toast.success('Logged out successfully');
    },
    onError: () => {
      // Even if API call fails, clear local data
      queryClient.clear();
      authService.removeTokens();
    },
  });

  // Profile query
  const profileQuery = useQuery({
    queryKey: CACHE_KEYS.profile,
    queryFn: () => authService.getProfile(),
    enabled: authService.isAuthenticated(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: any) => {
      // Don't retry on 401 errors
      if (error.response?.status === 401) {
        return false;
      }
      return failureCount < 3;
    },
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (userData: Partial<User>) => authService.updateProfile(userData),
    onSuccess: (data) => {
      queryClient.setQueryData(CACHE_KEYS.profile, data);
      toast.success('Profile updated successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: (passwordData: {
      currentPassword: string;
      newPassword: string;
      confirmPassword: string;
    }) => authService.changePassword(passwordData),
    onSuccess: () => {
      toast.success('Password changed successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to change password');
    },
  });

  // Forgot password mutation
  const forgotPasswordMutation = useMutation({
    mutationFn: (email: string) => authService.forgotPassword(email),
    onSuccess: () => {
      toast.success('Password reset email sent!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to send reset email');
    },
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: ({ token, password }: { token: string; password: string }) =>
      authService.resetPassword(token, password),
    onSuccess: () => {
      toast.success('Password reset successful! Please login.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to reset password');
    },
  });

  return {
    // Auth state
    user: profileQuery.data,
    isAuthenticated: authService.isAuthenticated(),
    isLoading: profileQuery.isLoading,
    isError: profileQuery.isError,

    // Actions
    login: loginMutation.mutate,
    register: registerMutation.mutate,
    logout: logoutMutation.mutate,
    updateProfile: updateProfileMutation.mutate,
    changePassword: changePasswordMutation.mutate,
    forgotPassword: forgotPasswordMutation.mutate,
    resetPassword: resetPasswordMutation.mutate,

    // Loading states
    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
    isUpdatingProfile: updateProfileMutation.isPending,
    isChangingPassword: changePasswordMutation.isPending,
    isSendingResetEmail: forgotPasswordMutation.isPending,
    isResettingPassword: resetPasswordMutation.isPending,

    // Error states
    loginError: loginMutation.error,
    registerError: registerMutation.error,
    profileError: profileQuery.error,
  };
};