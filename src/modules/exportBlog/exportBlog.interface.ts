import { Types } from 'mongoose';

export type ExportBlogStatus = 'draft' | 'published';

export interface IExportBlogSeo {
  title?: string;
  description?: string;
  image?: Types.ObjectId;
  keywords?: string[];
}

export interface IExportBlog {
  authorId: Types.ObjectId;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  tag?: string;
  featuredImage?: Types.ObjectId;
  readTimeMinutes?: number;
  status: ExportBlogStatus;
  publishedAt?: Date | null;
  isFeatured?: boolean;
  seo?: IExportBlogSeo;
  /** Set when publish notification emails have been sent to active users. */
  publishNotificationSentAt?: Date | null;
}
