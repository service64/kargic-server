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
  updateImporterProfileInDB,
  deleteImporterProfileFromDB,
};
