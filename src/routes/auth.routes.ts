import { Router } from 'express';
import * as auth_controller from '../controllers/auth.controller';
import { auth_middleware } from '../middleware/auth.middleware';

const router = Router();

router.post('/register', auth_controller.register);
router.post('/login', auth_controller.login);
router.post('/refresh', auth_controller.refresh);
router.post('/logout', auth_controller.logout);
router.get('/me', auth_middleware, auth_controller.me);

// Twitter OAuth
router.get('/twitter', auth_middleware, auth_controller.twitter_oauth_start);
router.get('/twitter/callback', auth_controller.twitter_oauth_callback);

export default router;
