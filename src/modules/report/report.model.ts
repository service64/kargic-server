import { Schema, model } from 'mongoose';
import { IReport, ReportModel, REPORT_TYPES } from './report.interface';

const reportSchema = new Schema<IReport, ReportModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reportBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reportMessage: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    reportType: {
      type: String,
      enum: REPORT_TYPES,
      required: true,
    },
    resolved: {
      type: Boolean,
      default: false,
      required: true,
      index: true,
    },
    resolvedAt: {
      type: Date,
      required: false,
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    resolvedMessage: {
      type: String,
      trim: true,
      maxlength: 200,
      required: false,
    },
  },
  {
    timestamps: true,
  },
);

reportSchema.index({ userId: 1, createdAt: -1 });
reportSchema.index({ reportBy: 1, createdAt: -1 });

export const Report = model<IReport, ReportModel>('Report', reportSchema);
