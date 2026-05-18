import httpStatus from 'http-status';
import { Types } from 'mongoose';
import AppError from '../../errors/AppError';
import { PredefinedMessage } from './predefinedMessage.model';
import {
  PREDEFINED_MESSAGE_MAX_LENGTH,
  PREDEFINED_MESSAGE_MAX_PER_USER,
} from './predefinedMessage.constants';

const toObjectId = (id: string) => new Types.ObjectId(id);

const assertValidMessageText = (text: string) => {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new AppError('Message is required', httpStatus.BAD_REQUEST);
  }
  if (trimmed.length > PREDEFINED_MESSAGE_MAX_LENGTH) {
    throw new AppError(
      `Message must be at most ${PREDEFINED_MESSAGE_MAX_LENGTH} characters`,
      httpStatus.BAD_REQUEST,
    );
  }
  return trimmed;
};

const createPredefinedMessageIntoDB = async (userId: string, text: string) => {
  const trimmed = assertValidMessageText(text);

  const count = await PredefinedMessage.countDocuments({
    userId: toObjectId(userId),
  });
  if (count >= PREDEFINED_MESSAGE_MAX_PER_USER) {
    throw new AppError(
      `You can save at most ${PREDEFINED_MESSAGE_MAX_PER_USER} predefined messages`,
      httpStatus.FORBIDDEN,
    );
  }

  return PredefinedMessage.create({
    userId: toObjectId(userId),
    text: trimmed,
  });
};

const getAllPredefinedMessagesFromDB = async (userId: string) => {
  return PredefinedMessage.find({ userId: toObjectId(userId) })
    .sort({ updatedAt: -1, createdAt: -1 })
    .lean();
};

const updatePredefinedMessageInDB = async (
  userId: string,
  messageId: string,
  text: string,
) => {
  if (!Types.ObjectId.isValid(messageId)) {
    throw new AppError('Invalid id', httpStatus.BAD_REQUEST);
  }
  const trimmed = assertValidMessageText(text);

  const doc = await PredefinedMessage.findOneAndUpdate(
    {
      _id: toObjectId(messageId),
      userId: toObjectId(userId),
    },
    { $set: { text: trimmed } },
    { returnDocument: 'after', runValidators: true },
  ).lean();

  if (!doc) {
    throw new AppError('Predefined message not found', httpStatus.NOT_FOUND);
  }
  return doc;
};

const deletePredefinedMessageFromDB = async (
  userId: string,
  messageId: string,
) => {
  if (!Types.ObjectId.isValid(messageId)) {
    throw new AppError('Invalid id', httpStatus.BAD_REQUEST);
  }

  const doc = await PredefinedMessage.findOneAndDelete({
    _id: toObjectId(messageId),
    userId: toObjectId(userId),
  }).lean();

  if (!doc) {
    throw new AppError('Predefined message not found', httpStatus.NOT_FOUND);
  }
  return doc;
};

export const PredefinedMessageService = {
  createPredefinedMessageIntoDB,
  getAllPredefinedMessagesFromDB,
  updatePredefinedMessageInDB,
  deletePredefinedMessageFromDB,
};
