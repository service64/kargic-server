import { Schema, model } from 'mongoose';
import {
  CONTACT_USER_TYPES,
  type ContactModel,
  type IContact,
} from './contact.interface';

const contactMessageSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, required: true, trim: true, maxlength: 30 },
    userType: {
      type: String,
      enum: CONTACT_USER_TYPES,
      required: true,
    },
    message: { type: String, required: true, trim: true, maxlength: 5000 },
    isRead: { type: Boolean, default: false, required: true },
    createdAt: { type: Date, default: Date.now, required: true },
  },
  { _id: true },
);

const contactSchema = new Schema<IContact, ContactModel>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
      index: true,
    },
    hasNewMessage: { type: Boolean, default: false, required: true, index: true },
    newUnreadCount: { type: Number, default: 0, required: true, min: 0 },
    messages: {
      type: [contactMessageSchema],
      default: [],
    },
  },
  { timestamps: true },
);

contactSchema.index({ updatedAt: -1 });

export const Contact = model<IContact, ContactModel>('Contact', contactSchema);
