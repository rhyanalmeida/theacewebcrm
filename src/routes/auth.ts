import { Router } from 'express';
import { 
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
} from '../controllers/authController';
import { authenticate, authRateLimit, logAuthEvent } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { userSchemas } from '../middleware/validation';

const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
  '/register',
  authRateLimit(15 * 60 * 1000, 5), // 5 attempts per 15 minutes
  logAuthEvent('registration_attempt'),
  validate(userSchemas.register),
  register
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post(
  '/login',
  authRateLimit(15 * 60 * 1000, 10), // 10 attempts per 15 minutes
  logAuthEvent('login_attempt'),
  validate(userSchemas.login),
  login
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post(
  '/refresh',
  validate({
    refreshToken: userSchemas.login.keys.password // Reuse password validation for token
  }),
  refreshToken
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post(
  '/logout',
  authenticate,
  logAuthEvent('logout'),
  logout
);

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get(
  '/profile',
  authenticate,
  getProfile
);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put(
  '/profile',
  authenticate,
  validate(userSchemas.updateProfile),
  updateProfile
);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post(
  '/change-password',
  authenticate,
  authRateLimit(60 * 60 * 1000, 3), // 3 attempts per hour
  logAuthEvent('password_change_attempt'),
  validate(userSchemas.changePassword),
  changePassword
);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post(
  '/forgot-password',
  authRateLimit(60 * 60 * 1000, 3), // 3 attempts per hour
  logAuthEvent('password_reset_request'),
  validate(userSchemas.resetPassword),
  requestPasswordReset
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post(
  '/reset-password',
  authRateLimit(60 * 60 * 1000, 5), // 5 attempts per hour
  logAuthEvent('password_reset_attempt'),
  validate({
    token: userSchemas.login.keys.password, // Reuse for token validation
    password: userSchemas.changePassword.keys.newPassword
  }),
  resetPassword
);

/**
 * @route   POST /api/auth/validate-token
 * @desc    Validate JWT token
 * @access  Public
 */
router.post(
  '/validate-token',
  validate({
    token: userSchemas.login.keys.password // Reuse for token validation
  }),
  validateToken
);

export default router;