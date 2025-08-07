import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersService } from '../services/users';
import { CACHE_KEYS } from '../config/api';
import { User, RegisterForm, PaginationQuery, FilterQuery } from '../types';
import toast from 'react-hot-toast';

export const useUsers = (params?: PaginationQuery & FilterQuery) => {
  const queryClient = useQueryClient();

  // Get users query
  const usersQuery = useQuery({
    queryKey: [...CACHE_KEYS.users, params],
    queryFn: () => usersService.getUsers(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Get user stats query
  const userStatsQuery = useQuery({
    queryKey: CACHE_KEYS.userStats,
    queryFn: () => usersService.getUserStats(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: (userData: RegisterForm) => usersService.createUser(userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CACHE_KEYS.users });
      queryClient.invalidateQueries({ queryKey: CACHE_KEYS.userStats });
      toast.success('User created successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create user');
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<User> }) =>
      usersService.updateUser(id, data),
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: CACHE_KEYS.users });
      queryClient.setQueryData(['users', updatedUser._id], updatedUser);
      toast.success('User updated successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update user');
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => usersService.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CACHE_KEYS.users });
      queryClient.invalidateQueries({ queryKey: CACHE_KEYS.userStats });
      toast.success('User deleted successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete user');
    },
  });

  // Toggle user status mutation
  const toggleUserStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      usersService.toggleUserStatus(id, isActive),
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: CACHE_KEYS.users });
      queryClient.setQueryData(['users', updatedUser._id], updatedUser);
      toast.success(`User ${updatedUser.isActive ? 'activated' : 'deactivated'} successfully!`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to toggle user status');
    },
  });

  return {
    // Data
    users: usersQuery.data?.data || [],
    userStats: userStatsQuery.data,
    meta: usersQuery.data?.meta,

    // Loading states
    isLoading: usersQuery.isLoading,
    isStatsLoading: userStatsQuery.isLoading,
    isCreating: createUserMutation.isPending,
    isUpdating: updateUserMutation.isPending,
    isDeleting: deleteUserMutation.isPending,
    isTogglingStatus: toggleUserStatusMutation.isPending,

    // Error states
    error: usersQuery.error,
    statsError: userStatsQuery.error,

    // Actions
    createUser: createUserMutation.mutate,
    updateUser: updateUserMutation.mutate,
    deleteUser: deleteUserMutation.mutate,
    toggleUserStatus: toggleUserStatusMutation.mutate,
    refetch: usersQuery.refetch,
  };
};

export const useUser = (id: string) => {
  const queryClient = useQueryClient();

  const userQuery = useQuery({
    queryKey: ['users', id],
    queryFn: () => usersService.getUserById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    user: userQuery.data,
    isLoading: userQuery.isLoading,
    error: userQuery.error,
    refetch: userQuery.refetch,
  };
};

export const useUserSearch = () => {
  const searchUsersMutation = useMutation({
    mutationFn: ({ query, limit }: { query: string; limit?: number }) =>
      usersService.searchUsers(query, limit),
  });

  return {
    searchUsers: searchUsersMutation.mutate,
    results: searchUsersMutation.data || [],
    isSearching: searchUsersMutation.isPending,
    searchError: searchUsersMutation.error,
  };
};