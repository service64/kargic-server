import { Types } from 'mongoose';

export interface ISavedExporter {
  userId: Types.ObjectId;
  exporterUserId: Types.ObjectId;
}

export interface ISavedExporterDoc extends ISavedExporter {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
