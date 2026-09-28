export abstract class AppError extends Error {
  abstract readonly statusCode: number;
  abstract readonly code: string;
  readonly isOperational: boolean;
  readonly details?: unknown;

  constructor(message: string, details?: unknown, isOperational = true) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.isOperational = isOperational;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}