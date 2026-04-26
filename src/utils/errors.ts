export class AppError extends Error {
  public status_code: number;
  public is_operational: boolean;

  constructor(message: string, status_code: number = 500, is_operational: boolean = true) {
    super(message);
    this.status_code = status_code;
    this.is_operational = is_operational;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// Common error factories
export const bad_request = (msg: string) => new AppError(msg, 400);
export const unauthorized = (msg: string) => new AppError(msg, 401);
export const forbidden = (msg: string) => new AppError(msg, 403);
export const not_found = (msg: string) => new AppError(msg, 404);
export const conflict = (msg: string) => new AppError(msg, 409);
