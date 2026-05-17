import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { SavedProductService } from './savedProduct.service';

const createSavedProduct = catchAsync(async (req: Request, res: Response) => {
  const { productId } = req.body as { productId: string };
  const result = await SavedProductService.createSavedProductInDB(
    req.user!.userId,
    productId,
  );
  return sendResponse(res, httpStatus.CREATED, 'Product saved', result);
});

const deleteSavedProduct = catchAsync(async (req: Request, res: Response) => {
  const productId = String(req.params.productId);
  await SavedProductService.deleteSavedProductInDB(req.user!.userId, productId);
  return sendResponse(res, httpStatus.OK, 'Saved product removed', {
    removed: true,
  });
});

const getAllSavedProducts = catchAsync(async (req: Request, res: Response) => {
  const result = await SavedProductService.getAllSavedProductsFromDB(
    req.user!.userId,
    req.query as Record<string, unknown>,
  );
  return sendResponse(res, httpStatus.OK, 'Saved products retrieved', result);
});

export const SavedProductController = {
  createSavedProduct,
  deleteSavedProduct,
  getAllSavedProducts,
};
