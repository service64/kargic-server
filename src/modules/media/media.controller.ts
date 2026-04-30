import { Request, Response } from 'express';
import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import mediaService from './media.service';
import { IUseCase } from './image.interface';

const upload = catchAsync(async (req: Request, res: Response) => {
  const file = req.file;
  if (!file) {
    throw new AppError('No file provided', httpStatus.BAD_REQUEST);
  }
  const requestedSize = Number(req.body?.size);
  if (!Number.isFinite(requestedSize) || requestedSize <= 0) {
    throw new AppError('Invalid image size', httpStatus.BAD_REQUEST);
  }
  if (requestedSize !== file.size) {
    throw new AppError('Image size mismatch', httpStatus.BAD_REQUEST);
  }
  const alt = typeof req.body?.alt === 'string' ? req.body.alt : undefined;
  const useCase = req.body.useCase as IUseCase;
  const userId = req.user!.userId;

  const image = await mediaService.uploadImage(file, requestedSize, alt, useCase, userId);
  sendResponse(res, httpStatus.CREATED, 'Image uploaded successfully', image);
});

const getAllImages = catchAsync(async (req: Request, res: Response) => {
  const { data, meta } = await mediaService.getAllImages(
    req.query as Record<string, unknown>,
    req.user!.userId,
  );
  sendResponse(res, httpStatus.OK, 'Images retrieved successfully', { images: data, meta });
});

const getImageById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const image = await mediaService.getImageById(id, req.user!.userId);
  sendResponse(res, httpStatus.OK, 'Image retrieved successfully', image);
});

const update = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const file = req.file;
  if (!file) {
    throw new AppError('No file provided', httpStatus.BAD_REQUEST);
  }
  const requestedSize = Number(req.body?.size);
  if (!Number.isFinite(requestedSize) || requestedSize <= 0) {
    throw new AppError('Invalid image size', httpStatus.BAD_REQUEST);
  }
  if (requestedSize !== file.size) {
    throw new AppError('Image size mismatch', httpStatus.BAD_REQUEST);
  }
  const alt = typeof req.body?.alt === 'string' ? req.body.alt : undefined;
  const useCase = req.body.useCase as IUseCase;
  const userId = req.user!.userId;

  const image = await mediaService.updateImage(id, file, requestedSize, alt, useCase, userId);
  sendResponse(res, httpStatus.OK, 'Image updated successfully', image);
});

const remove = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  await mediaService.deleteImage(id, req.user!.userId);
  sendResponse(res, httpStatus.OK, 'Image deleted successfully', null);
});

export const mediaController = {
  upload,
  getAllImages,
  getImageById,
  update,
  remove,
};
