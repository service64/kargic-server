import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { AdminService } from './admin.service';
import sendResponse from '../../../utils/sendResponse';
import catchAsync from '../../../utils/catchAsync';

const createAdmin = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.createAdminIntoDB(req.body);
  return sendResponse(res, httpStatus.CREATED, 'Admin created successfully', result);
});

const getAllAdmins = catchAsync(async (req: Request, res: Response) => {
  const includeDeleted = req.query.includeDeleted === 'true';
  const result = await AdminService.getAllAdminsFromDB(includeDeleted);
  return sendResponse(res, httpStatus.OK, 'Admins retrieved successfully', result);
});

const getAdminById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await AdminService.getAdminByIdFromDB(id);
  return sendResponse(res, httpStatus.OK, 'Admin retrieved successfully', result);
});

const updateAdmin = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const body = { ...req.body };
  if (body.joinDate !== undefined) {
    body.joinDate = body.joinDate instanceof Date ? body.joinDate : new Date(body.joinDate);
  }
  const result = await AdminService.updateAdminInDB(id, body);
  return sendResponse(res, httpStatus.OK, 'Admin updated successfully', result);
});

const removeAdmin = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await AdminService.softDeleteAdminFromDB(id);
  return sendResponse(res, httpStatus.OK, 'Admin deleted successfully', result);
});

export const AdminController = {
  createAdmin,
  getAllAdmins,
  getAdminById,
  updateAdmin,
  removeAdmin,
};
