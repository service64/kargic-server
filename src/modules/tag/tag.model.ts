import { Schema, model } from 'mongoose';
import { ITag } from './tag.interface';

const tagSchema = new Schema<ITag>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    description: { type: String, required: false, default: undefined },
    usageCount: { type: Number, required: false, default: 0, min: 0 },
    isDeleted: { type: Boolean, required: false, default: false },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

export const Tag = model<ITag>('Tag', tagSchema);

