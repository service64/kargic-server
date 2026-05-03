import { Types } from 'mongoose';

export interface IBrand {
  userId: Types.ObjectId;
  brandName: string;
  image: Types.ObjectId;
  slug: string;
}
