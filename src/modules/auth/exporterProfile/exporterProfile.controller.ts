import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { ExporterProfileService } from './exporterProfile.service';
import { CompanyVerificationService } from './companyVerification.service';
import { AdminExporterListService } from './adminExporterList.service';
import { AdminSellerVerificationService } from './adminSellerVerification.service';
import sendResponse from '../../../utils/sendResponse';
import catchAsync from '../../../utils/catchAsync';

const getMyCompanyVerification = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId as string;
  const result = await CompanyVerificationService.getCompanyVerificationByUserId(userId);
  return sendResponse(
    res,
    httpStatus.OK,
    'Company verification retrieved successfully',
    result,
  );
});

const patchMyCompanyVerification = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId as string;
  const result = await CompanyVerificationService.patchCompanyVerificationForExporter(
    userId,
    req.body as Record<string, unknown>,
  );
  return sendResponse(
    res,
    httpStatus.OK,
    'Company verification updated successfully',
    result,
  );
});

const getAdminCompanyVerification = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.params as { userId: string };
  const result = await CompanyVerificationService.getCompanyVerificationByUserId(userId);
  return sendResponse(
    res,
    httpStatus.OK,
    'Company verification retrieved successfully',
    result,
  );
});

const patchAdminCompanyVerification = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.params as { userId: string };
  const result = await CompanyVerificationService.patchCompanyVerificationForAdmin(
    userId,
    req.body as Record<string, unknown>,
  );
  return sendResponse(
    res,
    httpStatus.OK,
    'Company verification updated successfully',
    result,
  );
});

const deleteAdminCompanyVerification = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.params as { userId: string };
  const result = await CompanyVerificationService.deleteCompanyVerificationForAdmin(userId);
  return sendResponse(
    res,
    httpStatus.OK,
    'Company verification removed successfully',
    result,
  );
});

const createExporterProfile = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const result = await ExporterProfileService.createExporterProfileIntoDB({
    ...req.body,
    userId: userId as string,
  });
  return sendResponse(res, httpStatus.CREATED, 'Exporter profile created successfully', result);
});

const getAllExporterProfiles = catchAsync(async (req: Request, res: Response) => {
  const result = await ExporterProfileService.getAllExporterProfilesFromDB(
    req.query as Record<string, unknown>,
  );
  return sendResponse(
    res,
    httpStatus.OK,
    'Exporter profiles retrieved successfully',
    result,
  );
});

const getPublicExporterDetailByUserId = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.params as { userId: string };
  const result = await ExporterProfileService.getPublicExporterDetailByUserIdFromDB(userId);
  return sendResponse(
    res,
    httpStatus.OK,
    'Exporter public profile retrieved successfully',
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

const getExportersForAdmin = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminExporterListService.getExportersForAdminFromDB(
    req.query as Record<string, unknown>,
  );
  return sendResponse(res, httpStatus.OK, 'Exporters fetched successfully', {
    data: result.data,
    meta: result.meta,
  });
});

const getSellerVerificationForAdmin = catchAsync(
  async (req: Request, res: Response) => {
    const result =
      await AdminSellerVerificationService.getSellerVerificationForAdminFromDB(
        req.query as Record<string, unknown>,
      );
    return sendResponse(
      res,
      httpStatus.OK,
      'Seller verification queue fetched successfully',
      {
        data: result.data,
        meta: result.meta,
        pipelineTotal: result.pipelineTotal,
      },
    );
  },
);

export const ExporterProfileController = {
  createExporterProfile,
  getAllExporterProfiles,
  getPublicExporterDetailByUserId,
  getExporterProfileById,
  getMyCompanyVerification,
  patchMyCompanyVerification,
  getAdminCompanyVerification,
  patchAdminCompanyVerification,
  deleteAdminCompanyVerification,
  updateExporterProfile,
  deleteExporterProfile,
  getExportersForAdmin,
  getSellerVerificationForAdmin,
};
