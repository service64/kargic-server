import httpStatus from 'http-status';
import { Types } from 'mongoose';
import AppError from '../../errors/AppError';
import type { ContactUserType } from './contact.interface';
import { Contact } from './contact.model';

type SubmitContactPayload = {
  email: string;
  name: string;
  phone: string;
  userType?: ContactUserType;
  message: string;
};

const parsePositiveInt = (value: unknown, fallback: number) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(1, Math.floor(num));
};

const escapeRegexChars = (s: string) =>
  s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parseOptionalTrimmedString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const toObjectId = (id: string) => new Types.ObjectId(id);

const buildPaginationMeta = (page: number, limit: number, total: number) => {
  const totalPage = Math.max(1, Math.ceil(total / limit));
  return {
    page,
    limit,
    total,
    totalPage,
    hasNextPage: page < totalPage,
    hasPrevPage: page > 1,
  };
};

const submitContactMessageIntoDB = async (payload: SubmitContactPayload) => {
  const email = payload.email.trim().toLowerCase();
  const messageEntry = {
    name: payload.name.trim(),
    phone: payload.phone.trim(),
    userType: payload.userType ?? 'Importer',
    message: payload.message.trim(),
    isRead: false,
    createdAt: new Date(),
  };

  const existing = await Contact.findOne({ email });

  if (!existing) {
    const created = await Contact.create({
      email,
      hasNewMessage: true,
      newUnreadCount: 1,
      messages: [messageEntry],
    });

    return {
      _id: created._id,
      email: created.email,
      messageCount: created.messages.length,
    };
  }

  existing.messages.push(messageEntry);
  existing.hasNewMessage = true;
  existing.newUnreadCount += 1;
  await existing.save();

  return {
    _id: existing._id,
    email: existing.email,
    messageCount: existing.messages.length,
  };
};

const getAdminContactListFromDB = async (query: Record<string, unknown>) => {
  const page = parsePositiveInt(query.page, 1);
  const limit = Math.min(parsePositiveInt(query.limit, 10), 100);
  const skip = (page - 1) * limit;
  const searchTerm = parseOptionalTrimmedString(query.searchTerm);

  const filter: Record<string, unknown> = {};
  if (searchTerm) {
    const re = new RegExp(escapeRegexChars(searchTerm), 'i');
    filter.email = re;
  }

  const [rows, total] = await Promise.all([
    Contact.find(filter)
      .select('_id email hasNewMessage newUnreadCount updatedAt')
      .sort({ hasNewMessage: -1, newUnreadCount: -1, updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Contact.countDocuments(filter),
  ]);

  return {
    data: rows.map((row) => ({
      _id: String(row._id),
      email: row.email,
      hasNewMessage: row.hasNewMessage,
      newUnreadCount: row.newUnreadCount,
    })),
    meta: buildPaginationMeta(page, limit, total),
  };
};

const getAdminContactMessagesFromDB = async (
  contactId: string,
  query: Record<string, unknown>,
) => {
  const page = parsePositiveInt(query.page, 1);
  const limit = Math.min(parsePositiveInt(query.limit, 10), 100);
  const skip = (page - 1) * limit;

  const contact = await Contact.findById(contactId).lean();
  if (!contact) {
    throw new AppError('Contact not found', httpStatus.NOT_FOUND);
  }

  const sortedMessages = [...contact.messages].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const total = sortedMessages.length;
  const paginated = sortedMessages.slice(skip, skip + limit);

  return {
    _id: String(contact._id),
    email: contact.email,
    hasNewMessage: contact.hasNewMessage,
    newUnreadCount: contact.newUnreadCount,
    data: paginated.map((msg) => ({
      _id: String(msg._id),
      name: msg.name,
      phone: msg.phone,
      userType: msg.userType,
      message: msg.message,
      isRead: msg.isRead,
      createdAt: msg.createdAt,
    })),
    meta: buildPaginationMeta(page, limit, total),
  };
};

const markContactMessagesReadInDB = async (
  contactId: string,
  messageIds: string[],
) => {
  const contact = await Contact.findById(contactId);
  if (!contact) {
    throw new AppError('Contact not found', httpStatus.NOT_FOUND);
  }

  const idSet = new Set(messageIds.map((id) => id.trim()));
  let markedCount = 0;

  for (const msg of contact.messages) {
    const msgId = String(msg._id);
    if (idSet.has(msgId) && !msg.isRead) {
      msg.isRead = true;
      markedCount += 1;
    }
  }

  if (markedCount === 0) {
    return {
      _id: String(contact._id),
      email: contact.email,
      hasNewMessage: contact.hasNewMessage,
      newUnreadCount: contact.newUnreadCount,
      markedCount: 0,
    };
  }

  contact.newUnreadCount = Math.max(0, contact.newUnreadCount - markedCount);
  if (contact.newUnreadCount === 0) {
    contact.hasNewMessage = false;
  }

  contact.markModified('messages');
  await contact.save();

  return {
    _id: String(contact._id),
    email: contact.email,
    hasNewMessage: contact.hasNewMessage,
    newUnreadCount: contact.newUnreadCount,
    markedCount,
  };
};

export const ContactService = {
  submitContactMessageIntoDB,
  getAdminContactListFromDB,
  getAdminContactMessagesFromDB,
  markContactMessagesReadInDB,
  toObjectId,
};
