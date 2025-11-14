import { Router } from 'express';
import { AIService } from '../services/ai.service';
import { authenticate } from '../middleware/auth';
import { aiGenerationLimiter } from '../middleware/rateLimiter';
import { AppError } from '../middleware/errorHandler';

const router = Router();

/**
 * @swagger
 * /api/ai/moderate:
 *   post:
 *     summary: Moderate text content
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *     responses:
 *       200:
 *         description: Moderation results
 */
router.post('/moderate', authenticate, aiGenerationLimiter, async (req, res, next) => {
  try {
    const { text } = req.body;

    if (!text) {
      throw new AppError('Text is required', 400);
    }

    const results = await AIService.getModerationDetails(text);

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
