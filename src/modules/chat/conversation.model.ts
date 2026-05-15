import { Schema, model } from 'mongoose';
import type { IConversationDoc } from './conversation.interface';

const conversationSchema = new Schema<IConversationDoc>(
  {
    participantLow: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    participantHigh: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    lastMessageAt: { type: Date, index: true },
    lastReadAtForLow: { type: Date, default: null },
    lastReadAtForHigh: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

conversationSchema.index(
  { participantLow: 1, participantHigh: 1 },
  { unique: true },
);

export const ConversationModel = model<IConversationDoc>('Conversation', conversationSchema);
