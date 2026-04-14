import httpStatus from 'http-status';
import { Types } from 'mongoose';
import AppError from '../../../errors/AppError';
import { ExporterProfile } from './exporterProfile.model';
import { User } from '../user/user.model';
import type { CompanyType, EmployeeCount } from '../../../type/common.type';

type CreatePayload = {
  userId: string;
  companyName: string;
  slug: string;
  logoUrl?: string;
  bannerUrl?: string[];
  yearEstablished: number;
  companyType: CompanyType;
  employeeCount: EmployeeCount;
  mainProducts: string[];
  description?: string;
};

const toObjectId = (id: string) => new Types.ObjectId(id);

const createExporterProfileIntoDB = async (payload: CreatePayload) => {
  const user = await User.findById(payload.userId);
  if (!user) {
    throw new AppError('User not found', httpStatus.NOT_FOUND);
  }

  return ExporterProfile.create({
    userId: toObjectId(payload.userId),
    companyName: payload.companyName,
    slug: payload.slug,
    ...(payload.logoUrl !== undefined && { logoUrl: toObjectId(payload.logoUrl) }),
    ...(payload.bannerUrl !== undefined && {
      bannerUrl: payload.bannerUrl.map(toObjectId),
    }),
    yearEstablished: payload.yearEstablished,
    companyType: payload.companyType,
    employeeCount: payload.employeeCount,
    mainProducts: payload.mainProducts,
    ...(payload.description !== undefined && { description: payload.description }),
  });
};

const getAllExporterProfilesFromDB = async () => {
  return ExporterProfile.find().populate('userId', 'email phone role').sort({ createdAt: -1 });
};

const getExporterProfileByIdFromDB = async (id: string) => {
  const doc = await ExporterProfile.findById(id).populate('userId', 'email phone role');
  if (!doc) {
    throw new AppError('Exporter profile not found', httpStatus.NOT_FOUND);
  }
  return doc;
};

const updateExporterProfileInDB = async (id: string, body: Record<string, unknown>) => {
  const $set: Record<string, unknown> = {};
  const $unset: Record<string, ''> = {};

  if (typeof body.companyName === 'string') {
    $set.companyName = body.companyName;
  }
  if (typeof body.slug === 'string') {
    $set.slug = body.slug;
  }
  if (body.logoUrl === null) {
    $unset.logoUrl = '';
  } else if (typeof body.logoUrl === 'string') {
    $set.logoUrl = toObjectId(body.logoUrl);
  }
  if (body.bannerUrl === null) {
    $unset.bannerUrl = '';
  } else if (Array.isArray(body.bannerUrl)) {
    $set.bannerUrl = (body.bannerUrl as string[]).map(toObjectId);
  }
  if (typeof body.yearEstablished === 'number') {
    $set.yearEstablished = body.yearEstablished;
  }
  if (typeof body.companyType === 'string') {
    $set.companyType = body.companyType;
  }
  if (typeof body.employeeCount === 'string') {
    $set.employeeCount = body.employeeCount;
  }
  if (Array.isArray(body.mainProducts)) {
    $set.mainProducts = body.mainProducts;
  }
  if (body.description === null) {
    $unset.description = '';
  } else if (typeof body.description === 'string') {
    $set.description = body.description;
  }

  const updateOps: Record<string, unknown> = {};
  if (Object.keys($set).length > 0) {
    updateOps.$set = $set;
  }
  if (Object.keys($unset).length > 0) {
    updateOps.$unset = $unset;
  }

  if (Object.keys(updateOps).length === 0) {
    throw new AppError('At least one field is required to update', httpStatus.BAD_REQUEST);
  }

  const doc = await ExporterProfile.findByIdAndUpdate(id, updateOps, {
    new: true,
    runValidators: true,
  });
  if (!doc) {
    throw new AppError('Exporter profile not found', httpStatus.NOT_FOUND);
  }
  return doc;
};

const deleteExporterProfileFromDB = async (id: string) => {
  const doc = await ExporterProfile.findByIdAndDelete(id);
  if (!doc) {
    throw new AppError('Exporter profile not found', httpStatus.NOT_FOUND);
  }
  return doc;
};

export const ExporterProfileService = {
  createExporterProfileIntoDB,
  getAllExporterProfilesFromDB,
  getExporterProfileByIdFromDB,
  updateExporterProfileInDB,
  deleteExporterProfileFromDB,
};
