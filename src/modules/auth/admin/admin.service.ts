import httpStatus from 'http-status';
import { Types } from 'mongoose';
import AppError from '../../../errors/AppError';
import type { AdminRole, IAdmin } from './admin.interface';
import { Admin } from './admin.model';
import { User } from '../user/user.model';
import { Image } from '../../media/image.model';

const toObjectId = (id: string) => new Types.ObjectId(id);

type CreatePayload = {
  userId: string;
  role: AdminRole;
  profileImage: string;
  designation: string;
  department?: string;
  nid: string;
  permissions: string[];
  joinDate: Date | string;
  isActive?: boolean;
  reportsTo?: string;
};

const assertUserExists = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', httpStatus.NOT_FOUND);
  }
};

const assertImagesExist = async (...ids: string[]) => {
  for (const id of ids) {
    const img = await Image.findById(id).lean();
    if (!img) {
      throw new AppError(`Image not found: ${id}`, httpStatus.BAD_REQUEST);
    }
  }
};

const assertReportsToAdmin = async (
  reportsToId: string | undefined,
  excludeAdminId?: string,
) => {
  if (!reportsToId) return;
  const manager = await Admin.findOne({
    _id: toObjectId(reportsToId),
    isDeleted: false,
  }).lean();
  if (!manager) {
    throw new AppError('reportsTo admin not found', httpStatus.BAD_REQUEST);
  }
  if (excludeAdminId && reportsToId === excludeAdminId) {
    throw new AppError(
      'Admin cannot report to themselves',
      httpStatus.BAD_REQUEST,
    );
  }
};

const createAdminIntoDB = async (payload: CreatePayload) => {
  await assertUserExists(payload.userId);

  const exists = await Admin.findOne({
    userId: toObjectId(payload.userId),
    isDeleted: false,
  });
  if (exists) {
    throw new AppError(
      'Admin profile already exists for this user',
      httpStatus.CONFLICT,
    );
  }

  await assertImagesExist(payload.profileImage, payload.nid);
  await assertReportsToAdmin(payload.reportsTo);

  const joinDate =
    payload.joinDate instanceof Date
      ? payload.joinDate
      : new Date(String(payload.joinDate));

  return Admin.create({
    userId: toObjectId(payload.userId),
    role: payload.role,
    profileImage: toObjectId(payload.profileImage),
    designation: payload.designation,
    ...(payload.department !== undefined && { department: payload.department }),
    nid: toObjectId(payload.nid),
    permissions: payload.permissions,
    joinDate,
    isActive: payload.isActive ?? true,
    isDeleted: false,
    ...(payload.reportsTo && { reportsTo: toObjectId(payload.reportsTo) }),
  });
};

const getAllAdminsFromDB = async (includeDeleted = false) => {
  const filter = includeDeleted ? {} : { isDeleted: false };
  return Admin.find(filter)
    .populate('userId', 'email phone activeRole')
    .populate('profileImage', 'url name alt')
    .populate('nid', 'url name alt')
    .populate('reportsTo', 'designation department role')
    .sort({ createdAt: -1 });
};

const getAdminByIdFromDB = async (id: string) => {
  const doc = await Admin.findById(id)
    .populate('userId', 'email phone activeRole')
    .populate('profileImage', 'url name alt')
    .populate('nid', 'url name alt')
    .populate('reportsTo', 'designation department role');
  if (!doc || doc.isDeleted) {
    throw new AppError('Admin not found', httpStatus.NOT_FOUND);
  }
  return doc;
};

type UpdateFields = Partial<
  Pick<
    IAdmin,
    | 'role'
    | 'designation'
    | 'department'
    | 'permissions'
    | 'joinDate'
    | 'isActive'
    | 'isDeleted'
  >
> & {
  profileImage?: Types.ObjectId;
  nid?: Types.ObjectId;
  reportsTo?: Types.ObjectId | null;
};

const updateAdminInDB = async (id: string, body: Record<string, unknown>) => {
  const current = await Admin.findById(id);
  if (!current || current.isDeleted) {
    throw new AppError('Admin not found', httpStatus.NOT_FOUND);
  }

  const set: UpdateFields = {};

  if (typeof body.role === 'string') set.role = body.role as AdminRole;
  if (typeof body.designation === 'string') set.designation = body.designation;

  const unsetFields: Record<string, ''> = {};
  if (body.department === null) {
    unsetFields.department = '';
  } else if (typeof body.department === 'string') {
    set.department = body.department;
  }
  if (Array.isArray(body.permissions))
    set.permissions = body.permissions as string[];
  if (typeof body.isActive === 'boolean') set.isActive = body.isActive;
  if (typeof body.isDeleted === 'boolean') set.isDeleted = body.isDeleted;

  if (typeof body.profileImage === 'string') {
    await assertImagesExist(body.profileImage);
    set.profileImage = toObjectId(body.profileImage);
  }
  if (typeof body.nid === 'string') {
    await assertImagesExist(body.nid);
    set.nid = toObjectId(body.nid);
  }

  if (body.reportsTo === null) {
    unsetFields.reportsTo = '';
  } else if (typeof body.reportsTo === 'string') {
    await assertReportsToAdmin(body.reportsTo, id);
    set.reportsTo = toObjectId(body.reportsTo);
  }

  if (body.joinDate != null) {
    set.joinDate =
      body.joinDate instanceof Date
        ? body.joinDate
        : new Date(String(body.joinDate));
  }

  const hasUnset = Object.keys(unsetFields).length > 0;
  if (Object.keys(set).length === 0 && !hasUnset) {
    throw new AppError(
      'At least one field is required to update',
      httpStatus.BAD_REQUEST,
    );
  }

  const updateDoc: Record<string, unknown> = {};
  if (Object.keys(set).length > 0) {
    updateDoc.$set = set;
  }
  if (hasUnset) {
    updateDoc.$unset = unsetFields;
  }

  const doc = await Admin.findByIdAndUpdate(id, updateDoc, {
    returnDocument: 'after',
    runValidators: true,
  })
    .populate('userId', 'email phone activeRole')
    .populate('profileImage', 'url name alt')
    .populate('nid', 'url name alt')
    .populate('reportsTo', 'designation department role');

  if (!doc) {
    throw new AppError('Admin not found', httpStatus.NOT_FOUND);
  }
  return doc;
};

/** Soft delete: marks isDeleted and clears isActive. */
const softDeleteAdminFromDB = async (id: string) => {
  const doc = await Admin.findByIdAndUpdate(
    id,
    { $set: { isDeleted: true, isActive: false } },
    { returnDocument: 'after' },
  );
  if (!doc) {
    throw new AppError('Admin not found', httpStatus.NOT_FOUND);
  }
  return doc;
};

export const AdminService = {
  createAdminIntoDB,
  getAllAdminsFromDB,
  getAdminByIdFromDB,
  updateAdminInDB,
  softDeleteAdminFromDB,
};
