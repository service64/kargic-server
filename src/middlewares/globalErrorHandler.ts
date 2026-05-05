import { Request, Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import AppError from '../errors/AppError';

const mongoValidationErrors = (err: any) => {
  const errors: Record<string,string> = {};
  if (err && err.errors) {
    Object.keys(err.errors).forEach((key) => {
      errors[key] = err.errors[key].message;
    });
  }
  return errors;
};

const globalErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) return next(err);

  if (err?.name === 'MulterError') {
    const message =
      err.code === 'LIMIT_FILE_SIZE' ? 'File exceeds maximum allowed size' : err.message;
    return res.status(httpStatus.BAD_REQUEST).json({
      status: httpStatus.BAD_REQUEST,
      message,
      data: null,
    });
  }

  /** Multer fileFilter uses plain `Error` (not MulterError) — surface as 400. */
  if (
    typeof err?.message === 'string' &&
    err.message.includes('Only JPEG, PNG, and WebP')
  ) {
    return res.status(httpStatus.BAD_REQUEST).json({
      status: httpStatus.BAD_REQUEST,
      message: err.message,
      data: null,
    });
  }

  // Duplicate key
  if (err && (err.code === 11000 || (err.name === 'MongoServerError' && err.code === 11000))) {
    return res.status(httpStatus.CONFLICT).json({
      status: httpStatus.CONFLICT,
      message: 'Duplicate field value',
      data: null,
      errors: err.keyValue || null,
    });
  }

  // Mongoose cast error (invalid ObjectId)
  if (err && err.name === 'CastError') {
    return res.status(httpStatus.BAD_REQUEST).json({
      status: httpStatus.BAD_REQUEST,
      message: `Invalid ${err.path}: ${err.value}`,
      data: null,
    });
  }

  // Mongoose validation error
  if (err && err.name === 'ValidationError') {
    const errors = mongoValidationErrors(err);
    return res.status(httpStatus.BAD_REQUEST).json({
      status: httpStatus.BAD_REQUEST,
      message: 'Validation failed',
      data: null,
      errors,
    });
  }

  // Mongo network / connection errors
  if (err && (err.name === 'MongoNetworkError' || /failed to connect/i.test(err.message || ''))) {
    return res.status(httpStatus.SERVICE_UNAVAILABLE).json({
      status: httpStatus.SERVICE_UNAVAILABLE,
      message: 'Database connection failed',
      data: null,
    });
  }

  // AppError (operational)
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: err.statusCode,
      message: err.message,
      data: null,
      ...(err.code ? { code: err.code } : {}),
    });
  }

  // Fallback
  const statusCode = err.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
  const message = err.message || 'Internal Server Error';

  return res.status(statusCode).json({
    status: statusCode,
    message,
    data: null,
  });
};

export default globalErrorHandler;
