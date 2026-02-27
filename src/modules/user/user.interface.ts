import { Model } from 'mongoose';

export type UserRole = 'USER' | 'ADMIN';

export interface IUser {
  role: UserRole;
  age: number;
  otp?: string;
  isVerified?: boolean;
  phone: string;
  email: string;
  password: string;
}

export interface UserModel extends Model<IUser> {
  isUserExistsByEmail(email: string): Promise<IUser | null>;
}
