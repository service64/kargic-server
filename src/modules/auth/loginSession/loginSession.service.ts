import { randomUUID } from 'crypto';
import httpStatus from 'http-status';
import { Types } from 'mongoose';
import AppError from '../../../errors/AppError';
import { LoginSession } from './loginSession.model';

/** One user may have at most this many concurrent login sessions (devices). */
export const MAX_LOGIN_SESSIONS_PER_USER = 2;

export type LoginSessionClientMeta = {
  deviceType?: string;
  os?: string;
  deviceId?: string; 
  browser?: string;
  timezone?: string;
  ip?: string;
  userAgent?: string;
};

export type PublicLoginSession = {
  sessionId: string;
  deviceId: string;
  deviceType: string;
  os: string;
  browser: string;
  ip: string;
  userAgent: string;
  timezone: string;
};

/** Normalized row shape: must match find + create so any field change creates a new session. */
const normalizedLoginMeta = (meta: LoginSessionClientMeta, deviceId: string) => ({
  deviceId,
  deviceType: meta.deviceType?.trim() || 'unknown',
  os: meta.os?.trim() ?? '',
  browser: meta.browser?.trim() ?? '',
  ip: meta.ip?.trim() ?? '',
  userAgent: meta.userAgent?.trim() ?? '',
  timezone: meta.timezone?.trim() ?? '',
});

const createLoginSession = async (userId: string | Types.ObjectId, meta: LoginSessionClientMeta) => {
  const oid = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
  const deviceId = meta.deviceId?.trim() || randomUUID();
  const row = normalizedLoginMeta(meta, deviceId);

  const existing = await LoginSession.findOne({
    userId: oid,
    deviceId: row.deviceId,
    deviceType: row.deviceType,
    os: row.os,
    browser: row.browser,
    ip: row.ip,
    userAgent: row.userAgent,
    timezone: row.timezone,
  }).exec();

  if (existing) {
    return {
      deviceId: existing.deviceId,
      sessionId: String(existing._id),
    };
  }

  const existingCount = await LoginSession.countDocuments({ userId: oid });
  if (existingCount >= MAX_LOGIN_SESSIONS_PER_USER) {
    throw new AppError(
      'Maximum active device limit reached. Verify your email to manage sessions and remove a device.',
      httpStatus.FORBIDDEN,
      'MAX_SESSIONS_REACHED',
    );
  }

  const doc = await LoginSession.create({
    userId: oid,
    ...row,
  });

  return {
    deviceId: doc.deviceId,
    sessionId: String(doc._id),
  };
};

const listSessionsForUser = async (userId: string | Types.ObjectId): Promise<PublicLoginSession[]> => {
  const oid = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
  const rows = await LoginSession.find({ userId: oid }).sort({ _id: -1 }).lean();
  return rows.map((s) => ({
    sessionId: String(s._id),
    deviceId: s.deviceId,
    deviceType: s.deviceType,
    os: s.os,
    browser: s.browser,
    ip: s.ip,
    userAgent: s.userAgent,
    timezone: s.timezone,
  }));
};

const deleteSessionsForUserByDeviceId = async (
  userId: string | Types.ObjectId,
  deviceId: string,
): Promise<void> => {
  const oid = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
  await LoginSession.deleteMany({ userId: oid, deviceId: deviceId.trim() });
};

const deleteSessionForUser = async (userId: string | Types.ObjectId, sessionId: string): Promise<void> => {
  if (!Types.ObjectId.isValid(sessionId)) {
    throw new AppError('Invalid session id', httpStatus.BAD_REQUEST);
  }
  const oid = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
  const result = await LoginSession.deleteOne({
    _id: new Types.ObjectId(sessionId),
    userId: oid,
  });
  if (result.deletedCount === 0) {
    throw new AppError('Session not found', httpStatus.NOT_FOUND);
  }
};

const deleteAllSessionsForUser = async (userId: string | Types.ObjectId): Promise<void> => {
  const oid = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
  await LoginSession.deleteMany({ userId: oid });
};

export const LoginSessionService = {
  createLoginSession,
  listSessionsForUser,
  deleteSessionsForUserByDeviceId,
  deleteSessionForUser,
  deleteAllSessionsForUser,
};
