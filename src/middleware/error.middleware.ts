import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { send_error } from '../utils/response';

export function error_handler(err: Error, req: Request, res: Response, next: NextFunction) {
  if (err instanceof AppError) {
    return send_error(res, err.message, err.status_code);
  }

  // Prisma known errors
  if (err.constructor.name === 'PrismaClientKnownRequestError') {
    const prisma_err = err as any;
    if (prisma_err.code === 'P2002') {
      return send_error(res, 'A record with that value already exists', 409);
    }
    if (prisma_err.code === 'P2025') {
      return send_error(res, 'Record not found', 404);
    }
  }

  // Zod validation errors
  if (err.name === 'ZodError') {
    return send_error(res, JSON.stringify((err as any).errors), 400);
  }

  console.error('Unhandled error:', err);
  return send_error(res, 'Internal server error', 500);
}
