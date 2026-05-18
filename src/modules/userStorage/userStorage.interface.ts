import { Types } from 'mongoose';
import {
  PackageType,
  StorageLimitMb,
} from '../../type/common.type';

export interface IUserStorage {
  userId: Types.ObjectId;
  paymentStatus?: 'PAID' | 'UNPAID';
  paymentDate?: Date;
  paymentAmount?: number;
  paymentMethod?: 'CARD' | 'PAYPAL' | 'STRIPE';
  package: PackageType;
  storage: {
    used: number;
    limit: StorageLimitMb;
  };
  createdAt?: Date;
}
