import { Router } from 'express';
import * as content_controller from '../controllers/content.controller';
import { auth_middleware } from '../middleware/auth.middleware';
import { generate_limiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/generate', auth_middleware, generate_limiter, content_controller.generate);

export default router;
