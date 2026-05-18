import { Schema, model } from 'mongoose';
import { IPredefinedMessage } from './predefinedMessage.interface';
import { PREDEFINED_MESSAGE_MAX_LENGTH } from './predefinedMessage.constants';

const predefinedMessageSchema = new Schema<IPredefinedMessage>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: PREDEFINED_MESSAGE_MAX_LENGTH,
    },
  },
  {
    timestamps: true,
  },
);

export const PredefinedMessage = model<IPredefinedMessage>(
  'PredefinedMessage',
  predefinedMessageSchema,
);
