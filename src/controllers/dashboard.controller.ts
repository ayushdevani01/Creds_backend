import { Response, NextFunction } from 'express';
import * as dashboard_service from '../services/dashboard.service';
import { send_success } from '../utils/response';
import { AuthRequest } from '../types';

export async function get_stats(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const stats = await dashboard_service.get_dashboard_stats(req.user!.id);
    return send_success(res, stats);
  } catch (err) { next(err); }
}
