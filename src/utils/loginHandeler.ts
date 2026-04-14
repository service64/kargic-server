import type { NextFunction, Request, Response } from 'express';

function extractOS(ua: string) {
  if (ua.includes('Mac')) return 'macOS';
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iPhone')) return 'iOS';
  return 'Unknown';
}

function extractBrowser(ua: string) {
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari')) return 'Safari';
  return 'Unknown';
}

export const loginHandler = (req: Request, _res: Response, next: NextFunction) => {
  const userAgent = req.headers['user-agent'] || '';

  const deviceInfo = {
    deviceType: /mobile/i.test(userAgent) ? 'mobile' : 'web',
    os: extractOS(userAgent),
    browser: extractBrowser(userAgent),
    timezone: req.headers['x-timezone'] || 'unknown',
    ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '',
  };

  req.body = { ...req.body, ...deviceInfo };
  return next();
};
