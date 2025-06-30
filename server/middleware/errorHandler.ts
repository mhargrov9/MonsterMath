import { Request, Response, NextFunction } from 'express';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

/**
 * Professional error handling middleware
 * Catches all errors and returns consistent JSON responses
 */
export function errorHandler(
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Log error for monitoring
  console.error(`[${new Date().toISOString()}] Error in ${req.method} ${req.path}:`, {
    message: err.message,
    stack: err.stack,
    code: err.code,
    details: err.details
  });

  // Determine status code
  const statusCode = err.statusCode || 500;

  // Prepare error response
  const errorResponse = {
    success: false,
    error: {
      message: err.message || 'Internal server error',
      code: err.code || 'INTERNAL_ERROR',
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method
    }
  };

  // Add details in development
  if (process.env.NODE_ENV === 'development') {
    (errorResponse.error as any).stack = err.stack;
    (errorResponse.error as any).details = err.details;
  }

  res.status(statusCode).json(errorResponse);
}

/**
 * Not found handler
 */
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: {
      message: 'Resource not found',
      code: 'NOT_FOUND',
      path: req.path,
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Request validation middleware factory
 */
export function validateRequest(schema: any) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body);

    if (error) {
      const apiError: ApiError = new Error('Validation error');
      apiError.statusCode = 400;
      apiError.code = 'VALIDATION_ERROR';
      apiError.details = error.details;
      return next(apiError);
    }

    req.body = value;
    next();
  };
}