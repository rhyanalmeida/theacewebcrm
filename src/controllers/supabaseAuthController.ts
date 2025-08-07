import { Request, Response } from 'express';
import SupabaseAuthService from '../services/supabase/auth';
import { AuthenticatedRequest } from '../middleware/supabaseAuth';
import { catchAsync, CustomError } from '../middleware/errorHandler';
import { logger } from '../config/logger';

/**
 * Register a new user
 */
export const register = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { email, password, firstName, lastName, phoneNumber } = req.body;

  // Check if user already exists
  const existingProfile = await SupabaseAuthService.getUserProfile();
  if (existingProfile) {
    throw new CustomError('User already exists with this email', 400);
  }

  const result = await SupabaseAuthService.signUp(email, password, {
    first_name: firstName,
    last_name: lastName,
    phone: phoneNumber
  });

  if (result.error) {
    throw new CustomError(result.error.message, 400);
  }

  res.status(201).json({
    success: true,
    message: 'User registered successfully. Please check your email to confirm your account.',
    data: {
      user: result.user,
      session: result.session
    }
  });
});

/**
 * Login user
 */
export const login = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  const result = await SupabaseAuthService.signIn(email, password);

  if (result.error) {
    throw new CustomError('Invalid email or password', 401);
  }

  if (!result.user || !result.session) {
    throw new CustomError('Authentication failed', 401);
  }

  // Get user profile
  const userProfile = await SupabaseAuthService.getUserProfile(result.user.id);
  
  if (!userProfile) {
    throw new CustomError('User profile not found', 404);
  }

  if (userProfile.status !== 'active') {
    throw new CustomError('Account is not active', 403);
  }

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: userProfile,
      session: result.session,
      access_token: result.session.access_token,
      refresh_token: result.session.refresh_token
    }
  });
});

/**
 * Refresh access token
 */
export const refreshToken = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const result = await SupabaseAuthService.refreshSession();

  if (result.error) {
    throw new CustomError('Token refresh failed', 401);
  }

  res.json({
    success: true,
    message: 'Token refreshed successfully',
    data: {
      session: result.session,
      access_token: result.session?.access_token,
      refresh_token: result.session?.refresh_token
    }
  });
});

/**
 * Logout user
 */
export const logout = catchAsync(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const result = await SupabaseAuthService.signOut();

  if (result.error) {
    logger.error('Logout error:', result.error);
    // Don't throw error, just log it
  }

  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

/**
 * Get current user profile
 */
export const getProfile = catchAsync(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    throw new CustomError('User not authenticated', 401);
  }

  const userProfile = await SupabaseAuthService.getUserProfile(req.user.id);
  
  if (!userProfile) {
    throw new CustomError('User profile not found', 404);
  }

  res.json({
    success: true,
    message: 'Profile retrieved successfully',
    data: userProfile
  });
});

/**
 * Update user profile
 */
export const updateProfile = catchAsync(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    throw new CustomError('User not authenticated', 401);
  }

  const updates = req.body;
  
  // Remove fields that shouldn't be updated
  delete updates.id;
  delete updates.email;
  delete updates.created_at;
  delete updates.email_verified;
  
  // Only allow role changes by admins
  if (updates.role && req.user.role !== 'admin') {
    delete updates.role;
  }

  const updatedProfile = await SupabaseAuthService.updateUserProfile(updates);
  
  if (!updatedProfile) {
    throw new CustomError('Failed to update profile', 500);
  }

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: updatedProfile
  });
});

/**
 * Change user password
 */
export const changePassword = catchAsync(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { newPassword } = req.body;

  const result = await SupabaseAuthService.updatePassword(newPassword);

  if (result.error) {
    throw new CustomError(result.error.message, 400);
  }

  res.json({
    success: true,
    message: 'Password changed successfully'
  });
});

/**
 * Request password reset
 */
export const requestPasswordReset = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;

  const result = await SupabaseAuthService.resetPassword(email);

  if (result.error) {
    throw new CustomError(result.error.message, 400);
  }

  res.json({
    success: true,
    message: 'Password reset email sent successfully'
  });
});

/**
 * Reset password with token
 */
export const resetPassword = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { password } = req.body;

  const result = await SupabaseAuthService.updatePassword(password);

  if (result.error) {
    throw new CustomError(result.error.message, 400);
  }

  res.json({
    success: true,
    message: 'Password reset successfully'
  });
});

/**
 * Validate JWT token
 */
export const validateToken = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { data } = await SupabaseAuthService.getCurrentUser();

  if (!data.user) {
    throw new CustomError('Invalid token', 401);
  }

  const userProfile = await SupabaseAuthService.getUserProfile(data.user.id);
  
  if (!userProfile || userProfile.status !== 'active') {
    throw new CustomError('User not found or inactive', 401);
  }

  res.json({
    success: true,
    message: 'Token is valid',
    data: {
      user: userProfile,
      valid: true
    }
  });
});

/**
 * Get user role
 */
export const getUserRole = catchAsync(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    throw new CustomError('User not authenticated', 401);
  }

  const role = await SupabaseAuthService.getUserRole(req.user.id);

  res.json({
    success: true,
    message: 'User role retrieved successfully',
    data: { role }
  });
});

/**
 * Get all available roles (admin only)
 */
export const getRoles = catchAsync(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || req.user.role !== 'admin') {
    throw new CustomError('Admin access required', 403);
  }

  const roles = await SupabaseAuthService.getUserRoles();

  res.json({
    success: true,
    message: 'Roles retrieved successfully',
    data: roles
  });
});

/**
 * Assign role to user (admin only)
 */
export const assignRole = catchAsync(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user || req.user.role !== 'admin') {
    throw new CustomError('Admin access required', 403);
  }

  const { userId, roleName } = req.body;

  const success = await SupabaseAuthService.assignUserRole(userId, roleName);

  if (!success) {
    throw new CustomError('Failed to assign role', 500);
  }

  res.json({
    success: true,
    message: 'Role assigned successfully'
  });
});

export default {
  register,
  login,
  refreshToken,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  requestPasswordReset,
  resetPassword,
  validateToken,
  getUserRole,
  getRoles,
  assignRole
};