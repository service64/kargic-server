import { Request, Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import config from '../config';
import AppError from '../errors/AppError';
import { LoginSession } from '../modules/auth/loginSession/loginSession.model';
import type { ActiveRole } from '../modules/auth/user/user.interface';
import { USER_ACTIVE_ROLES } from '../modules/auth/user/user.interface';

export type JwtPayload = {
  userId: string;
  email: string;
  activeRole: ActiveRole;
  /** LoginSession `_id`; if present, session row must still exist or token is rejected. */
  lsid?: string;
};

const extractBearer = (authorization: string | undefined): string | null => {
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return null;
  }
  return authorization.slice(7).trim() || null;
};

const isActiveRole = (value: unknown): value is ActiveRole =>
  typeof value === 'string' && USER_ACTIVE_ROLES.some((r) => r === value);

/**
 * Verifies JWT, ensures `activeRole` is in `USER_ACTIVE_ROLES`, sets `req.user`.
 * If payload includes `lsid` (login-issued tokens), the LoginSession must still exist.
 */
export const auth =
  (...allowedActiveRoles: ActiveRole[]) =>
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = extractBearer(req.headers.authorization);
      if (!token) {
        throw new AppError('Unauthorized', httpStatus.UNAUTHORIZED);
      }

      if (!config.jwt_secret) {
        throw new AppError('Server misconfiguration', httpStatus.INTERNAL_SERVER_ERROR);
      }

      const decoded = jwt.verify(token, config.jwt_secret) as JwtPayload;

      if (!isActiveRole(decoded.activeRole)) {
        throw new AppError('Invalid or outdated token', httpStatus.UNAUTHORIZED);
      }

      const activeRole = decoded.activeRole;
 

      if (allowedActiveRoles.length > 0 && !allowedActiveRoles.includes(activeRole)) {
        throw new AppError('Forbidden', httpStatus.FORBIDDEN);
      }

      if (decoded.lsid) {
        if (!Types.ObjectId.isValid(decoded.lsid)) {
          throw new AppError('Unauthorized', httpStatus.UNAUTHORIZED);
        }
        const sessionOk = await LoginSession.exists({
          _id: new Types.ObjectId(decoded.lsid),
          userId: new Types.ObjectId(decoded.userId),
        });
        if (!sessionOk) {
          throw new AppError('Session ended. Please log in again.', httpStatus.UNAUTHORIZED);
        }
      } 
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        activeRole,
        ...(decoded.lsid ? { loginSessionId: decoded.lsid } : {}),
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
