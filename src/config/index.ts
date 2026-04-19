const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

const defaultCorsOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'https://kargic.com',
];

const corsOriginsFromEnv = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  : [];

export default {
  smtp_host: process.env.SMTP_HOST as string,
  smtp_port: process.env.SMTP_PORT as string,
  smtp_user: process.env.SMTP_USER as string,
  smtp_pass: process.env.SMTP_PASS as string,
  smtp_from: process.env.SMTP_FROM as string,
  database_url: process.env.DATABASE_URL as string,
  port: process.env.PORT || 3000,
  node_env: nodeEnv,
  is_production: isProduction,
  jwt_secret: process.env.JWT_SECRET as string,
  jwt_expires_in: process.env.JWT_EXPIRES_IN || '1d',
  jwt_refresh_expires_in: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  /** Short-lived JWT after OTP to list/remove sessions when login is blocked. */
  jwt_session_mgmt_expires_in: process.env.JWT_SESSION_MGMT_EXPIRES_IN || '15m',
  /**
   * Bootstrap + first login for `POST /user/super-admin/login`.
   * If no SUPER_ADMIN exists, a matching email/password creates User + Admin + placeholder images.
   */
  super_admin_email: (process.env.SUPER_ADMIN_EMAIL || '').trim(),
  super_admin_password: process.env.SUPER_ADMIN_PASSWORD || '',

  /** HttpOnly cookie name for refresh token (super-admin login). */
  refresh_token_cookie_name:
    process.env.REFRESH_TOKEN_COOKIE_NAME || 'refreshToken',
  /** Cookie path; use `/api/v1` if you only want it sent to API routes. */
  refresh_token_cookie_path: process.env.REFRESH_TOKEN_COOKIE_PATH || '/',
  /** e.g. `.yourdomain.com` for subdomains; omit in dev. */
  cookie_domain: (process.env.COOKIE_DOMAIN || '').trim() || undefined,
  /** `lax` (default), `strict`, or `none` (cross-site; requires HTTPS + secure cookie). */
  cookie_same_site: (process.env.COOKIE_SAME_SITE || 'lax').toLowerCase(),
  /** Force `Secure` cookie even in development (e.g. HTTPS local). */
  cookie_force_secure: process.env.COOKIE_SECURE === 'true',
  /** Force non-secure cookie (local HTTP); overrides production when `true`. */
  cookie_force_insecure: process.env.COOKIE_INSECURE === 'true',

  /** Allowed browser origins for credentialed CORS (`credentials: 'include'`). */
  cors_origins:
    corsOriginsFromEnv.length > 0 ? corsOriginsFromEnv : defaultCorsOrigins,
};
