import httpStatus from 'http-status';
import { Types } from 'mongoose';
import AppError from '../../errors/AppError';
import { Image } from '../media/image.model';
import { IExportBlog } from './exportBlog.interface';
import { ExportBlog } from './exportBlog.model';

type CreatePayload = {
  authorId: string;
  title: string;
  excerpt?: string;
  content: string;
  tag?: string;
  featuredImage?: string;
  readTimeMinutes?: number;
  isFeatured?: boolean;
  status?: 'draft' | 'published';
  seo?: {
    title?: string;
    description?: string;
    image?: string | null;
    keywords?: string[];
  };
};

const makeSlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const estimateReadTime = (html: string): number => {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const words = text ? text.split(' ').length : 0;
  return Math.max(1, Math.ceil(words / 200));
};

const populateOptions = [
  { path: 'featuredImage', select: '_id url name alt' },
  { path: 'seo.image', select: '_id url name alt' },
  { path: 'authorId', select: '_id email' },
];

const ensureUniqueSlug = async (baseSlug: string, excludeId?: string) => {
  let slug = baseSlug;
  let counter = 1;
  while (true) {
    const exists = await ExportBlog.findOne({
      slug,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    }).lean();
    if (!exists) return slug;
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }
};

const validateImageRef = async (imageId: string) => {
  const imageDoc = await Image.findById(imageId).lean();
  if (!imageDoc) {
    throw new AppError('Image not found', httpStatus.BAD_REQUEST);
  }
};

const createExportBlogIntoDB = async (payload: CreatePayload) => {
  const title = payload.title.trim();
  const baseSlug = makeSlug(title);
  const slug = await ensureUniqueSlug(baseSlug);

  if (payload.featuredImage) {
    await validateImageRef(payload.featuredImage);
  }

  if (payload.seo?.image) {
    await validateImageRef(payload.seo.image);
  }

  const status = payload.status ?? 'draft';
  const blogData: IExportBlog = {
    authorId: new Types.ObjectId(payload.authorId),
    title,
    slug,
    content: payload.content,
    status,
    readTimeMinutes: payload.readTimeMinutes ?? estimateReadTime(payload.content),
  };

  if (payload.excerpt) blogData.excerpt = payload.excerpt.trim();
  if (payload.tag) blogData.tag = payload.tag.trim();
  if (payload.featuredImage) {
    blogData.featuredImage = new Types.ObjectId(payload.featuredImage);
  }
  if (payload.isFeatured !== undefined) blogData.isFeatured = payload.isFeatured;

  if (payload.seo) {
    blogData.seo = {};
    if (payload.seo.title) blogData.seo.title = payload.seo.title.trim();
    if (payload.seo.description) {
      blogData.seo.description = payload.seo.description.trim();
    }
    if (payload.seo.image) {
      blogData.seo.image = new Types.ObjectId(payload.seo.image);
    }
    if (payload.seo.keywords?.length) {
      blogData.seo.keywords = payload.seo.keywords.map((k) => k.trim()).filter(Boolean);
    }
  }

  if (status === 'published') {
    blogData.publishedAt = new Date();
  }

  return ExportBlog.create(blogData);
};

const getPublishedBlogsFromDB = async () => {
  return ExportBlog.find({ status: 'published' })
    .populate(populateOptions)
    .sort({ isFeatured: -1, publishedAt: -1, createdAt: -1 });
};

const getPublishedBlogBySlugFromDB = async (slug: string) => {
  const normalized = slug.trim().toLowerCase();
  const doc = await ExportBlog.findOne({ slug: normalized, status: 'published' })
    .populate(populateOptions)
    .lean();

  if (!doc) {
    throw new AppError('Blog not found', httpStatus.NOT_FOUND);
  }
  return doc;
};

const getAllBlogsForAdminFromDB = async () => {
  return ExportBlog.find()
    .populate(populateOptions)
    .sort({ updatedAt: -1 });
};

const getBlogByIdForAdminFromDB = async (id: string) => {
  const doc = await ExportBlog.findById(id).populate(populateOptions);
  if (!doc) {
    throw new AppError('Blog not found', httpStatus.NOT_FOUND);
  }
  return doc;
};

const updateBlogInDB = async (id: string, body: Record<string, unknown>) => {
  const blog = await ExportBlog.findById(id);
  if (!blog) {
    throw new AppError('Blog not found', httpStatus.NOT_FOUND);
  }

  if (typeof body.title === 'string') {
    blog.title = body.title.trim();
    const baseSlug = makeSlug(blog.title);
    blog.slug = await ensureUniqueSlug(baseSlug, id);
  }

  if (body.excerpt === null) {
    blog.excerpt = undefined;
  } else if (typeof body.excerpt === 'string') {
    blog.excerpt = body.excerpt.trim();
  }

  if (typeof body.content === 'string') {
    blog.content = body.content;
    if (body.readTimeMinutes === undefined) {
      blog.readTimeMinutes = estimateReadTime(body.content);
    }
  }

  if (body.tag === null) {
    blog.tag = undefined;
  } else if (typeof body.tag === 'string') {
    blog.tag = body.tag.trim();
  }

  if (body.featuredImage === null) {
    blog.featuredImage = undefined;
  } else if (typeof body.featuredImage === 'string') {
    await validateImageRef(body.featuredImage);
    blog.featuredImage = new Types.ObjectId(body.featuredImage);
  }

  if (body.readTimeMinutes === null) {
    blog.readTimeMinutes = estimateReadTime(blog.content);
  } else if (typeof body.readTimeMinutes === 'number') {
    blog.readTimeMinutes = body.readTimeMinutes;
  }

  if (typeof body.isFeatured === 'boolean') {
    blog.isFeatured = body.isFeatured;
  }

  if (body.seo === null) {
    blog.seo = undefined;
  } else if (body.seo && typeof body.seo === 'object') {
    const seo = body.seo as Record<string, unknown>;
    if (!blog.seo) blog.seo = {};

    if (typeof seo.title === 'string') blog.seo.title = seo.title.trim();
    if (typeof seo.description === 'string') {
      blog.seo.description = seo.description.trim();
    }
    if (seo.image === null) {
      blog.seo.image = undefined;
    } else if (typeof seo.image === 'string') {
      await validateImageRef(seo.image);
      blog.seo.image = new Types.ObjectId(seo.image);
    }
    if (Array.isArray(seo.keywords)) {
      blog.seo.keywords = seo.keywords
        .filter((k): k is string => typeof k === 'string')
        .map((k) => k.trim())
        .filter(Boolean);
    }
  }

  if (body.status === 'published' && blog.status !== 'published') {
    blog.status = 'published';
    blog.publishedAt = new Date();
  } else if (body.status === 'draft') {
    blog.status = 'draft';
    blog.publishedAt = null;
  }

  await blog.save();
  return blog.populate(populateOptions);
};

const publishBlogInDB = async (id: string) => {
  const blog = await ExportBlog.findById(id);
  if (!blog) {
    throw new AppError('Blog not found', httpStatus.NOT_FOUND);
  }
  blog.status = 'published';
  blog.publishedAt = new Date();
  await blog.save();
  return blog.populate(populateOptions);
};

const unpublishBlogInDB = async (id: string) => {
  const blog = await ExportBlog.findById(id);
  if (!blog) {
    throw new AppError('Blog not found', httpStatus.NOT_FOUND);
  }
  blog.status = 'draft';
  blog.publishedAt = null;
  await blog.save();
  return blog.populate(populateOptions);
};

const deleteBlogFromDB = async (id: string) => {
  const doc = await ExportBlog.findByIdAndDelete(id);
  if (!doc) {
    throw new AppError('Blog not found', httpStatus.NOT_FOUND);
  }
  return doc;
};

export const ExportBlogService = {
  createExportBlogIntoDB,
  getPublishedBlogsFromDB,
  getPublishedBlogBySlugFromDB,
  getAllBlogsForAdminFromDB,
  getBlogByIdForAdminFromDB,
  updateBlogInDB,
  publishBlogInDB,
  unpublishBlogInDB,
  deleteBlogFromDB,
};
