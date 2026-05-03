import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { BrandService } from './brand.service';

const createBrand = catchAsync(async (req: Request, res: Response) => {
  const result = await BrandService.createBrandIntoDB({
    ...req.body,
    userId: req.user!.userId,
  });
  return sendResponse(res, httpStatus.CREATED, 'Brand created successfully', result);
});

const getMyBrand = catchAsync(async (req: Request, res: Response) => {
  const result = await BrandService.getMyBrandFromDB(req.user!.userId);
  return sendResponse(
    res,
    httpStatus.OK,
    result ? 'Brand retrieved successfully' : 'No brand found for this account',
    result,
  );
});

const updateBrand = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await BrandService.updateBrandInDB(
    id,
    req.user!.userId,
    req.user!.activeRole,
    req.body,
  );
  return sendResponse(res, httpStatus.OK, 'Brand updated successfully', result);
});

export const BrandController = {
  createBrand,
  getMyBrand,
  updateBrand,
};
