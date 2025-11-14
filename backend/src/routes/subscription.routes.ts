import { Router } from 'express';
import Stripe from 'stripe';
import { authenticate } from '../middleware/auth';
import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

/**
 * @swagger
 * /api/subscriptions/create-checkout:
 *   post:
 *     summary: Create Stripe checkout session
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - priceId
 *             properties:
 *               priceId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Checkout session created
 */
router.post('/create-checkout', authenticate, async (req, res, next) => {
  try {
    const { priceId } = req.body;

    if (!priceId) {
      throw new AppError('Price ID is required', 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { subscription: true },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Create or retrieve Stripe customer
    let customerId = user.subscription?.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: user.id,
        },
      });
      customerId = customer.id;

      await prisma.subscription.update({
        where: { userId: user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/subscription/cancel`,
      metadata: {
        userId: user.id,
      },
    });

    res.json({
      success: true,
      data: {
        sessionId: session.id,
        url: session.url,
      },
    });
  } catch (error: any) {
    logger.error('Checkout creation error:', error);
    next(new AppError('Failed to create checkout session', 500));
  }
});

/**
 * @swagger
 * /api/subscriptions/portal:
 *   post:
 *     summary: Create Stripe customer portal session
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Portal session created
 */
router.post('/portal', authenticate, async (req, res, next) => {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { userId: req.user!.id },
    });

    if (!subscription?.stripeCustomerId) {
      throw new AppError('No subscription found', 404);
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${process.env.FRONTEND_URL}/dashboard`,
    });

    res.json({
      success: true,
      data: {
        url: session.url,
      },
    });
  } catch (error: any) {
    logger.error('Portal creation error:', error);
    next(new AppError('Failed to create portal session', 500));
  }
});

/**
 * @swagger
 * /api/subscriptions/webhook:
 *   post:
 *     summary: Handle Stripe webhooks
 *     tags: [Subscriptions]
 *     responses:
 *       200:
 *         description: Webhook processed
 */
router.post('/webhook', async (req, res, next) => {
  const sig = req.headers['stripe-signature'] as string;

  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutComplete(session);
        break;

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;

      default:
        logger.info(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    logger.error('Webhook error:', error);
    next(new AppError('Webhook processing failed', 400));
  }
});

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;

  if (!userId) {
    logger.error('No userId in session metadata');
    return;
  }

  const subscriptionId = session.subscription as string;
  const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);

  await prisma.subscription.update({
    where: { userId },
    data: {
      stripeSubscriptionId: subscriptionId,
      stripePriceId: stripeSubscription.items.data[0].price.id,
      tier: 'PREMIUM', // Determine from price ID
      status: 'ACTIVE',
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      monthlyBookLimit: -1, // Unlimited for premium
    },
  });

  logger.info(`Subscription activated for user: ${userId}`);
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const dbSubscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (!dbSubscription) {
    logger.error(`Subscription not found: ${subscription.id}`);
    return;
  }

  await prisma.subscription.update({
    where: { id: dbSubscription.id },
    data: {
      status: subscription.status === 'active' ? 'ACTIVE' : 'CANCELED',
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });

  logger.info(`Subscription updated: ${subscription.id}`);
}

export default router;
