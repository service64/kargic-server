import { Schema, model } from 'mongoose';
import type { ISavedProductDoc } from './savedProduct.interface';

const savedProductSchema = new Schema<ISavedProductDoc>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

savedProductSchema.index({ userId: 1, productId: 1 }, { unique: true });

export const SavedProduct = model<ISavedProductDoc>(
  'SavedProduct',
  savedProductSchema,
);
