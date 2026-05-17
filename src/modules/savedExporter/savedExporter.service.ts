import httpStatus from 'http-status';
import { Types } from 'mongoose';
import AppError from '../../errors/AppError';
import { ExporterProfile } from '../auth/exporterProfile/exporterProfile.model';
import { SavedExporter } from './savedExporter.model';
import { fetchSavedExportersList } from './savedExporterListQuery';

const toOid = (id: string) => new Types.ObjectId(id);

const createSavedExporterInDB = async (userId: string, exporterUserId: string) => {
  if (userId === exporterUserId) {
    throw new AppError('Cannot save your own exporter account', httpStatus.BAD_REQUEST);
  }

  const profileExists = await ExporterProfile.exists({
    userId: toOid(exporterUserId),
  });
  if (!profileExists) {
    throw new AppError('Exporter profile not found', httpStatus.NOT_FOUND);
  }

  try {
    const doc = await SavedExporter.create({
      userId: toOid(userId),
      exporterUserId: toOid(exporterUserId),
    });
    return doc;
  } catch (err: unknown) {
    if (
      err &&
      typeof err === 'object' &&
      'code' in err &&
      (err as { code?: number }).code === 11000
    ) {
      throw new AppError('Exporter already saved', httpStatus.CONFLICT);
    }
    throw err;
  }
};

const deleteSavedExporterInDB = async (userId: string, exporterUserId: string) => {
  const res = await SavedExporter.deleteOne({
    userId: toOid(userId),
    exporterUserId: toOid(exporterUserId),
  });
  if (res.deletedCount === 0) {
    throw new AppError('Saved exporter not found', httpStatus.NOT_FOUND);
  }
};

const getAllSavedExportersFromDB = async (
  userId: string,
  query: Record<string, unknown>,
) => {
  const saves = await SavedExporter.find({ userId: toOid(userId) })
    .select('exporterUserId')
    .sort({ createdAt: -1 })
    .lean();

  const exporterUserIds = saves.map((s) => s.exporterUserId);
  if (exporterUserIds.length === 0) {
    return {
      data: [],
      meta: {
        page: 1,
        limit: 20,
        total: 0,
        totalPage: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };
  }

  return fetchSavedExportersList(exporterUserIds, query);
};

export const SavedExporterService = {
  createSavedExporterInDB,
  deleteSavedExporterInDB,
  getAllSavedExportersFromDB,
};
