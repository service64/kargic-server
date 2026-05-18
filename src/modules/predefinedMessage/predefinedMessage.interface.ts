import { Types } from 'mongoose';

export interface IPredefinedMessage {
  userId: Types.ObjectId;
  text: string;
  createdAt?: Date;
  updatedAt?: Date;
}
