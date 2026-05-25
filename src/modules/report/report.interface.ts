import { Model, Types } from 'mongoose';

export const REPORT_TYPES = [
  'spam',
  'abuse',
  'scam',
  'fake_profile',
  'other',
] as const;

export type ReportType = (typeof REPORT_TYPES)[number];

export interface IReport {
  userId: Types.ObjectId;
  reportBy: Types.ObjectId;
  reportMessage: string;
  reportType: ReportType;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: Types.ObjectId;
  resolvedMessage?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ReportModel extends Model<IReport> {}
