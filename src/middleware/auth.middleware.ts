import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthRequest } from '../types';
import { send_error } from '../utils/response';

export function auth_middleware(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return send_error(res, 'Missing or invalid authorization header', 401);
  }

  const token = header.split(' ')[1];

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { user_id: string; email: string };
    req.user = { id: payload.user_id, email: payload.email };
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return send_error(res, 'Access token expired', 401);
    }
    return send_error(res, 'Invalid access token', 401);
  }
}
