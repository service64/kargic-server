import { Types } from "mongoose";

export interface ICategory {
  userId: Types.ObjectId;
  categoryName: string;
  description?: string;
  image?: Types.ObjectId;
  parentCategory?: Types.ObjectId | null;
  slug?: string;
  level?: number; // optional (0=root, 1=sub, 2=sub-sub)
  isDeleted?: boolean;
  deletedAt?: Date | null;
}
