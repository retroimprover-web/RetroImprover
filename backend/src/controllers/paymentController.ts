import { Request, Response } from 'express';
import Stripe from 'stripe';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
});

// Планы с ценами в центах
const PLANS = {
  starter: { stars: 3, price: 0, priceId: null }, // Free
  creator: { stars: 20, price: 999, priceId: null }, // $9.99
  pro: { stars: 50, price: 2599, priceId: null }, // $25.99
};

/**
 * Создает Stripe Checkout Session для покупки звезд
 */
export const createCheckoutSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      res.status(401).json({ error: 'Неавторизован' });
      return;
    }

    const { planId } = req.body;

    if (!planId || !['starter', 'creator', 'pro'].includes(planId)) {
      res.status(400).json({ error: 'Некорректный план' });
      return;
    }

    const plan = PLANS[planId as keyof typeof PLANS];
    
    // Если план бесплатный, просто добавляем звезды
    if (plan.price === 0) {
      const user = await prisma.user.update({
        where: { id: authReq.user.userId },
        data: {
          credits: {
            increment: plan.stars,
          },
        },
      });

      res.json({
        success: true,
        credits: user.credits,
        message: `Получено ${plan.stars} звезд`,
        sessionId: null,
        url: null,
      });
      return;
    }

    // Получаем пользователя для email
    const user = await prisma.user.findUnique({
      where: { id: authReq.user.userId },
    });

    if (!user) {
      res.status(404).json({ error: 'Пользователь не найден' });
      return;
    }

    // Создаем Stripe Checkout Session
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${plan.stars} Stars`,
              description: `Get ${plan.stars} stars for RetroImprover`,
            },
            unit_amount: plan.price,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${frontendUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/payment/cancel`,
      customer_email: user.email,
      metadata: {
        userId: user.id,
        planId: planId,
        stars: plan.stars.toString(),
      },
    });

    res.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error: any) {
    console.error('Ошибка при создании checkout session:', error);
    res.status(500).json({ error: 'Ошибка при создании платежной сессии' });
  }
};

/**
 * Webhook для обработки успешных платежей от Stripe
 */
export const handleStripeWebhook = async (req: Request, res: Response): Promise<void> => {
  const sig = req.headers['stripe-signature'];

  if (!sig) {
    res.status(400).send('No signature');
    return;
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET не установлен');
    res.status(500).send('Webhook secret not configured');
    return;
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  // Обрабатываем событие
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    try {
      const userId = session.metadata?.userId;
      const stars = parseInt(session.metadata?.stars || '0', 10);

      if (!userId || !stars) {
        console.error('Отсутствуют userId или stars в metadata');
        res.status(400).send('Invalid metadata');
        return;
      }

      // Добавляем звезды пользователю
      await prisma.user.update({
        where: { id: userId },
        data: {
          credits: {
            increment: stars,
          },
        },
      });

      console.log(`✅ Добавлено ${stars} звезд пользователю ${userId}`);
    } catch (error: any) {
      console.error('Ошибка при обработке платежа:', error);
      res.status(500).send('Error processing payment');
      return;
    }
  }

  res.json({ received: true });
};

/**
 * Проверяет статус платежа по session_id
 */
export const checkPaymentStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      res.status(401).json({ error: 'Неавторизован' });
      return;
    }

    const { sessionId } = req.query;

    if (!sessionId || typeof sessionId !== 'string') {
      res.status(400).json({ error: 'sessionId обязателен' });
      return;
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === 'paid') {
      // Получаем актуальный баланс пользователя
      const user = await prisma.user.findUnique({
        where: { id: authReq.user.userId },
        select: { credits: true },
      });

      res.json({
        success: true,
        paid: true,
        credits: user?.credits || 0,
      });
    } else {
      res.json({
        success: false,
        paid: false,
        paymentStatus: session.payment_status,
      });
    }
  } catch (error: any) {
    console.error('Ошибка при проверке статуса платежа:', error);
    res.status(500).json({ error: 'Ошибка при проверке статуса платежа' });
  }
};

