import { Schema, model } from 'mongoose';
import {
  ISitemapEntry,
  SITEMAP_CHANGE_FREQUENCIES,
} from './sitemap.interface';

const sitemapEntrySchema = new Schema<ISitemapEntry>(
  {
    url: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      default: '/',
    },
    changeFrequency: {
      type: String,
      enum: SITEMAP_CHANGE_FREQUENCIES,
      default: 'monthly',
    },
    priority: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
      default: 0.5,
    },
    lastModified: {
      type: Date,
      required: true,
      default: Date.now,
    },
    enabled: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true },
);

export const SitemapEntry = model<ISitemapEntry>(
  'SitemapEntry',
  sitemapEntrySchema,
);
