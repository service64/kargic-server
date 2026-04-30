import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { TagService } from './tag.service';

const createTag = catchAsync(async (req: Request, res: Response) => {
  const result = await TagService.createTagIntoDB({
    ...req.body,
    userId: req.user!.userId,
  });

  return sendResponse(res, httpStatus.CREATED, 'Tag created successfully', result);
});

const getAllTags = catchAsync(async (req: Request, res: Response) => {
  const result = await TagService.getAllTagsFromDB(req.user!.userId);
  return sendResponse(res, httpStatus.OK, 'Tags retrieved successfully', result);
});

const deleteTag = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await TagService.deleteTagFromDB(req.user!.userId, id);
  return sendResponse(res, httpStatus.OK, 'Tag deleted successfully', result);
});

const updateTag = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await TagService.updateTagInDB(req.user!.userId, id, req.body);
  return sendResponse(res, httpStatus.OK, 'Tag updated successfully', result);
});

export const TagController = {
  createTag,
  getAllTags,
  deleteTag,
  updateTag,
};

