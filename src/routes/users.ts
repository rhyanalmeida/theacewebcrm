import { Router } from 'express';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
  getUserStats,
  searchUsers
} from '../controllers/userController';
import { authenticate, authorize } from '../middleware/auth';
import { validate, validateQuery, validateParams } from '../middleware/validation';
import { userSchemas, commonSchemas } from '../middleware/validation';
import { UserRole } from '../types';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/users
 * @desc    Get all users with pagination and filtering
 * @access  Admin, Manager
 */
router.get(
  '/',
  authorize(UserRole.ADMIN, UserRole.MANAGER),
  validateQuery({
    ...commonSchemas.pagination,
    ...commonSchemas.filters
  }.describe('Get users with pagination and filtering')),
  getUsers
);

/**
 * @route   GET /api/users/stats
 * @desc    Get user statistics
 * @access  Admin, Manager
 */
router.get(
  '/stats',
  authorize(UserRole.ADMIN, UserRole.MANAGER),
  getUserStats
);

/**
 * @route   GET /api/users/search
 * @desc    Search users
 * @access  Admin, Manager
 */
router.get(
  '/search',
  authorize(UserRole.ADMIN, UserRole.MANAGER),
  validateQuery({
    q: commonSchemas.filters.keys.search.required(),
    limit: commonSchemas.pagination.keys.limit
  }),
  searchUsers
);

/**
 * @route   POST /api/users
 * @desc    Create new user
 * @access  Admin
 */
router.post(
  '/',
  authorize(UserRole.ADMIN),
  validate(userSchemas.register),
  createUser
);

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Private (own profile) or Admin/Manager
 */
router.get(
  '/:id',
  validateParams({
    id: commonSchemas.objectId.required()
  }),
  getUserById
);

/**
 * @route   PUT /api/users/:id
 * @desc    Update user
 * @access  Private (own profile) or Admin/Manager
 */
router.put(
  '/:id',
  validateParams({
    id: commonSchemas.objectId.required()
  }),
  validate(userSchemas.updateProfile.keys({
    role: userSchemas.register.keys.role // Allow role updates for admins
  })),
  updateUser
);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user
 * @access  Admin
 */
router.delete(
  '/:id',
  authorize(UserRole.ADMIN),
  validateParams({
    id: commonSchemas.objectId.required()
  }),
  deleteUser
);

/**
 * @route   PATCH /api/users/:id/status
 * @desc    Activate/Deactivate user
 * @access  Admin, Manager
 */
router.patch(
  '/:id/status',
  authorize(UserRole.ADMIN, UserRole.MANAGER),
  validateParams({
    id: commonSchemas.objectId.required()
  }),
  validate({
    isActive: require('joi').boolean().required()
  }),
  toggleUserStatus
);

export default router;