import { Types } from 'mongoose';

export interface IConversationDoc {
  _id?: Types.ObjectId;
  participantLow: Types.ObjectId;
  participantHigh: Types.ObjectId;
  lastMessageAt?: Date;
  /** When participantLow last opened / read this thread (their watermark). */
  lastReadAtForLow?: Date | null;
  /** When participantHigh last opened / read this thread (their watermark). */
  lastReadAtForHigh?: Date | null;
}
