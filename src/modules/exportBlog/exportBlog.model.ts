import { Schema, model } from 'mongoose';
import { IExportBlog } from './exportBlog.interface';

const exportBlogSchema = new Schema<IExportBlog>(
  {
    authorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    excerpt: {
      type: String,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    tag: {
      type: String,
      trim: true,
    },
    featuredImage: {
      type: Schema.Types.ObjectId,
      ref: 'Image',
    },
    readTimeMinutes: {
      type: Number,
      min: 1,
    },
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft',
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    publishNotificationSentAt: {
      type: Date,
      default: null,
    },
    seo: {
      title: { type: String, trim: true },
      description: { type: String, trim: true },
      image: { type: Schema.Types.ObjectId, ref: 'Image' },
      keywords: [{ type: String, trim: true }],
    },
  },
  { timestamps: true },
);

exportBlogSchema.index({ status: 1, publishedAt: -1 });
exportBlogSchema.index({ isFeatured: 1, status: 1 });

export const ExportBlog = model<IExportBlog>('ExportBlog', exportBlogSchema);
