import httpStatus from 'http-status';
import { Types } from 'mongoose';
import AppError from '../../../errors/AppError';
import { IImporterProfile } from './importerProfile.interface';
import { ImporterProfile } from './importerProfile.model';
import { User } from '../user/user.model';

type CreatePayload = Omit<IImporterProfile, 'userId' | 'createdAt'> & {
  userId: string;
};

const createImporterProfileIntoDB = async (payload: CreatePayload) => {
  const user = await User.findById(payload.userId);
  if (!user) {
    throw new AppError('User not found', httpStatus.NOT_FOUND);
  }
  const isExistImporter = await ImporterProfile.findOne({
    userId: new Types.ObjectId(payload.userId),
  });
  if (isExistImporter) {
    throw new AppError('Importer profile already exists', httpStatus.CONFLICT);
  }

  return ImporterProfile.create({
    ...payload,
    userId: new Types.ObjectId(payload.userId),
  });
};

const getAllImporterProfilesFromDB = async () => {
  return ImporterProfile.find()
    .populate('userId', 'email phone role')
    .sort({ createdAt: -1 });
};

const getImporterProfileByIdFromDB = async (userId: string) => {
  const doc = await ImporterProfile.findOne({
    userId: new Types.ObjectId(userId),
  }).populate('userId', 'email phone role name age');
  // console.log("doc",doc);
  if (!doc) {
    throw new AppError('Importer profile not found', httpStatus.NOT_FOUND);
  }
  return doc;
};

type PublicImporterUserShape = {
  _id: string;
  name: string;
  email: string;
  phone: string;
  activeRole: string;
  isVerified: boolean;
};

function trimPublicImporterUser(u: Record<string, unknown>): PublicImporterUserShape {
  const roles = u.roles;
  const isImporter =
    u.activeRole === 'IMPORTER' ||
    (Array.isArray(roles) && roles.includes('IMPORTER'));
  if (!isImporter) {
    throw new AppError('Not an importer account', httpStatus.NOT_FOUND);
  }
  if (u.status && u.status !== 'ACTIVE') {
    throw new AppError('User not available', httpStatus.NOT_FOUND);
  }
  return {
    _id: String(u._id),
    name: String(u.name ?? ''),
    email: String(u.email ?? ''),
    phone: String(u.phone ?? ''),
    activeRole: String(u.activeRole ?? ''),
    isVerified: Boolean(u.isVerified),
  };
}

/** Public storefront: owner user + importer profile (no auth). */
const getPublicImporterDetailByUserIdFromDB = async (userId: string) => {
  const oid = new Types.ObjectId(userId);

  const doc = await ImporterProfile.findOne({ userId: oid }).populate(
    'userId',
    'name email phone activeRole roles isVerified status',
  );

  if (!doc) {
    throw new AppError('Importer profile not found', httpStatus.NOT_FOUND);
  }

  const o = doc.toObject() as unknown as Record<string, unknown> & {
    userId?: unknown;
  };
  const rawUser = o.userId;
  if (!rawUser || typeof rawUser !== 'object' || Array.isArray(rawUser)) {
    throw new AppError('User not found', httpStatus.NOT_FOUND);
  }
  const user = trimPublicImporterUser(rawUser as Record<string, unknown>);

  const createdAt = o.createdAt;
  const importer = {
    _id: String(o._id),
    userId: String(userId),
    companyName: String(o.companyName ?? ''),
    importLicense: String(o.importLicense ?? ''),
    businessType: String(o.businessType ?? ''),
    country: String(o.country ?? ''),
    ...(createdAt instanceof Date
      ? { createdAt: createdAt.toISOString() }
      : {}),
  };

  return { user, importer };
};

type UpdatePayload = Partial<
  Pick<
    IImporterProfile,
    'companyName' | 'importLicense' | 'businessType' | 'country'
  >
>;

const updateImporterProfileInDB = async (
  id: string,
  payload: UpdatePayload,
) => {
  const doc = await ImporterProfile.findByIdAndUpdate(
    id,
    { $set: payload },
    {
      returnDocument: 'after',
      runValidators: true,
    },
  );
  if (!doc) {
    throw new AppError('Importer profile not found', httpStatus.NOT_FOUND);
  }
  return doc;
};

const deleteImporterProfileFromDB = async (id: string) => {
  const doc = await ImporterProfile.findByIdAndDelete(id);
  if (!doc) {
    throw new AppError('Importer profile not found', httpStatus.NOT_FOUND);
  }
  return doc;
};

export const ImporterProfileService = {
  createImporterProfileIntoDB,
  getAllImporterProfilesFromDB,
  getImporterProfileByIdFromDB,
  getPublicImporterDetailByUserIdFromDB,
  updateImporterProfileInDB,
  deleteImporterProfileFromDB,
};
