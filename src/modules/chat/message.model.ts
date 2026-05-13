import { Schema, model } from 'mongoose';
import type { ChatMessageType, IChatMessageDoc } from './message.interface';

const MESSAGE_TYPES: ChatMessageType[] = ['text', 'image', 'order'];

const chatMessageSchema = new Schema<IChatMessageDoc>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: MESSAGE_TYPES, required: true },
    text: { type: String, trim: true },
    imageId: { type: Schema.Types.ObjectId, ref: 'Image' },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

chatMessageSchema.index({ conversationId: 1, createdAt: -1 });

export const ChatMessageModel = model<IChatMessageDoc>('ChatMessage', chatMessageSchema);
