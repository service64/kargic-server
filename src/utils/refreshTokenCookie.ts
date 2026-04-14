import type { Response } from 'express';
import config from '../config';
import { jwtDurationToMs } from './jwtDurationMs';

type SameSiteOption = boolean | 'lax' | 'strict' | 'none';

const resolveSameSite = (): SameSiteOption => {
  const raw = (config.cookie_same_site || 'lax').toLowerCase();
  if (raw === 'strict' || raw === 'lax' || raw === 'none') {
    return raw;
  }
  return 'lax';
};

const resolveSecure = (): boolean => {
  if (config.cookie_force_secure) {
    return true;
  }
  if (config.cookie_force_insecure) {
    return false;
  }
  return config.is_production;
};

/**
 * HttpOnly refresh token cookie. `secure` / `sameSite` follow env + NODE_ENV (see `src/config`).
 * Browsers require `secure: true` when `sameSite` is `none`.
 */
export const setRefreshTokenCookie = (res: Response, refreshToken: string): void => {
  let sameSite = resolveSameSite();
  let secure = resolveSecure();
  if (sameSite === 'none' && !secure) {
    secure = true;
  }

  res.cookie(config.refresh_token_cookie_name, refreshToken, {
    httpOnly: true,
    secure,
    sameSite,
    maxAge: jwtDurationToMs(config.jwt_refresh_expires_in),
    path: config.refresh_token_cookie_path,
    ...(config.cookie_domain ? { domain: config.cookie_domain } : {}),
  });
};

export const clearRefreshTokenCookie = (res: Response): void => {
  let sameSite = resolveSameSite();
  let secure = resolveSecure();
  if (sameSite === 'none' && !secure) {
    secure = true;
  }

  res.clearCookie(config.refresh_token_cookie_name, {
    httpOnly: true,
    secure,
    sameSite,
    path: config.refresh_token_cookie_path,
    ...(config.cookie_domain ? { domain: config.cookie_domain } : {}),
  });
};
