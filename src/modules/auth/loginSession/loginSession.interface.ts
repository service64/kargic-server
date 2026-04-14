import { Types } from 'mongoose';

export interface ILoginSession {
  userId: Types.ObjectId;
  deviceId: string;
  deviceType: string;
  os: string;
  browser: string;
  ip: string;
  userAgent: string;
  timezone: string;
}
