import { Schema, model } from 'mongoose';
import { ISeoMetadata } from './seo.interface';

const seoMetadataSchema = new Schema<ISeoMetadata>(
  {
    page: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    keywords: [{ type: String, trim: true }],
    ogTitle: { type: String, trim: true },
    ogDescription: { type: String, trim: true },
    ogImage: { type: Schema.Types.ObjectId, ref: 'Image' },
  },
  { timestamps: true },
);

export const SeoMetadata = model<ISeoMetadata>('SeoMetadata', seoMetadataSchema);
