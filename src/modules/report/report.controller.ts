import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { ReportService } from './report.service';

const createReport = catchAsync(async (req: Request, res: Response) => {
  const result = await ReportService.createReportIntoDB(req.user!.userId, req.body);
  return sendResponse(
    res,
    httpStatus.CREATED,
    'Report created successfully',
    result,
  );
});

const getMyReports = catchAsync(async (req: Request, res: Response) => {
  const result = await ReportService.getMyReportsFromDB(req.user!.userId);
  return sendResponse(
    res,
    httpStatus.OK,
    'My reports retrieved successfully',
    result,
  );
});

const getReportsAgainstMe = catchAsync(async (req: Request, res: Response) => {
  const result = await ReportService.getReportsAgainstMeFromDB(req.user!.userId);
  return sendResponse(
    res,
    httpStatus.OK,
    'Reports against me retrieved successfully',
    result,
  );
});

const getAdminReportSummary = catchAsync(async (_req: Request, res: Response) => {
  const result = await ReportService.getAdminReportSummaryFromDB(_req.query);
  return sendResponse(
    res,
    httpStatus.OK,
    'Report summary retrieved successfully',
    result,
  );
});

const getAdminReportsByUserId = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.params as { userId: string };
  const result = await ReportService.getAdminReportsByUserIdFromDB(userId);
  return sendResponse(
    res,
    httpStatus.OK,
    'User reports retrieved successfully',
    result,
  );
});

const updateReportResolution = catchAsync(async (req: Request, res: Response) => {
  const { reportId } = req.params as { reportId: string };
  const result = await ReportService.updateReportResolutionInDB(
    req.user!.userId,
    reportId,
    req.body,
  );
  return sendResponse(
    res,
    httpStatus.OK,
    'Report resolution updated successfully',
    result,
  );
});

export const ReportController = {
  createReport,
  getMyReports,
  getReportsAgainstMe,
  getAdminReportSummary,
  getAdminReportsByUserId,
  updateReportResolution,
};
