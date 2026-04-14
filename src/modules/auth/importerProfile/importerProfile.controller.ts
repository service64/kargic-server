import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { ImporterProfileService } from './importerProfile.service';
import sendResponse from '../../../utils/sendResponse';
import catchAsync from '../../../utils/catchAsync';

const createImporterProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await ImporterProfileService.createImporterProfileIntoDB(req.body);
  return sendResponse(res, httpStatus.CREATED, 'Importer profile created successfully', result);
});

const getAllImporterProfiles = catchAsync(async (_req: Request, res: Response) => {
  const result = await ImporterProfileService.getAllImporterProfilesFromDB();
  return sendResponse(
    res,
    httpStatus.OK,
    'Importer profiles retrieved successfully',
    result,
  );
});

const getImporterProfileById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await ImporterProfileService.getImporterProfileByIdFromDB(id);
  return sendResponse(
    res,
    httpStatus.OK,
    'Importer profile retrieved successfully',
    result,
  );
});

const updateImporterProfile = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await ImporterProfileService.updateImporterProfileInDB(id, req.body);
  return sendResponse(res, httpStatus.OK, 'Importer profile updated successfully', result);
});

const deleteImporterProfile = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await ImporterProfileService.deleteImporterProfileFromDB(id);
  return sendResponse(res, httpStatus.OK, 'Importer profile deleted successfully', result);
});

export const ImporterProfileController = {
  createImporterProfile,
  getAllImporterProfiles,
  getImporterProfileById,
  updateImporterProfile,
  deleteImporterProfile,
};
