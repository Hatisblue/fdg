import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { UserRole } from '@prisma/client';
import { logger } from '../utils/logger';

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
  dateOfBirth?: Date;
  parentId?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export class AuthService {
  /**
   * Register a new user
   */
  static async register(data: RegisterData) {
    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser) {
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

      // Hash password
      const hashedPassword = await bcrypt.hash(
        data.password,
        parseInt(process.env.BCRYPT_ROUNDS || '12')
      );

      // Create user
      const user = await prisma.user.create({
        data: {
          email: data.email,
          password: hashedPassword,
          firstName: data.firstName,
          lastName: data.lastName,
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
   * Login user
   */
  static async login(data: LoginData) {
    try {
      // Find user
      const user = await prisma.user.findUnique({
        where: { email: data.email },
        include: {
          subscription: true,
        },
      });

      if (!user) {
        throw new AppError('Invalid credentials', 401);
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(data.password, user.password);

      if (!isPasswordValid) {
        throw new AppError('Invalid credentials', 401);
      }

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

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
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    const refreshToken = jwt.sign(
      { userId, role },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
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
        process.env.JWT_REFRESH_SECRET!
      ) as { userId: string; role: UserRole };

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
  static async requestPasswordReset(email: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        // Don't reveal if user exists
        return { message: 'If the email exists, a reset link has been sent' };
      }

      const resetToken = uuidv4();

      await prisma.user.update({
        where: { id: user.id },
        data: { passwordResetToken: resetToken },
      });

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

      logger.info(`Password reset for user: ${user.email}`);

      return { message: 'Password reset successfully' };
    } catch (error: any) {
      logger.error('Password reset error:', error);
      throw error instanceof AppError
        ? error
        : new AppError('Password reset failed', 500);
    }
  }
}
