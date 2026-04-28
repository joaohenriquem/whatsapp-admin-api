import { Router } from 'express';
import { apiKeyMiddleware } from '../middlewares/apikey.middleware';
import { rateLimiterMiddleware } from '../middlewares/rate-limiter.middleware';
import { jwtMiddleware } from '../middlewares/jwt.middleware';
import { WebhookController } from '../controllers/webhook.controller';
import { StatsController } from '../controllers/stats.controller';
import { MessagesController } from '../controllers/messages.controller';

const router = Router();
const webhookController = new WebhookController();
const statsController = new StatsController();
const messagesController = new MessagesController();

// Webhook: POST /api/messages → apiKey + rateLimiter
router.post('/', apiKeyMiddleware, rateLimiterMiddleware, (req, res, next) => {
  webhookController.createMessage(req, res).catch(next);
});

// IMPORTANT: /stats and /export MUST be defined BEFORE /:id
router.get('/stats', jwtMiddleware, (req, res, next) => {
  statsController.getStats(req, res).catch(next);
});

router.get('/export', jwtMiddleware, (req, res, next) => {
  messagesController.exportCsv(req, res).catch(next);
});

router.get('/:id', jwtMiddleware, (req, res, next) => {
  messagesController.getById(req, res).catch(next);
});

router.get('/', jwtMiddleware, (req, res, next) => {
  messagesController.list(req, res).catch(next);
});

export default router;
