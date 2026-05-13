import { Types } from 'mongoose';

export type ChatMessageType = 'text' | 'image' | 'order' | 'product';

export interface IChatMessageDoc {
  conversationId: Types.ObjectId;
  senderId: Types.ObjectId;
  type: ChatMessageType;
  text?: string;
  imageId?: Types.ObjectId;
  orderId?: Types.ObjectId;
  productId?: Types.ObjectId;
  createdAt?: Date;
}
