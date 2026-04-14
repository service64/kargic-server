import jwt, { type SignOptions } from 'jsonwebtoken';
import type { Types } from 'mongoose';
import config from '../config';
import type { ActiveRole, IUser } from '../modules/auth/user/user.interface';

export type UserWithId = IUser & { _id: Types.ObjectId };

export type AfterSuccessLoginResult = {
  user: {
    id: string;
    email: string;
    role: IUser['activeRole'];
  };
  accessToken: string;
  refreshToken: string;
};

/**
 * @param loginSessionId When set (login flow), embedded as `lsid` so deleting that LoginSession invalidates access + refresh JWTs.
 * @param jwtActiveRole When set (e.g. super-admin login), overrides `user.activeRole` inside the JWT and response `user.role`.
 */
export const afterSuccessLogin = (
  user: UserWithId,
  loginSessionId?: string,
  jwtActiveRole?: ActiveRole,
): AfterSuccessLoginResult => {
  const accessSignOptions: SignOptions = {
    expiresIn: config.jwt_expires_in as SignOptions['expiresIn'],
  };
  const refreshSignOptions: SignOptions = {
    expiresIn: config.jwt_refresh_expires_in as SignOptions['expiresIn'],
  };

  const activeRole = jwtActiveRole ?? user.activeRole;

  const payload = {
    userId: String(user._id),
    email: user.email,
    activeRole,
    ...(loginSessionId ? { lsid: loginSessionId } : {}),
  };

  const accessToken = jwt.sign(payload, config.jwt_secret, accessSignOptions);

  const refreshToken = jwt.sign(
    { ...payload, type: 'refresh' as const },
    config.jwt_secret,
    refreshSignOptions,
  );

  return {
    user: {
      id: String(user._id),
      email: user.email,
      role: activeRole,
    },
    accessToken,
    refreshToken,
  };
};
