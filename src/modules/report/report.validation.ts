import { z } from 'zod';
import { REPORT_TYPES } from './report.interface';

const objectIdString = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');

const reportTypeEnum = z.enum(
  REPORT_TYPES as unknown as [string, ...string[]],
);

const adminReportSortEnum = z.enum(['newest', 'oldest']);
const adminReportDateRangeEnum = z.enum(['30', '90', 'all']);

export const createReportZodSchema = z.object({
  body: z.object({
    userId: objectIdString,
    reportType: reportTypeEnum,
    reportMessage: z.string().trim().min(1).max(50),
  }),
  params: z.any().optional(),
  query: z.any().optional(),
});

export const reportUserIdParamZodSchema = z.object({
  params: z.object({
    userId: objectIdString,
  }),
  body: z.any().optional(),
  query: z.any().optional(),
});

export const reportIdParamZodSchema = z.object({
  params: z.object({
    reportId: objectIdString,
  }),
  body: z.any().optional(),
  query: z.any().optional(),
});

export const updateReportResolutionZodSchema = z.object({
  params: z.object({
    reportId: objectIdString,
  }),
  body: z.object({
    resolved: z.boolean(),
    resolvedMessage: z.string().trim().max(200).optional(),
  }),
  query: z.any().optional(),
});

export const adminReportSummaryQueryZodSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    searchTerm: z.string().trim().optional(),
    sort: adminReportSortEnum.optional(),
    dateRange: adminReportDateRangeEnum.optional(),
  }),
  params: z.any().optional(),
  body: z.any().optional(),
});
