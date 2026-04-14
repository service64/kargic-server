import { Schema, model } from 'mongoose';
import { ILoginSession } from './loginSession.interface';

const loginSessionSchema = new Schema<ILoginSession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    deviceId: {
      type: String,
      required: true,
      index: true,
    },
    deviceType: { type: String, required: true, default: 'unknown' },
    os: { type: String, required: true, default: '' },
    browser: { type: String, required: true, default: '' },
    ip: { type: String, required: true, default: '' },
    userAgent: { type: String, required: true, default: '' },
    timezone: { type: String, required: true, default: '' }, 
  },
  {
    timestamps: false,
  },
);

loginSessionSchema.index({ userId: 1, deviceId: 1 });

export const LoginSession = model<ILoginSession>('LoginSession', loginSessionSchema);
