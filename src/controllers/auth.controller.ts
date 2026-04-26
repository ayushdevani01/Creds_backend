import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as auth_service from '../services/auth.service';
import { send_success } from '../utils/response';
import { AuthRequest } from '../types';

// Validation schemas
const register_schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(100),
});

const login_schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refresh_schema = z.object({
  refresh_token: z.string().uuid(),
});

const logout_schema = z.object({
  refresh_token: z.string().uuid(),
});

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password, name } = register_schema.parse(req.body);
    const result = await auth_service.register(email, password, name);
    return send_success(res, result, undefined, 201);
  } catch (err) { next(err); }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = login_schema.parse(req.body);
    const result = await auth_service.login(email, password);
    return send_success(res, result);
  } catch (err) { next(err); }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const { refresh_token } = refresh_schema.parse(req.body);
    const result = await auth_service.refresh(refresh_token);
    return send_success(res, result);
  } catch (err) { next(err); }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const { refresh_token } = logout_schema.parse(req.body);
    await auth_service.logout(refresh_token);
    return send_success(res, { message: 'Logged out successfully' });
  } catch (err) { next(err); }
}

export async function me(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await auth_service.get_me(req.user!.id);
    return send_success(res, user);
  } catch (err) { next(err); }
}
