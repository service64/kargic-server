import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { ProductService } from './product.service';

const createProduct = catchAsync(async (req: Request, res: Response) => {
  const result = await ProductService.createProductIntoDB({
    ...req.body,
    userId: req.user!.userId,
  });

  return sendResponse(res, httpStatus.CREATED, 'Product created successfully', result);
});

const getAllProducts = catchAsync(async (req: Request, res: Response) => {
  const result = await ProductService.getAllProductsFromDB(
    req.query as Record<string, unknown>,
  );
  return sendResponse(res, httpStatus.OK, 'Products retrieved successfully', result);
});

const getMyProducts = catchAsync(async (req: Request, res: Response) => {
  const result = await ProductService.getMyProductsFromDB(
    req.user!.userId,
    req.query as Record<string, unknown>,
  );
  return sendResponse(res, httpStatus.OK, 'My products retrieved successfully', result);
});

const getProductById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await ProductService.getProductByIdFromDB(id);
  return sendResponse(res, httpStatus.OK, 'Product retrieved successfully', result);
});

const updateMyProduct = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await ProductService.updateMyProductInDB(
    id,
    req.user!.userId,
    req.user!.activeRole,
    req.body,
  );
  return sendResponse(res, httpStatus.OK, 'Product updated successfully', result);
});

const deleteMyProduct = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await ProductService.deleteMyProductFromDB(
    id,
    req.user!.userId,
    req.user!.activeRole,
  );
  return sendResponse(res, httpStatus.OK, 'Product deleted successfully', result);
});

const deleteProductImage = catchAsync(async (req: Request, res: Response) => {
  const { id, imageId } = req.params as { id: string; imageId: string };
  const result = await ProductService.deleteProductImageFromDB(
    id,
    imageId,
    req.user!.userId,
    req.user!.activeRole,
  );
  return sendResponse(res, httpStatus.OK, 'Product image deleted successfully', result);
});

export const ProductController = {
  createProduct,
  getAllProducts,
  getMyProducts,
  getProductById,
  updateMyProduct,
  deleteMyProduct,
  deleteProductImage,
};
