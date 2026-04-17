import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { CategoryService } from './category.service';

const createCategory = catchAsync(async (req: Request, res: Response) => {
  const result = await CategoryService.createCategoryIntoDB({
    ...req.body,
    userId: req.user!.userId,
  });
  return sendResponse(res, httpStatus.CREATED, 'Category created successfully', result);
});

const getAllCategories = catchAsync(async (_req: Request, res: Response) => {
  const result = await CategoryService.getAllCategoriesFromDB();
  return sendResponse(res, httpStatus.OK, 'Categories retrieved successfully', result);
});

const getCategoryById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await CategoryService.getCategoryByIdFromDB(id);
  return sendResponse(res, httpStatus.OK, 'Category retrieved successfully', result);
});

const updateCategory = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await CategoryService.updateCategoryInDB(id, req.body);
  return sendResponse(res, httpStatus.OK, 'Category updated successfully', result);
});

const softDeleteCategory = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await CategoryService.softDeleteCategoryFromDB(id);
  return sendResponse(res, httpStatus.OK, 'Category soft deleted successfully', result);
});

const deleteCategory = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await CategoryService.deleteCategoryFromDB(id);
  return sendResponse(res, httpStatus.OK, 'Category deleted successfully', result);
});

const deleteCategoryImage = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await CategoryService.deleteCategoryImageFromStorageAndDB(id);
  return sendResponse(
    res,
    httpStatus.OK,
    'Category image deleted from storage and database',
    result,
  );
});

export const CategoryController = {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  softDeleteCategory,
  deleteCategory,
  deleteCategoryImage,
};
