import jwt, { type SignOptions } from 'jsonwebtoken';
import config from '../config';

export const SESSION_MGMT_PURPOSE = 'session_mgmt' as const;

export type SessionManagementJwtPayload = {
  userId: string;
  email: string;
  purpose: typeof SESSION_MGMT_PURPOSE;
};

export const signSessionManagementToken = (userId: string, email: string): string => {
  const payload: SessionManagementJwtPayload = {
    userId,
    email,
    purpose: SESSION_MGMT_PURPOSE,
  };
  const options: SignOptions = {
    expiresIn: config.jwt_session_mgmt_expires_in as SignOptions['expiresIn'],
  };
  return jwt.sign(payload, config.jwt_secret, options);
};

export const verifySessionManagementToken = (token: string): SessionManagementJwtPayload => {
  const decoded = jwt.verify(token, config.jwt_secret) as SessionManagementJwtPayload;
  if (decoded.purpose !== SESSION_MGMT_PURPOSE) {
    throw new Error('Invalid session management token');
  }
  return decoded;
};
