  import { Types } from 'mongoose';  
import { PackageType } from '../../type/common.type';

export interface IUserStorage {
  userId: Types.ObjectId;
  package: PackageType;
  storage: {
    used: number;
    limit: number;
  };
  createdAt?: Date;
}
