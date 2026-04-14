import { Types } from 'mongoose';

/** Admin staff tier; align with `admin.model` `role.enum`. */
export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT';

export const ADMIN_ROLE_VALUES = ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'] as const satisfies readonly AdminRole[];

export interface IAdmin {
  userId: Types.ObjectId;

  role: AdminRole;
  profileImage: Types.ObjectId;
  designation: string;

  department?: string;

  nid: Types.ObjectId;

  permissions: string[];

  joinDate: Date;

  isActive: boolean;

  isDeleted: boolean;

  /** Optional: another admin document this user reports to (manager). */
  reportsTo?: Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;
}
