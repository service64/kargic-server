import type { UserStatus } from './user.interface';

/** Row for `GET /user/admin` (paginated platform users). */
export type AdminUserListRowDto = {
  userId: string;
  name: string;
  email: string;
  phone: string;
  status: UserStatus;
  image: string | null;
};
