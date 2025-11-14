import OpenAI from 'openai';
import { logger } from '../utils/logger';
import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID,
});

export interface StoryGenerationParams {
  prompt: string;
  ageRange: string;
  pages: number;
  language: string;
  genre?: string;
}

export interface PageContent {
  pageNumber: number;
  text: string;
  imagePrompt: string;
}

export interface StoryResult {
  title: string;
  pages: PageContent[];
}

export class AIService {
  /**
   * Generate a complete children's story
   */
  static async generateStory(
    params: StoryGenerationParams,
    userId?: string
  ): Promise<StoryResult> {
    try {
      const systemPrompt = `You are a professional children's book author. Create engaging, age-appropriate, educational, and safe stories for children aged ${params.ageRange}.

Stories must be:
- Completely safe and appropriate for children
- Educational and promote positive values
- Engaging and imaginative
- Free from violence, scary content, or inappropriate themes
- Culturally sensitive and inclusive

Format your response as JSON with this structure:
{
  "title": "Book Title",
  "pages": [
    {
      "pageNumber": 1,
      "text": "Page text (2-4 sentences for young children, 3-5 for older)",
      "imagePrompt": "Detailed description for AI image generation (child-friendly, colorful, engaging)"
    }
  ]
}`;

      const userPrompt = `Create a ${params.pages}-page children's story in ${params.language} based on: ${params.prompt}
${params.genre ? `Genre: ${params.genre}` : ''}

Make it magical and memorable!`;

      const completion = await openai.chat.completions.create({
        model: process.env.AI_MODEL_TEXT || 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
        max_tokens: parseInt(process.env.AI_MAX_TOKENS || '2000'),
        response_format: { type: 'json_object' },
      });

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        throw new AppError('No response from AI', 500);
      }

      const story: StoryResult = JSON.parse(responseText);

      // Moderate the generated content
      const isSafe = await this.moderateText(JSON.stringify(story));
      if (!isSafe) {
        throw new AppError('Generated content failed safety check. Please try a different prompt.', 400);
      }

      // Log the generation
      await this.logGeneration({
        type: 'text',
        model: process.env.AI_MODEL_TEXT || 'gpt-4-turbo-preview',
        prompt: userPrompt,
        response: responseText,
        tokensUsed: completion.usage?.total_tokens,
        userId,
        moderationPassed: true,
      });

      return story;
    } catch (error: any) {
      logger.error('Story generation error:', error);

      await this.logGeneration({
        type: 'text',
        model: process.env.AI_MODEL_TEXT || 'gpt-4-turbo-preview',
        prompt: params.prompt,
        error: error.message,
        success: false,
        userId,
      });

      throw new AppError(
        error.message || 'Failed to generate story',
        error.statusCode || 500
      );
    }
  }

  /**
   * Generate an image for a book page
   */
  static async generateImage(
    prompt: string,
    style: string = 'cartoon',
    userId?: string
  ): Promise<string> {
    try {
      // Enhance prompt with style and safety guidelines
      const enhancedPrompt = `${prompt}.
Style: ${style}, colorful, child-friendly, appropriate for children's books.
NO violence, NO scary content, NO inappropriate themes.
High quality, vibrant colors, engaging composition.`;

      // Moderate the prompt first
      const isSafe = await this.moderateText(enhancedPrompt);
      if (!isSafe) {
        throw new AppError('Image prompt failed safety check', 400);
      }

      const response = await openai.images.generate({
        model: process.env.AI_MODEL_IMAGE || 'dall-e-3',
        prompt: enhancedPrompt,
        n: 1,
        size: '1024x1024',
        quality: 'hd',
        style: 'vivid',
      });

      const imageUrl = response.data[0]?.url;
      if (!imageUrl) {
        throw new AppError('No image generated', 500);
      }

      // Moderate the generated image
      // Note: In production, you'd download the image and run moderation
      // For now, we trust DALL-E's built-in safety

      // Log the generation
      await this.logGeneration({
        type: 'image',
        model: process.env.AI_MODEL_IMAGE || 'dall-e-3',
        prompt: enhancedPrompt,
        response: imageUrl,
        userId,
        moderationPassed: true,
      });

      return imageUrl;
    } catch (error: any) {
      logger.error('Image generation error:', error);

      await this.logGeneration({
        type: 'image',
        model: process.env.AI_MODEL_IMAGE || 'dall-e-3',
        prompt,
        error: error.message,
        success: false,
        userId,
      });

      throw new AppError(
        error.message || 'Failed to generate image',
        error.statusCode || 500
      );
    }
  }

  /**
   * Moderate text content using OpenAI Moderation API
   */
  static async moderateText(text: string): Promise<boolean> {
    try {
      if (process.env.ENABLE_CONTENT_MODERATION !== 'true') {
        return true; // Moderation disabled
      }

      const moderation = await openai.moderations.create({
        input: text,
      });

      const result = moderation.results[0];
      const strictMode = process.env.MODERATION_STRICT_MODE === 'true';

      if (strictMode) {
        // In strict mode, flag anything that's not completely safe
        return !result.flagged && result.categories.sexual === false &&
               result.categories.violence === false &&
               result.categories.hate === false;
      }

      return !result.flagged;
    } catch (error) {
      logger.error('Moderation error:', error);
      // Fail closed - if moderation fails, reject the content
      return false;
    }
  }

  /**
   * Get detailed moderation results
   */
  static async getModerationDetails(text: string) {
    try {
      const moderation = await openai.moderations.create({
        input: text,
      });

      return moderation.results[0];
    } catch (error) {
      logger.error('Moderation details error:', error);
      throw new AppError('Failed to get moderation details', 500);
    }
  }

  /**
   * Log AI generation to database
   */
  private static async logGeneration(data: {
    type: string;
    model: string;
    prompt: string;
    response?: string;
    tokensUsed?: number;
    cost?: number;
    success?: boolean;
    error?: string;
    moderationPassed?: boolean;
    moderationFlags?: any;
    userId?: string;
  }) {
    try {
      await prisma.aIGenerationLog.create({
        data: {
          type: data.type,
          model: data.model,
          prompt: data.prompt,
          response: data.response,
          tokensUsed: data.tokensUsed,
          cost: data.cost,
          success: data.success ?? true,
          error: data.error,
          moderationPassed: data.moderationPassed,
          moderationFlags: data.moderationFlags,
          userId: data.userId,
        },
      });
    } catch (error) {
      logger.error('Failed to log AI generation:', error);
      // Don't throw - logging failure shouldn't break the main flow
    }
  }
}
