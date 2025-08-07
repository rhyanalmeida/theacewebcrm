import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { IUser, JwtPayload, LoginResponse } from '../types';
import { createApiError } from '../middleware/errorHandler';
import { logger } from '../config/logger';
import config from '../config';

export class AuthService {
  /**
   * Register a new user
   */
  static async register(userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role?: string;
    phoneNumber?: string;
    department?: string;
  }): Promise<LoginResponse> {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        throw createApiError.conflict('User already exists with this email');
      }

      // Create new user
      const user = new User(userData);
      await user.save();

      // Generate tokens
      const { accessToken, refreshToken } = this.generateTokens(user);

      // Save refresh token
      user.refreshToken = refreshToken;
      await user.save();

      logger.info(`User registered: ${user.email}`);

      return {
        user: this.sanitizeUser(user),
        accessToken,
        refreshToken
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'ValidationError') {
        throw createApiError.badRequest('Validation failed', [error.message]);
      }
      throw error;
    }
  }

  /**
   * Login user
   */
  static async login(email: string, password: string): Promise<LoginResponse> {
    try {
      // Find user with password field
      const user = await User.findOne({ email }).select('+password +refreshToken');
      if (!user) {
        throw createApiError.unauthorized('Invalid credentials');
      }

      // Check if user is active
      if (!user.isActive) {
        throw createApiError.unauthorized('Account is deactivated');
      }

      // Compare password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        throw createApiError.unauthorized('Invalid credentials');
      }

      // Generate new tokens
      const { accessToken, refreshToken } = this.generateTokens(user);

      // Update user's refresh token and last login
      user.refreshToken = refreshToken;
      user.lastLogin = new Date();
      await user.save();

      logger.info(`User logged in: ${user.email}`);

      return {
        user: this.sanitizeUser(user),
        accessToken,
        refreshToken
      };
    } catch (error) {
      logger.warn(`Login attempt failed for email: ${email}`);
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  static async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, config.jwtRefreshSecret) as JwtPayload;
      
      // Find user and validate refresh token
      const user = await User.findById(decoded.userId).select('+refreshToken');
      if (!user || user.refreshToken !== refreshToken || !user.isActive) {
        throw createApiError.unauthorized('Invalid refresh token');
      }

      // Generate new access token
      const accessToken = this.generateAccessToken(user);

      logger.info(`Token refreshed for user: ${user.email}`);

      return { accessToken };
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw createApiError.unauthorized('Invalid refresh token');
      }
      throw error;
    }
  }

  /**
   * Logout user
   */
  static async logout(userId: string): Promise<void> {
    try {
      const user = await User.findById(userId);
      if (user) {
        user.refreshToken = undefined;
        await user.save();
        logger.info(`User logged out: ${user.email}`);
      }
    } catch (error) {
      logger.error('Logout error:', error);
      throw createApiError.internalError('Logout failed');
    }
  }

  /**
   * Change user password
   */
  static async changePassword(
    userId: string, 
    currentPassword: string, 
    newPassword: string
  ): Promise<void> {
    try {
      const user = await User.findById(userId).select('+password');
      if (!user) {
        throw createApiError.notFound('User not found');
      }

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        throw createApiError.badRequest('Current password is incorrect');
      }

      // Update password
      user.password = newPassword;
      await user.save();

      // Invalidate all refresh tokens for security
      user.refreshToken = undefined;
      await user.save();

      logger.info(`Password changed for user: ${user.email}`);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Request password reset
   */
  static async requestPasswordReset(email: string): Promise<void> {
    try {
      const user = await User.findOne({ email });
      if (!user) {
        // Don't reveal if user exists
        logger.warn(`Password reset requested for non-existent email: ${email}`);
        return;
      }

      // Generate reset token (in production, implement proper token generation and email sending)
      const resetToken = jwt.sign(
        { userId: user._id, email: user.email },
        config.jwtSecret,
        { expiresIn: '1h' }
      );

      user.passwordResetToken = resetToken;
      user.passwordResetExpires = new Date(Date.now() + 3600000); // 1 hour
      await user.save();

      logger.info(`Password reset requested for user: ${user.email}`);
      
      // TODO: Send email with reset link
      // await emailService.sendPasswordResetEmail(user.email, resetToken);
    } catch (error) {
      logger.error('Password reset request error:', error);
      throw createApiError.internalError('Password reset request failed');
    }
  }

  /**
   * Reset password with token
   */
  static async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
      
      const user = await User.findOne({
        _id: decoded.userId,
        passwordResetToken: token,
        passwordResetExpires: { $gt: new Date() }
      }).select('+passwordResetToken +passwordResetExpires');

      if (!user) {
        throw createApiError.badRequest('Invalid or expired reset token');
      }

      // Update password and clear reset token
      user.password = newPassword;
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      user.refreshToken = undefined; // Invalidate all sessions
      await user.save();

      logger.info(`Password reset completed for user: ${user.email}`);
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw createApiError.badRequest('Invalid reset token');
      }
      throw error;
    }
  }

  /**
   * Generate access and refresh tokens
   */
  private static generateTokens(user: IUser): { accessToken: string; refreshToken: string } {
    const payload: JwtPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role
    };

    const accessToken = jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn
    });

    const refreshToken = jwt.sign(payload, config.jwtRefreshSecret, {
      expiresIn: config.jwtRefreshExpiresIn
    });

    return { accessToken, refreshToken };
  }

  /**
   * Generate access token only
   */
  private static generateAccessToken(user: IUser): string {
    const payload: JwtPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role
    };

    return jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn
    });
  }

  /**
   * Remove sensitive fields from user object
   */
  private static sanitizeUser(user: IUser): Omit<IUser, 'password' | 'refreshToken'> {
    const userObj = user.toObject();
    const { password, refreshToken, passwordResetToken, passwordResetExpires, ...sanitizedUser } = userObj;
    return sanitizedUser;
  }

  /**
   * Validate token without throwing errors
   */
  static async validateToken(token: string): Promise<IUser | null> {
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
      const user = await User.findById(decoded.userId);
      return user && user.isActive ? user : null;
    } catch {
      return null;
    }
  }
}

export default AuthService;