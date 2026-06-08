import { Document, Model, Types } from 'mongoose';

export const CONTACT_USER_TYPES = ['Importer', 'Exporter'] as const;

export type ContactUserType = (typeof CONTACT_USER_TYPES)[number];

export type IContactMessage = {
  _id?: Types.ObjectId;
  name: string;
  phone: string;
  userType: ContactUserType;
  message: string;
  isRead: boolean;
  createdAt: Date;
};

export type IContact = {
  email: string;
  hasNewMessage: boolean;
  newUnreadCount: number;
  messages: IContactMessage[];
  createdAt?: Date;
  updatedAt?: Date;
};

export type ContactModel = Model<IContact>;

export type ContactDocument = IContact & Document;
