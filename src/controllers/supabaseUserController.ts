import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { SupabaseService } from '../services/supabaseService';
import { catchAsync, CustomError } from '../middleware/errorHandler';
import { supabaseAdmin } from '../config/supabase';
import bcrypt from 'bcryptjs';

export const getUsers = catchAsync(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { page = 1, limit = 20, search, role, is_active } = req.query;

  const filters: any = {};
  if (role) filters.role = role;
  if (is_active !== undefined) filters.is_active = is_active === 'true';
  if (search) filters.email_search = search;

  const { data: users, count } = await SupabaseService.findAll(
    'users',
    filters,
    Number(page),
    Number(limit)
  );

  res.json({
    success: true,
    data: users,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: count,
      pages: Math.ceil(count / Number(limit))
    }
  });
});

export const getUser = catchAsync(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  
  // Check if user can access this profile
  if (req.user?.role !== 'admin' && req.user?.role !== 'manager' && req.user?.id !== id) {
    throw new CustomError('Access denied', 403);
  }

  const user = await SupabaseService.findById('users', id);
  
  if (!user) {
    throw new CustomError('User not found', 404);
  }

  res.json({
    success: true,
    data: user
  });
});

export const createUser = catchAsync(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { email, first_name, last_name, password, role = 'agent', phone, department } = req.body;

  // Hash password
  const saltRounds = 12;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // Create user in Supabase Auth
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: email.toLowerCase(),
    password,
    email_confirm: true,
    user_metadata: {
      first_name,
      last_name
    }
  });

  if (authError) {
    throw new CustomError(`User creation failed: ${authError.message}`, 400);
  }

  if (!authData.user) {
    throw new CustomError('User creation failed', 500);
  }

  // Create user profile
  const userData = {
    id: authData.user.id,
    email: email.toLowerCase(),
    first_name,
    last_name,
    role,
    is_active: true,
    phone,
    department
  };

  const user = await SupabaseService.create('users', userData);

  // Log activity
  await SupabaseService.logActivity(
    'note',
    'User created',
    'contact',
    user.id,
    req.user!.id,
    `New user created: ${first_name} ${last_name}`
  );

  res.status(201).json({
    success: true,
    message: 'User created successfully',
    data: user
  });
});

export const updateUser = catchAsync(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const updateData = req.body;

  // Check if user can update this profile
  if (req.user?.role !== 'admin' && req.user?.role !== 'manager' && req.user?.id !== id) {
    throw new CustomError('Access denied', 403);
  }

  // Remove sensitive fields that shouldn't be updated this way
  delete updateData.id;
  delete updateData.email;
  delete updateData.created_at;

  // Only admins can change roles
  if (updateData.role && req.user?.role !== 'admin') {
    delete updateData.role;
  }

  const user = await SupabaseService.update('users', id, updateData);

  res.json({
    success: true,
    message: 'User updated successfully',
    data: user
  });
});

export const deleteUser = catchAsync(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  // Check if user exists
  const user = await SupabaseService.findById('users', id);
  if (!user) {
    throw new CustomError('User not found', 404);
  }

  // Don't allow deleting yourself
  if (req.user?.id === id) {
    throw new CustomError('Cannot delete your own account', 400);
  }

  // Delete from Supabase Auth
  const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
  if (error) {
    throw new CustomError(`Failed to delete user: ${error.message}`, 500);
  }

  // Delete user profile (cascade will handle related data)
  await SupabaseService.delete('users', id);

  res.json({
    success: true,
    message: 'User deleted successfully'
  });
});

export const getUserActivity = catchAsync(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { page = 1, limit = 20 } = req.query;

  const { data: activities, count } = await SupabaseService.findAll(
    'activities',
    { user_id: id },
    Number(page),
    Number(limit)
  );

  res.json({
    success: true,
    data: activities,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: count,
      pages: Math.ceil(count / Number(limit))
    }
  });
});

export const getUserStats = catchAsync(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const totalUsers = await SupabaseService.getCount('users');
  const activeUsers = await SupabaseService.getCount('users', { is_active: true });
  const adminUsers = await SupabaseService.getCount('users', { role: 'admin' });
  const managerUsers = await SupabaseService.getCount('users', { role: 'manager' });
  const agentUsers = await SupabaseService.getCount('users', { role: 'agent' });
  const clientUsers = await SupabaseService.getCount('users', { role: 'client' });

  res.json({
    success: true,
    data: {
      total: totalUsers,
      active: activeUsers,
      inactive: totalUsers - activeUsers,
      roles: {
        admin: adminUsers,
        manager: managerUsers,
        agent: agentUsers,
        client: clientUsers
      }
    }
  });
});