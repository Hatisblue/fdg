import { Router } from 'express';
import { BookService } from '../services/book.service';
import { authenticate, optionalAuth } from '../middleware/auth';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler';
import { IllustrationStyle } from '@prisma/client';

const router = Router();

// Validation schemas
const createBookSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(1000),
  storyPrompt: z.string().min(10).max(5000),
  illustrationStyle: z.enum([
    'WATERCOLOR',
    'CARTOON',
    'REALISTIC',
    'FANTASY',
    'MINIMALIST',
    'VINTAGE',
  ]),
  ageRange: z.string().optional(),
  language: z.string().optional(),
});

/**
 * @swagger
 * /api/books:
 *   post:
 *     summary: Create a new book
 *     tags: [Books]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - storyPrompt
 *               - illustrationStyle
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               storyPrompt:
 *                 type: string
 *               illustrationStyle:
 *                 type: string
 *                 enum: [WATERCOLOR, CARTOON, REALISTIC, FANTASY, MINIMALIST, VINTAGE]
 *               ageRange:
 *                 type: string
 *               language:
 *                 type: string
 *     responses:
 *       201:
 *         description: Book created successfully
 */
router.post('/', authenticate, async (req, res, next) => {
  try {
    const validated = createBookSchema.parse(req.body);
    const book = await BookService.createBook(req.user!.id, validated);

    res.status(201).json({
      success: true,
      data: book,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      next(new AppError(error.errors[0].message, 400));
    } else {
      next(error);
    }
  }
});

/**
 * @swagger
 * /api/books/{id}/generate-story:
 *   post:
 *     summary: Generate story content for a book
 *     tags: [Books]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Story generated successfully
 */
router.post('/:id/generate-story', authenticate, async (req, res, next) => {
  try {
    const book = await BookService.generateStoryContent(
      req.params.id,
      req.user!.id
    );

    res.json({
      success: true,
      data: book,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/books/{id}/generate-images:
 *   post:
 *     summary: Generate images for book pages
 *     tags: [Books]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Images generated successfully
 */
router.post('/:id/generate-images', authenticate, async (req, res, next) => {
  try {
    const book = await BookService.generatePageImages(
      req.params.id,
      req.user!.id
    );

    res.json({
      success: true,
      data: book,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/books/{id}:
 *   get:
 *     summary: Get book by ID
 *     tags: [Books]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Book retrieved successfully
 */
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const book = await BookService.getBook(
      req.params.id,
      req.user?.id
    );

    res.json({
      success: true,
      data: book,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/books/my/all:
 *   get:
 *     summary: Get current user's books
 *     tags: [Books]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Books retrieved successfully
 */
router.get('/my/all', authenticate, async (req, res, next) => {
  try {
    const books = await BookService.getUserBooks(req.user!.id);

    res.json({
      success: true,
      data: books,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/books:
 *   get:
 *     summary: Get public books
 *     tags: [Books]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Books retrieved successfully
 */
router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await BookService.getPublicBooks(page, limit);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/books/{id}/publish:
 *   post:
 *     summary: Publish a book
 *     tags: [Books]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Book published successfully
 */
router.post('/:id/publish', authenticate, async (req, res, next) => {
  try {
    const book = await BookService.publishBook(
      req.params.id,
      req.user!.id
    );

    res.json({
      success: true,
      data: book,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/books/{id}:
 *   delete:
 *     summary: Delete a book
 *     tags: [Books]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Book deleted successfully
 */
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const result = await BookService.deleteBook(
      req.params.id,
      req.user!.id
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
