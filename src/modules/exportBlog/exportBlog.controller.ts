import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { ExportBlogService } from './exportBlog.service';

const createExportBlog = catchAsync(async (req: Request, res: Response) => {
  const result = await ExportBlogService.createExportBlogIntoDB({
    ...req.body,
    authorId: req.user!.userId,
  });
  return sendResponse(res, httpStatus.CREATED, 'Export blog created successfully', result);
});

const getPublishedBlogs = catchAsync(async (_req: Request, res: Response) => {
  const result = await ExportBlogService.getPublishedBlogsFromDB();
  return sendResponse(res, httpStatus.OK, 'Published blogs retrieved successfully', result);
});

const getPublishedBlogBySlug = catchAsync(async (req: Request, res: Response) => {
  const { slug } = req.params as { slug: string };
  const result = await ExportBlogService.getPublishedBlogBySlugFromDB(slug);
  return sendResponse(res, httpStatus.OK, 'Blog retrieved successfully', result);
});

const getAllBlogsForAdmin = catchAsync(async (_req: Request, res: Response) => {
  const result = await ExportBlogService.getAllBlogsForAdminFromDB();
  return sendResponse(res, httpStatus.OK, 'Blogs retrieved successfully', result);
});

const getBlogByIdForAdmin = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await ExportBlogService.getBlogByIdForAdminFromDB(id);
  return sendResponse(res, httpStatus.OK, 'Blog retrieved successfully', result);
});

const updateExportBlog = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await ExportBlogService.updateBlogInDB(id, req.body);
  return sendResponse(res, httpStatus.OK, 'Export blog updated successfully', result);
});

const publishExportBlog = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await ExportBlogService.publishBlogInDB(id);
  return sendResponse(res, httpStatus.OK, 'Export blog published successfully', result);
});

const unpublishExportBlog = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await ExportBlogService.unpublishBlogInDB(id);
  return sendResponse(res, httpStatus.OK, 'Export blog unpublished successfully', result);
});

const deleteExportBlog = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await ExportBlogService.deleteBlogFromDB(id);
  return sendResponse(res, httpStatus.OK, 'Export blog deleted successfully', result);
});

export const ExportBlogController = {
  createExportBlog,
  getPublishedBlogs,
  getPublishedBlogBySlug,
  getAllBlogsForAdmin,
  getBlogByIdForAdmin,
  updateExportBlog,
  publishExportBlog,
  unpublishExportBlog,
  deleteExportBlog,
};
