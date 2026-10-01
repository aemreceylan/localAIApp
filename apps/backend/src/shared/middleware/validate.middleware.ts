import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';
import { ValidationError } from '@/shared/errors/index.js';

export interface RequestValidationSchema {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
  headers?: ZodSchema;
}

interface ValidationIssue {
  field: string;
  message: string;
}

function validateParams(schema: ZodSchema, req: Request, issues: ValidationIssue[]): void {
  const result = schema.safeParse(req.params);
  if (!result.success) {
    issues.push(
      ...result.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      }))
    );
  } else {
    req.params = result.data as Record<string, string>;
  }
}

function validateQuery(schema: ZodSchema, req: Request, issues: ValidationIssue[]): void {
  const result = schema.safeParse(req.query);
  if (!result.success) {
    issues.push(
      ...result.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      }))
    );
  } else if (result.data && typeof result.data === 'object') {
    for (const key of Object.keys(req.query)) {
      delete (req.query as Record<string, any>)[key];
    }
    Object.assign(req.query, result.data);
  }
}

function validateBody(schema: ZodSchema, req: Request, issues: ValidationIssue[]): void {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    issues.push(
      ...result.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      }))
    );
  } else {
    req.body = result.data;
  }
}

function validateHeaders(schema: ZodSchema, req: Request, issues: ValidationIssue[]): void {
  const result = schema.safeParse(req.headers);
  if (!result.success) {
    issues.push(
      ...result.error.issues.map((i) => ({
        field: `headers.${i.path.join('.')}`,
        message: i.message,
      }))
    );
  }
}

/**
 * Gelen HTTP isteklerinin (body, query, params, headers) Zod şemaları ile doğrulanmasını
 * ve sanitize edilmiş verilerin Request nesnesine atanmasını sağlayan generic middleware.
 */
export const validateRequest = (schemas: RequestValidationSchema) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const issues: ValidationIssue[] = [];

      if (schemas.params) {
        validateParams(schemas.params, req, issues);
      }
      if (schemas.query) {
        validateQuery(schemas.query, req, issues);
      }
      if (schemas.body) {
        validateBody(schemas.body, req, issues);
      }
      if (schemas.headers) {
        validateHeaders(schemas.headers, req, issues);
      }

      if (issues.length > 0) {
        throw new ValidationError('Geçersiz istek verileri.', issues);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
