import { Schema, model } from 'mongoose';
import bcrypt from 'bcrypt';
import { IUser, UserModel, USER_ACTIVE_ROLES } from './user.interface';

const USER_STATUS = ['ACTIVE', 'BLOCKED', 'DELETED', 'WARNING'] as const;

const userSchema = new Schema<IUser, UserModel>(
  {
    age: {
      type: Number,
      required: true,
    },
    otp: {
      type: String,
    },
    sessionMgmtOtp: {
      type: String,
      select: false,
    },
    sessionMgmtOtpExpiresAt: {
      type: Date,
      select: false,
    },
    passwordResetOtp: {
      type: String,
      select: false,
    },
    passwordResetOtpExpiresAt: {
      type: Date,
      select: false,
    },
    deletedAt: {
      type: Date,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      select: 0,
    },
    roles: {
      type: [String],
      enum: [...USER_ACTIVE_ROLES],
      default: () => ['IMPORTER'],
    },
    activeRole: {
      type: String,
      enum: [...USER_ACTIVE_ROLES],
      default: 'IMPORTER',
    },
    status: {
      type: String,
      enum: USER_STATUS,
      default: 'ACTIVE',
    },
  },
  {
    timestamps: true,
  },
);

userSchema.pre('save', async function () {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
});

userSchema.statics.isUserExistsByEmail = async function (email: string) {
  return this.findOne({ email }).select('+password');
};

export const User = model<IUser, UserModel>('User', userSchema);
