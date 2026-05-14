import { Types } from 'mongoose';

export interface IConversationDoc {
  _id?: Types.ObjectId;
  participantLow: Types.ObjectId;
  participantHigh: Types.ObjectId;
  lastMessageAt?: Date;
}
