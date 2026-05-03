import httpStatus from 'http-status';
import { Types } from 'mongoose';
import AppError from '../../../errors/AppError';
import { ExporterProfile } from './exporterProfile.model';
import { User } from '../user/user.model';
import type { CompanyType, EmployeeCount } from '../../../type/common.type';
import { generateSlug } from '../../../utils/generateSlug';
import { IExporterProfile } from './exporterProfile.interface';

type CreatePayload = {
  userId: string;
  companyName: string;
  slug: string;
  logoUrl?: string;
  bannerUrl?: string[];
  yearEstablished: string;
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

  const slug = generateSlug(user.name, payload.companyName);

  // optional unique check (extra safety)
  const existingSlug = await ExporterProfile.findOne({ slug });
  if (existingSlug) {
    throw new AppError('Slug already exists', httpStatus.BAD_REQUEST);
  }

  const exporterData: IExporterProfile = {
    userId: new Types.ObjectId(payload.userId),
    companyName: payload.companyName,
    slug,
    yearEstablished: payload.yearEstablished,
    companyType: payload.companyType,
    employeeCount: payload.employeeCount,
    mainProducts: payload.mainProducts,
  };

  // optional fields clean ভাবে add
  if (payload.logoUrl) {
    exporterData.logoUrl = new Types.ObjectId(payload.logoUrl);
  }

  if (payload.bannerUrl?.length) {
    const b = payload.bannerUrl;
    if (b[0]) exporterData.banner0 = toObjectId(b[0]);
    if (b[1]) exporterData.banner1 = toObjectId(b[1]);
    if (b[2]) exporterData.banner2 = toObjectId(b[2]);
  }

  if (payload.description) {
    exporterData.description = payload.description;
  }

  return ExporterProfile.create(exporterData);
};

const getAllExporterProfilesFromDB = async () => {
  return ExporterProfile.find()
    .populate('userId', 'email phone role')
    .sort({ createdAt: -1 });
};

const getExporterProfileByIdFromDB = async (userId: string) => {
  const doc = await ExporterProfile.findOne({
    userId: new Types.ObjectId(userId),
  })
    .populate('userId', 'email phone role name age')
    .populate('logoUrl', 'url alt')
    .populate('banner0', 'url alt _id')
    .populate('banner1', 'url alt _id')
    .populate('banner2', 'url alt _id');
  if (!doc) {
    throw new AppError('Exporter profile not found', httpStatus.NOT_FOUND);
  }
  const o = doc.toObject() as unknown as Record<string, unknown> & {
    banner0?: unknown;
    banner1?: unknown;
    banner2?: unknown;
    bannerUrl?: unknown;
  };
  const legacy = o.bannerUrl;
  const legacyArr = Array.isArray(legacy) ? legacy : null;
  const s0 = o.banner0 ?? legacyArr?.[0];
  const s1 = o.banner1 ?? legacyArr?.[1];
  const s2 = o.banner2 ?? legacyArr?.[2];
  const { banner0, banner1, banner2, bannerUrl: _legacyField, ...rest } = o;
  return {
    ...rest,
    bannerUrl: [s0 ?? null, s1 ?? null, s2 ?? null],
  };
};

const updateExporterProfileInDB = async (
  id: string,
  body: Record<string, unknown>,
) => {
  // console.log("body",body);
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
    $unset.banner0 = '';
    $unset.banner1 = '';
    $unset.banner2 = '';
    $unset.bannerUrl = '';
  } else if (
    Array.isArray(body.bannerUrl) &&
    (body.bannerUrl as unknown[]).length === 3
  ) {
    const [a, b, c] = body.bannerUrl as (string | null)[];
    if (a === null) {
      $unset.banner0 = '';
    } else if (typeof a === 'string') {
      $set.banner0 = toObjectId(a);
    }
    if (b === null) {
      $unset.banner1 = '';
    } else if (typeof b === 'string') {
      $set.banner1 = toObjectId(b);
    }
    if (c === null) {
      $unset.banner2 = '';
    } else if (typeof c === 'string') {
      $set.banner2 = toObjectId(c);
    }
    $unset.bannerUrl = '';
  }
  if (
    typeof body.yearEstablished === 'string' &&
    body.yearEstablished.length >= 4
  ) {
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
    throw new AppError(
      'At least one field is required to update',
      httpStatus.BAD_REQUEST,
    );
  }

  const doc = await ExporterProfile.findByIdAndUpdate(id, updateOps, {
    returnDocument: 'after',
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
