import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { SitemapService } from './sitemap.service';

const getPublicSitemap = catchAsync(async (_req: Request, res: Response) => {
  const result = await SitemapService.getPublicSitemapFromDB();
  return sendResponse(res, httpStatus.OK, 'Sitemap entries retrieved', result);
});

const getAllSitemap = catchAsync(async (_req: Request, res: Response) => {
  const result = await SitemapService.getAllSitemapFromDB();
  return sendResponse(res, httpStatus.OK, 'Sitemap list retrieved', result);
});

const getSitemapById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await SitemapService.getSitemapByIdFromDB(id);
  return sendResponse(res, httpStatus.OK, 'Sitemap entry retrieved', result);
});

const createSitemap = catchAsync(async (req: Request, res: Response) => {
  const result = await SitemapService.createSitemapIntoDB(req.body);
  return sendResponse(res, httpStatus.CREATED, 'Sitemap entry created', result);
});

const updateSitemap = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await SitemapService.updateSitemapInDB(id, req.body);
  return sendResponse(res, httpStatus.OK, 'Sitemap entry updated', result);
});

const deleteSitemap = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await SitemapService.deleteSitemapFromDB(id);
  return sendResponse(res, httpStatus.OK, 'Sitemap entry deleted', result);
});

export const SitemapController = {
  getPublicSitemap,
  getAllSitemap,
  getSitemapById,
  createSitemap,
  updateSitemap,
  deleteSitemap,
};
