import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { AIService } from './ai.service';
import { BookStatus, IllustrationStyle, ContentModerationStatus } from '@prisma/client';
import { logger } from '../utils/logger';
import { cacheGet, cacheSet, cacheDel } from '../config/redis';

export interface CreateBookData {
  title: string;
  description: string;
  storyPrompt: string;
  illustrationStyle: IllustrationStyle;
  ageRange?: string;
  language?: string;
  pageCount?: number;
}

export class BookService {
  /**
   * Create a new book
   */
  static async createBook(userId: string, data: CreateBookData) {
    try {
      // Check subscription limits
      await this.checkSubscriptionLimits(userId);

      // Create book in DRAFT status
      const book = await prisma.book.create({
        data: {
          title: data.title,
          description: data.description,
          storyPrompt: data.storyPrompt,
          content: '',
          authorId: userId,
          illustrationStyle: data.illustrationStyle,
          language: data.language || 'en',
          ageRange: data.ageRange || '3-8',
          status: 'DRAFT',
          moderationStatus: 'PENDING',
        },
      });

      logger.info(`Book created: ${book.id} by user ${userId}`);

      // Update subscription counter
      await this.incrementBookCounter(userId);

      return book;
    } catch (error: any) {
      logger.error('Book creation error:', error);
      throw error instanceof AppError
        ? error
        : new AppError('Failed to create book', 500);
    }
  }

  /**
   * Generate story content for a book
   */
  static async generateStoryContent(bookId: string, userId: string) {
    try {
      const book = await prisma.book.findUnique({
        where: { id: bookId },
      });

      if (!book) {
        throw new AppError('Book not found', 404);
      }

      if (book.authorId !== userId) {
        throw new AppError('Unauthorized', 403);
      }

      // Update status to GENERATING
      await prisma.book.update({
        where: { id: bookId },
        data: { status: 'GENERATING' },
      });

      // Generate story using AI
      const pageCount = parseInt(book.ageRange.split('-')[0]) <= 5 ? 8 : 12;
      const story = await AIService.generateStory(
        {
          prompt: book.storyPrompt,
          ageRange: book.ageRange,
          pages: pageCount,
          language: book.language,
        },
        userId
      );

      // Create pages
      const pages = await Promise.all(
        story.pages.map((page) =>
          prisma.page.create({
            data: {
              bookId: book.id,
              pageNumber: page.pageNumber,
              content: page.text,
              imagePrompt: page.imagePrompt,
              moderationStatus: 'APPROVED', // Already moderated by AI service
            },
          })
        )
      );

      // Update book
      const updatedBook = await prisma.book.update({
        where: { id: bookId },
        data: {
          content: JSON.stringify(story.pages),
          status: 'COMPLETED',
          moderationStatus: 'APPROVED',
        },
        include: {
          pages: true,
        },
      });

      logger.info(`Story generated for book: ${bookId}`);

      return updatedBook;
    } catch (error: any) {
      logger.error('Story generation error:', error);

      // Update book status to FAILED
      await prisma.book.update({
        where: { id: bookId },
        data: { status: 'FAILED' },
      });

      throw error instanceof AppError
        ? error
        : new AppError('Failed to generate story', 500);
    }
  }

  /**
   * Generate images for book pages
   */
  static async generatePageImages(bookId: string, userId: string) {
    try {
      const book = await prisma.book.findUnique({
        where: { id: bookId },
        include: { pages: true },
      });

      if (!book) {
        throw new AppError('Book not found', 404);
      }

      if (book.authorId !== userId) {
        throw new AppError('Unauthorized', 403);
      }

      // Generate images for all pages
      for (const page of book.pages) {
        if (!page.imageUrl) {
          try {
            const imageUrl = await AIService.generateImage(
              page.imagePrompt,
              book.illustrationStyle.toLowerCase(),
              userId
            );

            await prisma.page.update({
              where: { id: page.id },
              data: { imageUrl },
            });

            logger.info(`Image generated for page ${page.pageNumber} of book ${bookId}`);
          } catch (error) {
            logger.error(`Failed to generate image for page ${page.pageNumber}:`, error);
            // Continue with other pages even if one fails
          }
        }
      }

      // Get updated book
      const updatedBook = await prisma.book.findUnique({
        where: { id: bookId },
        include: { pages: true },
      });

      return updatedBook;
    } catch (error: any) {
      logger.error('Page image generation error:', error);
      throw error instanceof AppError
        ? error
        : new AppError('Failed to generate images', 500);
    }
  }

  /**
   * Get book by ID
   */
  static async getBook(bookId: string, userId?: string) {
    try {
      // Try cache first
      const cacheKey = `book:${bookId}`;
      const cached = await cacheGet(cacheKey);

      if (cached) {
        const book = JSON.parse(cached);

        // Record view if user is authenticated
        if (userId) {
          await this.recordView(bookId, userId);
        }

        return book;
      }

      const book = await prisma.book.findUnique({
        where: { id: bookId },
        include: {
          pages: {
            orderBy: { pageNumber: 'asc' },
          },
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
        },
      });

      if (!book) {
        throw new AppError('Book not found', 404);
      }

      // Check if user has access
      if (!book.isPublic && book.authorId !== userId) {
        throw new AppError('Access denied', 403);
      }

      // Cache the book
      await cacheSet(cacheKey, JSON.stringify(book), 3600);

      // Record view
      if (userId) {
        await this.recordView(bookId, userId);
      }

      return book;
    } catch (error: any) {
      logger.error('Get book error:', error);
      throw error instanceof AppError
        ? error
        : new AppError('Failed to get book', 500);
    }
  }

  /**
   * Get user's books
   */
  static async getUserBooks(userId: string) {
    try {
      const books = await prisma.book.findMany({
        where: { authorId: userId },
        include: {
          pages: {
            take: 1,
            orderBy: { pageNumber: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return books;
    } catch (error) {
      logger.error('Get user books error:', error);
      throw new AppError('Failed to get books', 500);
    }
  }

  /**
   * Get public books
   */
  static async getPublicBooks(page: number = 1, limit: number = 20) {
    try {
      const skip = (page - 1) * limit;

      const [books, total] = await Promise.all([
        prisma.book.findMany({
          where: {
            isPublic: true,
            moderationStatus: 'APPROVED',
          },
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.book.count({
          where: {
            isPublic: true,
            moderationStatus: 'APPROVED',
          },
        }),
      ]);

      return {
        books,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Get public books error:', error);
      throw new AppError('Failed to get books', 500);
    }
  }

  /**
   * Publish book
   */
  static async publishBook(bookId: string, userId: string) {
    try {
      const book = await prisma.book.findUnique({
        where: { id: bookId },
      });

      if (!book) {
        throw new AppError('Book not found', 404);
      }

      if (book.authorId !== userId) {
        throw new AppError('Unauthorized', 403);
      }

      if (book.moderationStatus !== 'APPROVED') {
        throw new AppError('Book must be approved before publishing', 400);
      }

      const updatedBook = await prisma.book.update({
        where: { id: bookId },
        data: {
          isPublic: true,
          publishedAt: new Date(),
        },
      });

      // Clear cache
      await cacheDel(`book:${bookId}`);

      logger.info(`Book published: ${bookId}`);

      return updatedBook;
    } catch (error: any) {
      logger.error('Publish book error:', error);
      throw error instanceof AppError
        ? error
        : new AppError('Failed to publish book', 500);
    }
  }

  /**
   * Delete book
   */
  static async deleteBook(bookId: string, userId: string) {
    try {
      const book = await prisma.book.findUnique({
        where: { id: bookId },
      });

      if (!book) {
        throw new AppError('Book not found', 404);
      }

      if (book.authorId !== userId) {
        throw new AppError('Unauthorized', 403);
      }

      await prisma.book.delete({
        where: { id: bookId },
      });

      // Clear cache
      await cacheDel(`book:${bookId}`);

      logger.info(`Book deleted: ${bookId}`);

      return { message: 'Book deleted successfully' };
    } catch (error: any) {
      logger.error('Delete book error:', error);
      throw error instanceof AppError
        ? error
        : new AppError('Failed to delete book', 500);
    }
  }

  /**
   * Check subscription limits
   */
  private static async checkSubscriptionLimits(userId: string) {
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      throw new AppError('No subscription found', 400);
    }

    if (subscription.tier === 'FREE') {
      if (subscription.booksCreatedThisMonth >= subscription.monthlyBookLimit) {
        throw new AppError(
          'Monthly book limit reached. Please upgrade to create more books.',
          403
        );
      }
    }
  }

  /**
   * Increment book creation counter
   */
  private static async incrementBookCounter(userId: string) {
    await prisma.subscription.update({
      where: { userId },
      data: {
        booksCreatedThisMonth: {
          increment: 1,
        },
      },
    });
  }

  /**
   * Record book view
   */
  private static async recordView(bookId: string, userId?: string) {
    try {
      await prisma.bookView.create({
        data: {
          bookId,
          userId,
        },
      });

      await prisma.book.update({
        where: { id: bookId },
        data: {
          viewCount: {
            increment: 1,
          },
        },
      });
    } catch (error) {
      // Don't throw - view recording failure shouldn't break the main flow
      logger.error('Record view error:', error);
    }
  }
}
