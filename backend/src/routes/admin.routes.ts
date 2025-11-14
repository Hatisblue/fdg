import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import prisma from '../config/database';

const router = Router();

// All admin routes require ADMIN role
router.use(authenticate, authorize('ADMIN'));

/**
 * @swagger
 * /api/admin/stats:
 *   get:
 *     summary: Get platform statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 */
router.get('/stats', async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalBooks,
      totalViews,
      pendingModeration,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.book.count(),
      prisma.bookView.count(),
      prisma.book.count({
        where: { moderationStatus: 'PENDING' },
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        totalBooks,
        totalViews,
        pendingModeration,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/admin/books/pending:
 *   get:
 *     summary: Get books pending moderation
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pending books retrieved successfully
 */
router.get('/books/pending', async (req, res, next) => {
  try {
    const books = await prisma.book.findMany({
      where: { moderationStatus: 'PENDING' },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        pages: true,
      },
      orderBy: { createdAt: 'asc' },
    });

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
 * /api/admin/books/{id}/moderate:
 *   post:
 *     summary: Moderate a book
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [APPROVED, REJECTED, FLAGGED]
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Book moderated successfully
 */
router.post('/books/:id/moderate', async (req, res, next) => {
  try {
    const { status, notes } = req.body;

    const book = await prisma.book.update({
      where: { id: req.params.id },
      data: {
        moderationStatus: status,
        moderationNotes: notes,
      },
    });

    res.json({
      success: true,
      data: book,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
