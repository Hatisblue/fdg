import prisma from '../config/database';
import { logger } from '../utils/logger';
import { Request } from 'express';

export interface AuditLogData {
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  success?: boolean;
  errorMessage?: string;
}

export class AuditService {
  /**
   * Log an action to the audit log
   */
  static async log(data: AuditLogData): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: data.userId,
          action: data.action,
          resource: data.resource,
          resourceId: data.resourceId,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          metadata: data.metadata || {},
        },
      });

      // Also log to application logger for immediate visibility
      logger.info('Audit log', data);
    } catch (error) {
      // Don't throw - audit logging failure shouldn't break the main flow
      logger.error('Failed to create audit log', { error, data });
    }
  }

  /**
   * Log from Express request
   */
  static async logFromRequest(
    req: Request,
    action: string,
    resource: string,
    resourceId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      userId: req.user?.id,
      action,
      resource,
      resourceId,
      metadata,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  /**
   * Log authentication events
   */
  static async logAuth(
    userId: string | undefined,
    action: 'LOGIN' | 'LOGOUT' | 'REGISTER' | 'LOGIN_FAILED' | 'PASSWORD_RESET' | 'EMAIL_VERIFY',
    ipAddress?: string,
    userAgent?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      userId,
      action,
      resource: 'auth',
      ipAddress,
      userAgent,
      metadata,
    });
  }

  /**
   * Log book operations
   */
  static async logBook(
    userId: string,
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'PUBLISH' | 'UNPUBLISH' | 'VIEW',
    bookId: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      userId,
      action,
      resource: 'book',
      resourceId: bookId,
      metadata,
    });
  }

  /**
   * Log AI operations
   */
  static async logAI(
    userId: string | undefined,
    action: 'GENERATE_STORY' | 'GENERATE_IMAGE' | 'MODERATE_CONTENT',
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      userId,
      action,
      resource: 'ai',
      metadata,
    });
  }

  /**
   * Log subscription events
   */
  static async logSubscription(
    userId: string,
    action: 'UPGRADE' | 'DOWNGRADE' | 'CANCEL' | 'RENEW' | 'PAYMENT_FAILED',
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      userId,
      action,
      resource: 'subscription',
      metadata,
    });
  }

  /**
   * Log security events
   */
  static async logSecurity(
    action: 'RATE_LIMIT_EXCEEDED' | 'SUSPICIOUS_ACTIVITY' | 'BLOCKED_IP' | 'XSS_ATTEMPT' | 'SQL_INJECTION_ATTEMPT',
    ipAddress?: string,
    userAgent?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      action,
      resource: 'security',
      ipAddress,
      userAgent,
      metadata,
    });

    // Security events also go to error logger
    logger.error('Security event', { action, ipAddress, userAgent, metadata });
  }

  /**
   * Get audit logs for a user
   */
  static async getUserLogs(userId: string, limit: number = 100) {
    try {
      const logs = await prisma.auditLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return logs;
    } catch (error) {
      logger.error('Failed to get user logs', { error, userId });
      return [];
    }
  }

  /**
   * Get audit logs for a resource
   */
  static async getResourceLogs(
    resource: string,
    resourceId: string,
    limit: number = 100
  ) {
    try {
      const logs = await prisma.auditLog.findMany({
        where: { resource, resourceId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return logs;
    } catch (error) {
      logger.error('Failed to get resource logs', { error, resource, resourceId });
      return [];
    }
  }

  /**
   * Get recent security events
   */
  static async getSecurityEvents(hours: number = 24, limit: number = 1000) {
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);

      const logs = await prisma.auditLog.findMany({
        where: {
          resource: 'security',
          createdAt: {
            gte: since,
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return logs;
    } catch (error) {
      logger.error('Failed to get security events', { error });
      return [];
    }
  }

  /**
   * Clean old audit logs (for GDPR compliance and storage management)
   */
  static async cleanOldLogs(daysToKeep: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

      const result = await prisma.auditLog.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
      });

      logger.info(`Cleaned ${result.count} old audit logs`);
      return result.count;
    } catch (error) {
      logger.error('Failed to clean old logs', { error });
      return 0;
    }
  }
}
