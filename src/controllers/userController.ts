import { Response } from 'express';
import { User } from '../models/User';
import { AuthRequest, UserRole } from '../types';
import { asyncHandler, createApiError } from '../middleware/errorHandler';
import { sendSuccess, sendCreated, sendDeleted, sendPaginated } from '../utils/responseHelpers';
import { parsePagination, buildSearchQuery, createPaginationMeta, extractFilters } from '../utils/queryHelpers';

/**
 * Get all users (Admin/Manager only)
 */
export const getUsers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page, limit, skip, sort } = parsePagination(req.query);
  const filters = extractFilters(req);
  const searchQuery = buildSearchQuery(filters);

  // Only admin and managers can see all users
  if (req.user?.role === UserRole.USER) {
    throw createApiError.forbidden('Access denied');
  }

  const [users, total] = await Promise.all([
    User.find(searchQuery)
      .select('-password -refreshToken -passwordResetToken -passwordResetExpires')
      .sort(sort)
      .skip(skip)
      .limit(limit),
    User.countDocuments(searchQuery)
  ]);

  const meta = createPaginationMeta(page, limit, total);
  
  sendPaginated(res, users, meta, 'Users retrieved successfully');
});

/**
 * Get user by ID
 */
export const getUserById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  
  // Users can only access their own profile unless they're admin/manager
  if (req.user?.role === UserRole.USER && req.user._id.toString() !== id) {
    throw createApiError.forbidden('Access denied');
  }

  const user = await User.findById(id)
    .select('-password -refreshToken -passwordResetToken -passwordResetExpires');
  
  if (!user) {
    throw createApiError.notFound('User not found');
  }

  sendSuccess(res, user, 'User retrieved successfully');
});

/**
 * Create new user (Admin only)
 */
export const createUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== UserRole.ADMIN) {
    throw createApiError.forbidden('Only administrators can create users');
  }

  const userData = {
    ...req.body,
    createdBy: req.user._id,
    updatedBy: req.user._id
  };

  const user = new User(userData);
  await user.save();

  const userResponse = user.toObject();
  const { password, refreshToken, ...sanitizedUser } = userResponse;

  sendCreated(res, sanitizedUser, 'User created successfully');
});

/**
 * Update user
 */
export const updateUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  
  // Users can only update their own profile unless they're admin/manager
  if (req.user?.role === UserRole.USER && req.user._id.toString() !== id) {
    throw createApiError.forbidden('Access denied');
  }

  // Only admins can change roles
  if (req.body.role && req.user?.role !== UserRole.ADMIN) {
    throw createApiError.forbidden('Only administrators can change user roles');
  }

  const updateData = {
    ...req.body,
    updatedBy: req.user?._id
  };

  const user = await User.findByIdAndUpdate(
    id,
    updateData,
    { new: true, runValidators: true }
  ).select('-password -refreshToken -passwordResetToken -passwordResetExpires');

  if (!user) {
    throw createApiError.notFound('User not found');
  }

  sendSuccess(res, user, 'User updated successfully');
});

/**
 * Delete user (Admin only)
 */
export const deleteUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  
  if (req.user?.role !== UserRole.ADMIN) {
    throw createApiError.forbidden('Only administrators can delete users');
  }

  // Prevent admin from deleting themselves
  if (req.user._id.toString() === id) {
    throw createApiError.badRequest('Cannot delete your own account');
  }

  const user = await User.findByIdAndDelete(id);
  
  if (!user) {
    throw createApiError.notFound('User not found');
  }

  sendDeleted(res, 'User deleted successfully');
});

/**
 * Activate/Deactivate user (Admin/Manager only)
 */
export const toggleUserStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { isActive } = req.body;
  
  if (![UserRole.ADMIN, UserRole.MANAGER].includes(req.user?.role as UserRole)) {
    throw createApiError.forbidden('Insufficient permissions');
  }

  // Prevent admin from deactivating themselves
  if (req.user?._id.toString() === id && !isActive) {
    throw createApiError.badRequest('Cannot deactivate your own account');
  }

  const user = await User.findByIdAndUpdate(
    id,
    { 
      isActive, 
      updatedBy: req.user?._id 
    },
    { new: true, runValidators: true }
  ).select('-password -refreshToken -passwordResetToken -passwordResetExpires');

  if (!user) {
    throw createApiError.notFound('User not found');
  }

  const statusMessage = isActive ? 'User activated successfully' : 'User deactivated successfully';
  
  sendSuccess(res, user, statusMessage);
});

/**
 * Get user statistics (Admin/Manager only)
 */
export const getUserStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (![UserRole.ADMIN, UserRole.MANAGER].includes(req.user?.role as UserRole)) {
    throw createApiError.forbidden('Insufficient permissions');
  }

  const [
    totalUsers,
    activeUsers,
    adminUsers,
    managerUsers,
    regularUsers,
    recentUsers
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isActive: true }),
    User.countDocuments({ role: UserRole.ADMIN, isActive: true }),
    User.countDocuments({ role: UserRole.MANAGER, isActive: true }),
    User.countDocuments({ role: UserRole.USER, isActive: true }),
    User.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    })
  ]);

  const stats = {
    total: totalUsers,
    active: activeUsers,
    inactive: totalUsers - activeUsers,
    byRole: {
      admin: adminUsers,
      manager: managerUsers,
      user: regularUsers
    },
    recentSignups: recentUsers
  };

  sendSuccess(res, stats, 'User statistics retrieved successfully');
});

/**
 * Search users
 */
export const searchUsers = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (![UserRole.ADMIN, UserRole.MANAGER].includes(req.user?.role as UserRole)) {
    throw createApiError.forbidden('Insufficient permissions');
  }

  const { q: query, limit = 10 } = req.query;
  
  if (!query || typeof query !== 'string') {
    throw createApiError.badRequest('Search query is required');
  }

  const searchRegex = new RegExp(query, 'i');
  const users = await User.find({
    $or: [
      { firstName: searchRegex },
      { lastName: searchRegex },
      { email: searchRegex },
      { department: searchRegex }
    ],
    isActive: true
  })
  .select('firstName lastName email role department')
  .limit(parseInt(limit as string, 10))
  .sort({ firstName: 1 });

  sendSuccess(res, users, `Found ${users.length} users`);
});

export default {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
  getUserStats,
  searchUsers
};