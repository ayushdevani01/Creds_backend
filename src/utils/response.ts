import { Response } from 'express';

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
}

export function send_success(res: Response, data: any, meta?: PaginationMeta, status: number = 200) {
  return res.status(status).json({
    data,
    meta: meta || null,
    error: null,
  });
}

export function send_error(res: Response, message: string, status: number = 500) {
  return res.status(status).json({
    data: null,
    meta: null,
    error: message,
  });
}
