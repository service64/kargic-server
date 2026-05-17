import { Types } from 'mongoose';

export interface ISavedProduct {
  userId: Types.ObjectId;
  productId: Types.ObjectId;
}

export interface ISavedProductDoc extends ISavedProduct {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
