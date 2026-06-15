import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { SeoService } from './seo.service';

const getAllSeo = catchAsync(async (_req: Request, res: Response) => {
  const result = await SeoService.getAllSeoFromDB();
  return sendResponse(res, httpStatus.OK, 'SEO metadata list retrieved', result);
});

const getSeoByPage = catchAsync(async (req: Request, res: Response) => {
  const { page } = req.params as { page: string };
  const result = await SeoService.getSeoByPageFromDB(page);
  return sendResponse(res, httpStatus.OK, 'SEO metadata retrieved', result);
});

const createSeo = catchAsync(async (req: Request, res: Response) => {
  const result = await SeoService.createSeoIntoDB(req.body);
  return sendResponse(res, httpStatus.CREATED, 'SEO metadata created', result);
});

const updateSeo = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await SeoService.updateSeoInDB(id, req.body);
  return sendResponse(res, httpStatus.OK, 'SEO metadata updated', result);
});

const deleteSeo = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await SeoService.deleteSeoFromDB(id);
  return sendResponse(res, httpStatus.OK, 'SEO metadata deleted', result);
});

export const SeoController = {
  getAllSeo,
  getSeoByPage,
  createSeo,
  updateSeo,
  deleteSeo,
};
