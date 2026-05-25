import QueryBuilder from '../../../builders/QueryBuilder';
import { User } from './user.model';
import type { AdminUserListRowDto } from './adminUserList.interface';

const escapeRegexChars = (s: string) =>
  s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parseOptionalTrimmedString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const t = value.trim();
  return t.length > 0 ? t : undefined;
};

const pickUserListPaginationQuery = (
  query: Record<string, unknown>,
): Record<string, unknown> => ({
  ...(query.page !== undefined && { page: query.page }),
  ...(query.limit !== undefined && { limit: query.limit }),
});

const extractProfileImageUrl = (raw: unknown): string | null => {
  if (!raw || typeof raw !== 'object') return null;
  const img = raw as Record<string, unknown>;
  return typeof img.url === 'string' && img.url.length > 0 ? img.url : null;
};

const shapeAdminUserRows = (
  users: Record<string, unknown>[],
): AdminUserListRowDto[] =>
  users.map((raw) => ({
    userId: String(raw._id),
    name: typeof raw.name === 'string' ? raw.name.trim() : '',
    email: typeof raw.email === 'string' ? raw.email.trim() : '',
    phone: typeof raw.phone === 'string' ? raw.phone.trim() : '',
    status:
      raw.status === 'ACTIVE' ||
      raw.status === 'BLOCKED' ||
      raw.status === 'DELETED' ||
      raw.status === 'WARNING'
        ? raw.status
        : 'ACTIVE',
    image: extractProfileImageUrl(raw.profileImage),
  }));

const getUsersForAdminFromDB = async (query: Record<string, unknown>) => {
  const paginationQuery = pickUserListPaginationQuery(query);
  const andParts: Record<string, unknown>[] = [
    { deletedAt: null },
    { status: { $ne: 'DELETED' } },
  ];

  const nameFilter = parseOptionalTrimmedString(query.name);
  if (nameFilter) {
    andParts.push({
      name: new RegExp(escapeRegexChars(nameFilter), 'i'),
    });
  }

  const emailFilter = parseOptionalTrimmedString(query.email);
  if (emailFilter) {
    andParts.push({
      email: new RegExp(escapeRegexChars(emailFilter), 'i'),
    });
  }

  const phoneFilter = parseOptionalTrimmedString(query.phone);
  if (phoneFilter) {
    andParts.push({
      phone: new RegExp(escapeRegexChars(phoneFilter), 'i'),
    });
  }

  const matchFilter = { $and: andParts };

  const userQB = new QueryBuilder(User.find(matchFilter), paginationQuery)
    .sort('-createdAt')
    .paginate({ defaultLimit: 20, maxLimit: 100 });

  const meta = await userQB.countTotal();
  const rawRows = (await userQB.modelQuery
    .select('name email phone status profileImage')
    .populate({ path: 'profileImage', select: 'url alt' })
    .lean()) as Record<string, unknown>[];

  const data = shapeAdminUserRows(rawRows);
  return { data, meta };
};

export const AdminUserListService = {
  getUsersForAdminFromDB,
};
