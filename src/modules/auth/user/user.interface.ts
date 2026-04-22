import { Model } from 'mongoose';

/** Platform persona; keep enums in sync with `user.model`. */
export type ActiveRole = 'IMPORTER' | 'EXPORTER' | 'ADMIN';

/** All values allowed on `IUser.activeRole` / `roles[]` / JWT. */
export const USER_ACTIVE_ROLES = [
  'IMPORTER',
  'EXPORTER',
  'ADMIN',
] as const satisfies readonly ActiveRole[];

export type UserStatus = 'ACTIVE' | 'BLOCKED' | 'DELETED' | 'WARNING';

export interface IUser {
  /** Date of birth (YYYY-MM-DD). Persisted under `age` for backwards compatibility. */
  age: string;
  name: string;
  otp?: string;
  /** OTP emailed for managing login sessions (device list / revoke). */
  sessionMgmtOtp?: string;
  sessionMgmtOtpExpiresAt?: Date;
  /** OTP for forgot-password flow. */
  passwordResetOtp?: string;
  passwordResetOtpExpiresAt?: Date;
  /** Set when account is soft-deleted. */
  deletedAt?: Date;
  phone: string;
  email: string;
  password: string;
  roles: ActiveRole[];
  activeRole: ActiveRole;
  isVerified?: boolean;
  status: UserStatus;
}

export interface UserModel extends Model<IUser> {
  isUserExistsByEmail(email: string): Promise<IUser | null>;
}
