import { Schema, model } from 'mongoose';
import { IImage } from './image.interface';

const imageSchema = new Schema<IImage>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: false },
    size: { type: Number, required: true },
    name: { type: String, required: true },
    url: { type: String, required: true },
    r2_key: { type: String, required: true, unique: true },
    alt: { type: String, default: '', required: false },
    insertedBy: {
      type: String,
      enum: ['ADMIN', 'USER'],
      default: 'USER',
      required: false,
    },
    useCase: {
      type: String,
      enum: ['CATEGORY', 'LOGO', 'PRODUCT', 'USER', 'BANNER', 'MESSAGE'],
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

export const Image = model<IImage>('Image', imageSchema);
