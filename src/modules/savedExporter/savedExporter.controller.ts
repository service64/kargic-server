import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { SavedExporterService } from './savedExporter.service';

const createSavedExporter = catchAsync(async (req: Request, res: Response) => {
  const { exporterUserId } = req.body as { exporterUserId: string };
  const result = await SavedExporterService.createSavedExporterInDB(
    req.user!.userId,
    exporterUserId,
  );
  return sendResponse(res, httpStatus.CREATED, 'Exporter saved', result);
});

const deleteSavedExporter = catchAsync(async (req: Request, res: Response) => {
  const exporterUserId = String(req.params.exporterUserId);
  await SavedExporterService.deleteSavedExporterInDB(
    req.user!.userId,
    exporterUserId,
  );
  return sendResponse(res, httpStatus.OK, 'Saved exporter removed', {
    removed: true,
  });
});

const getAllSavedExporters = catchAsync(async (req: Request, res: Response) => {
  const result = await SavedExporterService.getAllSavedExportersFromDB(
    req.user!.userId,
    req.query as Record<string, unknown>,
  );
  return sendResponse(res, httpStatus.OK, 'Saved exporters retrieved', result);
});

export const SavedExporterController = {
  createSavedExporter,
  deleteSavedExporter,
  getAllSavedExporters,
};
