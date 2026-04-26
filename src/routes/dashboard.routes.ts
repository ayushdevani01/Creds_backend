import { Router } from 'express';
import * as dashboard_controller from '../controllers/dashboard.controller';
import { auth_middleware } from '../middleware/auth.middleware';
import { api_limiter } from '../middleware/rateLimiter';

const router = Router();
router.use(auth_middleware, api_limiter);

router.get('/stats', dashboard_controller.get_stats);

export default router;
