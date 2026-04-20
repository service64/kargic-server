import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { ExporterProfileService } from './exporterProfile.service';
import sendResponse from '../../../utils/sendResponse';
import catchAsync from '../../../utils/catchAsync';

const createExporterProfile = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const result = await ExporterProfileService.createExporterProfileIntoDB({
    ...req.body,
    userId: userId as string,
  });
  return sendResponse(res, httpStatus.CREATED, 'Exporter profile created successfully', result);
});

const getAllExporterProfiles = catchAsync(async (_req: Request, res: Response) => {
  const result = await ExporterProfileService.getAllExporterProfilesFromDB();
  return sendResponse(
    res,
    httpStatus.OK,
    'Exporter profiles retrieved successfully',
    result,
  );
});

const getExporterProfileById = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const result = await ExporterProfileService.getExporterProfileByIdFromDB(userId as string);
  return sendResponse(
    res,
    httpStatus.OK,
    'Exporter profile retrieved successfully',
    result,
  );
});

const updateExporterProfile = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await ExporterProfileService.updateExporterProfileInDB(id, req.body);
  return sendResponse(res, httpStatus.OK, 'Exporter profile updated successfully', result);
});

const deleteExporterProfile = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await ExporterProfileService.deleteExporterProfileFromDB(id);
  return sendResponse(res, httpStatus.OK, 'Exporter profile deleted successfully', result);
});

export const ExporterProfileController = {
  createExporterProfile,
  getAllExporterProfiles,
  getExporterProfileById,
  updateExporterProfile,
  deleteExporterProfile,
};
