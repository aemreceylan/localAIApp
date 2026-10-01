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

  static badRequest(message: string, details?: unknown): DomainError {
    return new DomainError(message, details);
  }

  static notFound(message = 'Kaynak bulunamadı', details?: unknown): NotFoundError {
    return new NotFoundError(message, details);
  }

  static validation(message = 'Doğrulama hatası', details?: unknown): ValidationError {
    return new ValidationError(message, details);
  }

  static unauthorizedTenant(
    message = 'Bu tenant verisine erişim yetkiniz yok',
    details?: unknown
  ): UnauthorizedTenantError {
    return new UnauthorizedTenantError(message, details);
  }

  static llmProvider(
    message = 'Model servis sağlayıcısı ile iletişim kurulamadı',
    details?: unknown
  ): LLMProviderError {
    return new LLMProviderError(message, details);
  }
}

export class DomainError extends AppError {
  readonly statusCode = 400;
  readonly code = 'DOMAIN_ERROR';

  constructor(message = 'İş kuralı ihlali gerçekleşti', details?: unknown, isOperational = true) {
    super(message, details, isOperational);
  }
}

export class NotFoundError extends AppError {
  readonly statusCode = 404;
  readonly code = 'NOT_FOUND';

  constructor(message = 'Kaynak bulunamadı', details?: unknown, isOperational = true) {
    super(message, details, isOperational);
  }
}

export class ValidationError extends AppError {
  readonly statusCode = 422;
  readonly code = 'VALIDATION_ERROR';

  constructor(message = 'Doğrulama hatası', details?: unknown, isOperational = true) {
    super(message, details, isOperational);
  }
}

export class UnauthorizedTenantError extends AppError {
  readonly statusCode = 403;
  readonly code = 'UNAUTHORIZED_TENANT';

  constructor(
    message = 'Bu tenant verisine erişim yetkiniz yok',
    details?: unknown,
    isOperational = true
  ) {
    super(message, details, isOperational);
  }
}

export class LLMProviderError extends AppError {
  readonly statusCode = 502;
  readonly code = 'LLM_PROVIDER_ERROR';

  constructor(
    message = 'Model servis sağlayıcısı ile iletişim kurulamadı',
    details?: unknown,
    isOperational = true
  ) {
    super(message, details, isOperational);
  }
}

export class UnauthorizedError extends AppError {
  readonly statusCode = 401;
  readonly code = 'UNAUTHORIZED';

  constructor(
    message = 'Bu işlem için kimlik doğrulaması gereklidir.',
    details?: unknown,
    isOperational = true
  ) {
    super(message, details, isOperational);
  }
}

export class ForbiddenError extends AppError {
  readonly statusCode = 403;
  readonly code = 'FORBIDDEN';

  constructor(
    message = 'Bu işlem için yetkiniz bulunmamaktadır.',
    details?: unknown,
    isOperational = true
  ) {
    super(message, details, isOperational);
  }
}