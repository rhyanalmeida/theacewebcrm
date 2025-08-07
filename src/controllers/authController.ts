import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { AuthRequest } from '../types';
import { asyncHandler } from '../middleware/errorHandler';
import { sendSuccess, sendCreated } from '../utils/responseHelpers';
import { logger } from '../config/logger';

/**
 * Register a new user
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
  const result = await AuthService.register(req.body);
  
  sendCreated(res, result, 'User registered successfully');
});

/**
 * Login user
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const result = await AuthService.login(email, password);
  
  sendSuccess(res, result, 'Login successful');
});

/**
 * Refresh access token
 */
export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  const result = await AuthService.refreshToken(refreshToken);
  
  sendSuccess(res, result, 'Token refreshed successfully');
});

/**
 * Logout user
 */
export const logout = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?._id?.toString();
  if (userId) {
    await AuthService.logout(userId);
  }
  
  sendSuccess(res, null, 'Logged out successfully');
});

/**
 * Get current user profile
 */
export const getProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user;
  
  sendSuccess(res, user, 'Profile retrieved successfully');
});

/**
 * Update user profile
 */
export const updateProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?._id;
  const updateData = req.body;
  
  const { User } = await import('../models/User');
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { ...updateData, updatedBy: userId },
    { new: true, runValidators: true }
  );
  
  sendSuccess(res, updatedUser, 'Profile updated successfully');
});

/**
 * Change user password
 */
export const changePassword = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?._id?.toString();
  const { currentPassword, newPassword } = req.body;
  
  if (!userId) {
    return res.status(401).json({ success: false, message: 'User not authenticated' });
  }
  
  await AuthService.changePassword(userId, currentPassword, newPassword);
  
  sendSuccess(res, null, 'Password changed successfully');
});

/**
 * Request password reset
 */
export const requestPasswordReset = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;
  
  await AuthService.requestPasswordReset(email);
  
  sendSuccess(res, null, 'If the email exists, a reset link has been sent');
});

/**
 * Reset password with token
 */
export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token, password } = req.body;
  
  await AuthService.resetPassword(token, password);
  
  sendSuccess(res, null, 'Password reset successfully');
});

/**
 * Validate token
 */
export const validateToken = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.body;
  
  const user = await AuthService.validateToken(token);
  const isValid = !!user;
  
  sendSuccess(res, { isValid, user: isValid ? user : null }, 'Token validation result');
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
  validateToken
};