import { Router } from 'express';
import express from 'express';
import { createCheckoutSession, handleStripeWebhook, checkPaymentStatus } from '../controllers/paymentController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Webhook должен быть без authenticate (Stripe отправляет напрямую)
router.post('/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

// Остальные роуты требуют аутентификации
router.post('/checkout', authenticate, createCheckoutSession);
router.get('/status', authenticate, checkPaymentStatus);

export default router;

