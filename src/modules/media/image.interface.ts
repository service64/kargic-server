import { Types } from 'mongoose';

export type IUseCase =
  | 'CATEGORY'
  | 'LOGO'
  | 'PRODUCT'
  | 'USER'
  | 'BANNER'
  | 'MESSAGE';
export interface IImage {
  _id?: Types.ObjectId;
  userId?: Types.ObjectId;
  size: number;
  name: string;
  insertedBy?: 'ADMIN' | 'USER';
  url: string;
  r2_key: string;
  alt?: string;
  useCase: IUseCase;
  createdAt?: Date;
}
