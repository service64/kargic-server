import { Types } from "mongoose";

export interface IImage {
  _id?: Types.ObjectId;
  userId?: Types.ObjectId;
  size: number;
  name: string;
  insertedBy?: "ADMIN" | "USER";
  url: string;
  r2_key: string;
  alt?: string;
  createdAt?: Date;
}
