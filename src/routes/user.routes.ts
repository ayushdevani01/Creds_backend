import { Router } from 'express';
import * as user_controller from '../controllers/user.controller';
import { auth_middleware } from '../middleware/auth.middleware';
import { api_limiter } from '../middleware/rateLimiter';

const router = Router();

// All user routes require authentication
router.use(auth_middleware as any, api_limiter);

router.get('/profile', user_controller.get_profile as any);
router.put('/profile', user_controller.update_profile as any);
router.post('/social-accounts', user_controller.add_social_account as any);
router.get('/social-accounts', user_controller.list_social_accounts as any);
router.delete('/social-accounts/:id', user_controller.delete_social_account as any);
router.put('/ai-keys', user_controller.upsert_ai_keys as any);

export default router;
