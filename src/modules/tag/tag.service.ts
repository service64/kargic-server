import httpStatus from 'http-status';
import { Types } from 'mongoose';
import AppError from '../../errors/AppError';
import { Tag } from './tag.model';
import { ITag } from './tag.interface';

type CreatePayload = {
  userId: string;
  name: string;
  description?: string;
};

const makeSlug = (value: string) => {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

const createTagIntoDB = async (payload: CreatePayload) => {
  const name = payload.name.trim();
  if (!name) {
    throw new AppError('Tag name is required', httpStatus.BAD_REQUEST);
  }

  const exists = await Tag.findOne({
    userId: new Types.ObjectId(payload.userId),
    name,
    isDeleted: false,
  }).lean();
  if (exists) {
    throw new AppError('Tag already exists', httpStatus.CONFLICT);
  }

  const tagData: ITag = {
    userId: new Types.ObjectId(payload.userId),
    name,
    slug: makeSlug(name),
  };

  if (payload.description) {
    tagData.description = payload.description;
  }

  return Tag.create(tagData);
};

const getAllTagsFromDB = async (userId: string) => {
  return Tag.find({
    userId: new Types.ObjectId(userId),
    isDeleted: false,
  })
    .sort({ createdAt: -1 })
    .lean();
};

const deleteTagFromDB = async (userId: string, tagId: string) => {
  if (!Types.ObjectId.isValid(tagId)) {
    throw new AppError('Invalid id', httpStatus.BAD_REQUEST);
  }
  const doc = await Tag.findOneAndUpdate(
    {
      _id: new Types.ObjectId(tagId),
      userId: new Types.ObjectId(userId),
      isDeleted: false,
    },
    { $set: { isDeleted: true } },
    { returnDocument: 'after' },
  ).lean();

  if (!doc) {
    throw new AppError('Tag not found', httpStatus.NOT_FOUND);
  }
  return doc;
};

type UpdatePayload = {
  name?: string;
  description?: string | null;
};

const updateTagInDB = async (
  userId: string,
  tagId: string,
  payload: UpdatePayload,
) => {
  if (!Types.ObjectId.isValid(tagId)) {
    throw new AppError('Invalid id', httpStatus.BAD_REQUEST);
  }

  const tag = await Tag.findOne({
    _id: new Types.ObjectId(tagId),
    userId: new Types.ObjectId(userId),
    isDeleted: false,
  });
  if (!tag) {
    throw new AppError('Tag not found', httpStatus.NOT_FOUND);
  }

  if (typeof payload.name === 'string') {
    const name = payload.name.trim();
    if (!name) {
      throw new AppError('Tag name is required', httpStatus.BAD_REQUEST);
    }

    const duplicate = await Tag.findOne({
      _id: { $ne: tag._id },
      userId: new Types.ObjectId(userId),
      name,
      isDeleted: false,
    }).lean();
    if (duplicate) {
      throw new AppError('Tag already exists', httpStatus.CONFLICT);
    }

    tag.name = name;
    tag.slug = makeSlug(name);
  }

  if (payload.description === null) {
    tag.description = undefined;
  } else if (typeof payload.description === 'string') {
    tag.description = payload.description;
  }

  await tag.save();
  return tag.toObject();
};

export const TagService = {
  createTagIntoDB,
  getAllTagsFromDB,
  deleteTagFromDB,
  updateTagInDB,
};
