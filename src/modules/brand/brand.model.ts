import { Schema, model } from 'mongoose';
import { IBrand } from './brand.interface';

const brandSchema = new Schema<IBrand>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    brandName: { type: String, required: true, trim: true },
    image: { type: Schema.Types.ObjectId, ref: 'Image', required: true },
    slug: { type: String, required: true, unique: true, trim: true },
  },
  { timestamps: true },
);

brandSchema.index({ userId: 1 }, { unique: true });
brandSchema.index({ brandName: 1 }, { unique: true });

export const Brand = model<IBrand>('Brand', brandSchema);
