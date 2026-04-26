import { Router } from 'express';
import * as content_controller from '../controllers/content.controller';
import { auth_middleware } from '../middleware/auth.middleware';

const router = Router();
router.use(auth_middleware);

router.post('/generate', content_controller.generate);

export default router;
