import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { UserRole } from '@prisma/client';
import { logger } from '../utils/logger';
import { AuditService } from './audit.service';
import {
  validatePasswordStrength,
  isValidEmail,
  isValidName,
  sanitizeString,
} from '../utils/validation';

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
  dateOfBirth?: Date;
  parentId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface LoginData {
  email: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
}

export class AuthService {
  /**
   * Register a new user with enhanced validation
   */
  static async register(data: RegisterData) {
    try {
      // Validate email
      if (!isValidEmail(data.email)) {
        throw new AppError('Invalid email address', 400);
      }

      // Validate names
      if (!isValidName(data.firstName)) {
        throw new AppError('Invalid first name', 400);
      }
      if (!isValidName(data.lastName)) {
        throw new AppError('Invalid last name', 400);
      }

      // Validate password strength
      const passwordStrength = validatePasswordStrength(data.password);
      if (!passwordStrength.isStrong) {
        throw new AppError(
          `Password is not strong enough: ${passwordStrength.feedback.join(', ')}`,
          400
        );
      }

      // Sanitize inputs
      const sanitizedEmail = sanitizeString(data.email.toLowerCase());
      const sanitizedFirstName = sanitizeString(data.firstName);
      const sanitizedLastName = sanitizeString(data.lastName);

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: sanitizedEmail },
      });

      if (existingUser) {
        // Log failed registration attempt
        await AuditService.logAuth(
          undefined,
          'REGISTER',
          data.ipAddress,
          data.userAgent,
          {
            email: sanitizedEmail,
            success: false,
            reason: 'Email already exists',
          }
        );

        throw new AppError('User with this email already exists', 400);
      }

      // If registering a child, verify parent exists
      if (data.role === 'CHILD' && data.parentId) {
        const parent = await prisma.user.findUnique({
          where: { id: data.parentId },
        });

        if (!parent || parent.role !== 'PARENT') {
          throw new AppError('Invalid parent account', 400);
        }
      }

      // Hash password with high cost factor
      const hashedPassword = await bcrypt.hash(
        data.password,
        parseInt(process.env.BCRYPT_ROUNDS || '12')
      );

      // Create user
      const user = await prisma.user.create({
        data: {
          email: sanitizedEmail,
          password: hashedPassword,
          firstName: sanitizedFirstName,
          lastName: sanitizedLastName,
          role: data.role || 'PARENT',
          dateOfBirth: data.dateOfBirth,
          parentId: data.parentId,
          emailVerifyToken: uuidv4(),
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          createdAt: true,
        },
      });

      // Create subscription for parent accounts
      if (user.role === 'PARENT') {
        await prisma.subscription.create({
          data: {
            userId: user.id,
            tier: 'FREE',
            status: 'ACTIVE',
            monthlyBookLimit: 3,
          },
        });
      }

      // Log successful registration
      await AuditService.logAuth(
        user.id,
        'REGISTER',
        data.ipAddress,
        data.userAgent,
        {
          email: sanitizedEmail,
          role: user.role,
          success: true,
        }
      );

      // Generate tokens
      const tokens = this.generateTokens(user.id, user.role);

      logger.info(`New user registered: ${user.email}`);

      return {
        user,
        ...tokens,
      };
    } catch (error: any) {
      logger.error('Registration error:', error);
      throw error instanceof AppError
        ? error
        : new AppError('Registration failed', 500);
    }
  }

  /**
   * Login user with enhanced security
   */
  static async login(data: LoginData) {
    try {
      // Validate email format
      if (!isValidEmail(data.email)) {
        throw new AppError('Invalid credentials', 401);
      }

      // Find user
      const user = await prisma.user.findUnique({
        where: { email: data.email.toLowerCase() },
        include: {
          subscription: true,
        },
      });

      if (!user) {
        // Log failed login attempt
        await AuditService.logAuth(
          undefined,
          'LOGIN_FAILED',
          data.ipAddress,
          data.userAgent,
          {
            email: data.email,
            reason: 'User not found',
          }
        );

        // Use generic error message to prevent user enumeration
        throw new AppError('Invalid credentials', 401);
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(data.password, user.password);

      if (!isPasswordValid) {
        // Log failed login attempt
        await AuditService.logAuth(
          user.id,
          'LOGIN_FAILED',
          data.ipAddress,
          data.userAgent,
          {
            email: data.email,
            reason: 'Invalid password',
          }
        );

        throw new AppError('Invalid credentials', 401);
      }

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      // Log successful login
      await AuditService.logAuth(
        user.id,
        'LOGIN',
        data.ipAddress,
        data.userAgent,
        {
          email: data.email,
          success: true,
        }
      );

      // Generate tokens
      const tokens = this.generateTokens(user.id, user.role);

      logger.info(`User logged in: ${user.email}`);

      const { password, ...userWithoutPassword } = user;

      return {
        user: userWithoutPassword,
        ...tokens,
      };
    } catch (error: any) {
      logger.error('Login error:', error);
      throw error instanceof AppError
        ? error
        : new AppError('Login failed', 500);
    }
  }

  /**
   * Generate JWT tokens
   */
  private static generateTokens(userId: string, role: UserRole) {
    const accessToken = jwt.sign(
      { userId, role },
      process.env.JWT_SECRET!,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
        issuer: 'storycanvas',
        audience: 'storycanvas-api',
      }
    );

    const refreshToken = jwt.sign(
      { userId, role, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET!,
      {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
        issuer: 'storycanvas',
        audience: 'storycanvas-api',
      }
    );

    return { accessToken, refreshToken };
  }

  /**
   * Refresh access token
   */
  static async refreshToken(refreshToken: string) {
    try {
      const decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET!,
        {
          issuer: 'storycanvas',
          audience: 'storycanvas-api',
        }
      ) as { userId: string; role: UserRole; type: string };

      // Verify it's a refresh token
      if (decoded.type !== 'refresh') {
        throw new AppError('Invalid token type', 401);
      }

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (!user) {
        throw new AppError('User not found', 401);
      }

      const tokens = this.generateTokens(user.id, user.role);

      return tokens;
    } catch (error) {
      logger.error('Token refresh error:', error);
      throw new AppError('Invalid refresh token', 401);
    }
  }

  /**
   * Verify email
   */
  static async verifyEmail(token: string) {
    try {
      const user = await prisma.user.findFirst({
        where: { emailVerifyToken: token },
      });

      if (!user) {
        throw new AppError('Invalid verification token', 400);
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          isEmailVerified: true,
          emailVerifyToken: null,
        },
      });

      await AuditService.logAuth(
        user.id,
        'EMAIL_VERIFY',
        undefined,
        undefined,
        { email: user.email }
      );

      logger.info(`Email verified for user: ${user.email}`);

      return { message: 'Email verified successfully' };
    } catch (error: any) {
      logger.error('Email verification error:', error);
      throw error instanceof AppError
        ? error
        : new AppError('Email verification failed', 500);
    }
  }

  /**
   * Request password reset
   */
  static async requestPasswordReset(email: string, ipAddress?: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (!user) {
        // Don't reveal if user exists
        logger.warn('Password reset requested for non-existent email', { email, ipAddress });
        return { message: 'If the email exists, a reset link has been sent' };
      }

      const resetToken = uuidv4();

      await prisma.user.update({
        where: { id: user.id },
        data: { passwordResetToken: resetToken },
      });

      await AuditService.logAuth(
        user.id,
        'PASSWORD_RESET',
        ipAddress,
        undefined,
        { email: user.email, action: 'request' }
      );

      // TODO: Send email with reset token
      logger.info(`Password reset requested for: ${email}`);

      return { message: 'If the email exists, a reset link has been sent' };
    } catch (error) {
      logger.error('Password reset request error:', error);
      throw new AppError('Password reset request failed', 500);
    }
  }

  /**
   * Reset password
   */
  static async resetPassword(token: string, newPassword: string) {
    try {
      // Validate new password strength
      const passwordStrength = validatePasswordStrength(newPassword);
      if (!passwordStrength.isStrong) {
        throw new AppError(
          `Password is not strong enough: ${passwordStrength.feedback.join(', ')}`,
          400
        );
      }

      const user = await prisma.user.findFirst({
        where: { passwordResetToken: token },
      });

      if (!user) {
        throw new AppError('Invalid reset token', 400);
      }

      const hashedPassword = await bcrypt.hash(
        newPassword,
        parseInt(process.env.BCRYPT_ROUNDS || '12')
      );

      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          passwordResetToken: null,
        },
      });

      await AuditService.logAuth(
        user.id,
        'PASSWORD_RESET',
        undefined,
        undefined,
        { email: user.email, action: 'complete' }
      );

      logger.info(`Password reset for user: ${user.email}`);

      return { message: 'Password reset successfully' };
    } catch (error: any) {
      logger.error('Password reset error:', error);
      throw error instanceof AppError
        ? error
        : new AppError('Password reset failed', 500);
    }
  }

  /**
   * Change password (for authenticated user)
   */
  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Verify current password
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

      if (!isPasswordValid) {
        await AuditService.logAuth(
          userId,
          'PASSWORD_RESET',
          undefined,
          undefined,
          { action: 'change_failed', reason: 'Invalid current password' }
        );

        throw new AppError('Current password is incorrect', 401);
      }

      // Validate new password strength
      const passwordStrength = validatePasswordStrength(newPassword);
      if (!passwordStrength.isStrong) {
        throw new AppError(
          `Password is not strong enough: ${passwordStrength.feedback.join(', ')}`,
          400
        );
      }

      // Check if new password is same as current
      const isSamePassword = await bcrypt.compare(newPassword, user.password);
      if (isSamePassword) {
        throw new AppError('New password must be different from current password', 400);
      }

      const hashedPassword = await bcrypt.hash(
        newPassword,
        parseInt(process.env.BCRYPT_ROUNDS || '12')
      );

      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });

      await AuditService.logAuth(
        userId,
        'PASSWORD_RESET',
        undefined,
        undefined,
        { action: 'change_success' }
      );

      logger.info(`Password changed for user: ${user.email}`);

      return { message: 'Password changed successfully' };
    } catch (error: any) {
      logger.error('Password change error:', error);
      throw error instanceof AppError
        ? error
        : new AppError('Password change failed', 500);
    }
  }
}
