import { Types } from 'mongoose';

export interface IUserBlockDoc {
  blockerId: Types.ObjectId;
  blockedId: Types.ObjectId;
  createdAt?: Date;
}
