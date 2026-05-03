import { Types } from 'mongoose';

export interface ITag {
  userId: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  usageCount?: number;
  isDeleted?: boolean;
  createdAt?: Date;
}

