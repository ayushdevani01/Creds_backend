import { Router } from 'express';
import * as post_controller from '../controllers/post.controller';
import { auth_middleware } from '../middleware/auth.middleware';
import { api_limiter } from '../middleware/rateLimiter';

const router = Router();
router.use(auth_middleware, api_limiter);

router.post('/publish', post_controller.publish);
router.post('/schedule', post_controller.schedule);
router.get('/', post_controller.list_posts);
router.get('/:id', post_controller.get_post);
router.post('/:id/retry', post_controller.retry_post);
router.delete('/:id', post_controller.delete_post);
router.post('/:id/restore', post_controller.restore_post);

export default router;
