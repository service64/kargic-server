import httpStatus from 'http-status';
import { Types } from 'mongoose';

import AppError from '../../../errors/AppError';
import { ExporterProfile } from '../exporterProfile/exporterProfile.model';
import { shapeExporterProfileForAdminDetails } from '../exporterProfile/exporterProfile.service';
import { ImporterProfile } from '../importerProfile/importerProfile.model';
import { LoginSession } from '../loginSession/loginSession.model';
import { User } from './user.model';

const getUserDetailsForAdminFromDB = async (userId: string) => {
  if (!Types.ObjectId.isValid(userId)) {
    throw new AppError('Invalid user id', httpStatus.BAD_REQUEST);
  }

  const oid = new Types.ObjectId(userId);

  const user = await User.findById(oid)
    .select(
      'name age phone email roles activeRole status isVerified deletedAt lastApiActivityAt profileImage createdAt updatedAt',
    )
    .populate({ path: 'profileImage', select: 'url alt' })
    .lean();

  if (!user) {
    throw new AppError('User not found', httpStatus.NOT_FOUND);
  }

  const [importerProfile, exporterRaw, loginSessions] = await Promise.all([
    ImporterProfile.findOne({ userId: oid }).lean(),
    ExporterProfile.findOne({ userId: oid })
      .populate({ path: 'logoUrl', select: 'url alt' })
      .populate({ path: 'banner0', select: 'url alt' })
      .populate({ path: 'banner1', select: 'url alt' })
      .populate({ path: 'banner2', select: 'url alt' })
      .lean(),
    LoginSession.find({ userId: oid }).sort({ _id: -1 }).lean(),
  ]);

  const exporterProfile = await shapeExporterProfileForAdminDetails(
    exporterRaw as Record<string, unknown> | null,
  );

  return { user, importerProfile, exporterProfile, loginSessions };
};

export const AdminUserDetailsService = {
  getUserDetailsForAdminFromDB,
};

