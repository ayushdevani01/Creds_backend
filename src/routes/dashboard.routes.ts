import { Router } from 'express';
import * as dashboard_controller from '../controllers/dashboard.controller';
import { auth_middleware } from '../middleware/auth.middleware';

const router = Router();
router.use(auth_middleware);

router.get('/stats', dashboard_controller.get_stats);

export default router;
