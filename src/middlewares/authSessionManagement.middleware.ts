import { Request, Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import AppError from '../errors/AppError';
import { verifySessionManagementToken } from '../utils/sessionManagementToken';

const extractBearer = (authorization: string | undefined): string | null => {
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return null;
  }
  return authorization.slice(7).trim() || null;
};

/**
 * Validates short-lived JWT from POST /sessions/verify-otp; sets `req.sessionMgmt`.
 */
export const authSessionManagement = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const token = extractBearer(req.headers.authorization);
    if (!token) {
      throw new AppError('Unauthorized', httpStatus.UNAUTHORIZED);
    }
    const decoded = verifySessionManagementToken(token);
    req.sessionMgmt = {
      userId: decoded.userId,
      email: decoded.email,
    };
    next();
  } catch (err) {
    if (err instanceof AppError) {
      next(err);
      return;
    }
    next(new AppError('Unauthorized', httpStatus.UNAUTHORIZED));
  }
};
