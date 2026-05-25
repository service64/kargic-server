import httpStatus from 'http-status';
import { Types } from 'mongoose';
import AppError from '../../errors/AppError';
import { ExporterProfile } from '../auth/exporterProfile/exporterProfile.model';
import { ImporterProfile } from '../auth/importerProfile/importerProfile.model';
import { User } from '../auth/user/user.model';
import { Report } from './report.model';
import { ReportType } from './report.interface';

type CreateReportPayload = {
  userId: string;
  reportType: ReportType;
  reportMessage: string;
};

type UpdateReportResolutionPayload = {
  resolved: boolean;
  resolvedMessage?: string;
};

type AdminReportSummaryQuery = Record<string, unknown>;
const REPORT_WARNING_THRESHOLD = 4;
const REPORT_ACTIVE_RESTORE_THRESHOLD = 5;
const LEGACY_DUPLICATE_REPORT_INDEX = 'userId_1_reportBy_1';
let legacyDuplicateIndexDropped = false;

const toObjectId = (id: string) => new Types.ObjectId(id);

const escapeRegexChars = (s: string) =>
  s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parseOptionalTrimmedString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const parsePositiveInt = (value: unknown, fallback: number) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(1, Math.floor(num));
};

const parseDateRangeStart = (value: unknown): Date | null => {
  if (value !== '30' && value !== '90') {
    return null;
  }

  const days = Number(value);
  const start = new Date();
  start.setDate(start.getDate() - days);
  return start;
};

const ensureLegacyDuplicateIndexRemoved = async () => {
  if (legacyDuplicateIndexDropped) {
    return;
  }

  try {
    const indexes = await Report.collection.indexes();
    const hasLegacyIndex = indexes.some(
      (index) => index.name === LEGACY_DUPLICATE_REPORT_INDEX,
    );

    if (hasLegacyIndex) {
      await Report.collection.dropIndex(LEGACY_DUPLICATE_REPORT_INDEX);
    }
  } catch {
    // Ignore index cleanup issues so report creation can continue.
  } finally {
    legacyDuplicateIndexDropped = true;
  }
};

const countUnresolvedReportsByUserId = async (userId: string) =>
  Report.countDocuments({
    userId: toObjectId(userId),
    resolved: false,
  });

const assertTargetUserExists = async (userId: string) => {
  const user = await User.findById(userId)
    .select('name email status')
    .lean();
  if (!user) {
    throw new AppError('Reported user not found', httpStatus.NOT_FOUND);
  }
  return user;
};

const createReportIntoDB = async (
  reportByUserId: string,
  payload: CreateReportPayload,
) => {
  if (reportByUserId === payload.userId) {
    throw new AppError('You cannot report yourself', httpStatus.BAD_REQUEST);
  }

  const targetUser = await assertTargetUserExists(payload.userId);

  await ensureLegacyDuplicateIndexRemoved();

  const existingOpenReport = await Report.exists({
    userId: toObjectId(payload.userId),
    reportBy: toObjectId(reportByUserId),
    resolved: false,
  });

  if (existingOpenReport) {
    throw new AppError(
      'You can report this user again after your previous report is resolved',
      httpStatus.CONFLICT,
    );
  }

  const createdReport = await Report.create({
    userId: toObjectId(payload.userId),
    reportBy: toObjectId(reportByUserId),
    reportType: payload.reportType,
    reportMessage: payload.reportMessage.trim(),
    resolved: false,
  });

  const totalReports = await countUnresolvedReportsByUserId(payload.userId);

  if (
    totalReports >= REPORT_WARNING_THRESHOLD &&
    targetUser.status !== 'WARNING' &&
    targetUser.status !== 'BLOCKED' &&
    targetUser.status !== 'DELETED'
  ) {
    await User.updateOne(
      { _id: toObjectId(payload.userId), status: { $nin: ['WARNING', 'BLOCKED', 'DELETED'] } },
      { $set: { status: 'WARNING' } },
    );
  }

  return createdReport;
};

const getMyReportsFromDB = async (reportByUserId: string) => {
  const reports = await Report.find({
    reportBy: toObjectId(reportByUserId),
  })
    .populate({ path: 'userId', select: 'name email profileImage status' })
    .populate({ path: 'reportBy', select: 'name email' })
    .populate({ path: 'resolvedBy', select: 'name email profileImage status' })
    .sort({ createdAt: -1 })
    .lean();

  return reports;
};

const getReportsAgainstMeFromDB = async (userId: string) => {
  const reports = await Report.find({
    userId: toObjectId(userId),
  })
    .populate({ path: 'userId', select: 'name email profileImage status' })
    .populate({
      path: 'reportBy',
      select: 'name email profileImage status',
      populate: { path: 'profileImage', select: 'url alt' },
    })
    .populate({ path: 'resolvedBy', select: 'name email profileImage status' })
    .sort({ resolved: 1, createdAt: -1 })
    .lean();

  return reports;
};

const getAdminReportSummaryFromDB = async (query: AdminReportSummaryQuery) => {
  const page = parsePositiveInt(query.page, 1);
  const limit = Math.min(parsePositiveInt(query.limit, 10), 100);
  const skip = (page - 1) * limit;
  const searchTerm = parseOptionalTrimmedString(query.searchTerm);
  const sortDirection = query.sort === 'oldest' ? 1 : -1;
  const dateRangeStart = parseDateRangeStart(query.dateRange);

  const pipeline: Record<string, unknown>[] = [];

  if (dateRangeStart) {
    pipeline.push({
      $match: {
        createdAt: { $gte: dateRangeStart },
      },
    });
  }

  pipeline.push(
    {
      $group: {
        _id: '$userId',
        totalReports: { $sum: 1 },
        lastReportedAt: { $max: '$createdAt' },
        resolvedReports: {
          $sum: { $cond: ['$resolved', 1, 0] },
        },
        unresolvedReports: {
          $sum: { $cond: ['$resolved', 0, 1] },
        },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user',
      },
    },
    {
      $unwind: '$user',
    },
    {
      $lookup: {
        from: 'exporterprofiles',
        localField: '_id',
        foreignField: 'userId',
        as: 'exporterProfile',
      },
    },
    {
      $lookup: {
        from: 'importerprofiles',
        localField: '_id',
        foreignField: 'userId',
        as: 'importerProfile',
      },
    },
    {
      $addFields: {
        userIdText: { $toString: '$_id' },
        name: '$user.name',
        email: '$user.email',
        status: '$user.status',
        companyName: {
          $ifNull: [
            { $arrayElemAt: ['$exporterProfile.companyName', 0] },
            { $arrayElemAt: ['$importerProfile.companyName', 0] },
          ],
        },
      },
    },
  );

  if (searchTerm) {
    const re = new RegExp(escapeRegexChars(searchTerm), 'i');
    pipeline.push({
      $match: {
        $or: [
          { userIdText: re },
          { email: re },
          { name: re },
          { companyName: re },
        ],
      },
    });
  }

  const aggregatePipeline = [
    ...pipeline,
    {
      $sort: {
        lastReportedAt: sortDirection,
        totalReports: -1,
      },
    },
    {
      $facet: {
        data: [
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              _id: 0,
              userId: '$userIdText',
              name: 1,
              email: 1,
              status: 1,
              companyName: { $ifNull: ['$companyName', null] },
              totalReports: 1,
              resolvedReports: 1,
              unresolvedReports: 1,
              lastReportedAt: 1,
            },
          },
        ],
        meta: [{ $count: 'total' }],
        overview: [
          {
            $group: {
              _id: null,
              totalReportedUsers: { $sum: 1 },
              totalReports: { $sum: '$totalReports' },
              totalResolvedReports: { $sum: '$resolvedReports' },
              totalUnresolvedReports: { $sum: '$unresolvedReports' },
            },
          },
        ],
      },
    },
  ] as any[];

  const [result] = await Report.aggregate(aggregatePipeline);

  const total =
    result &&
    typeof result === 'object' &&
    Array.isArray((result as { meta?: unknown[] }).meta) &&
    (result as { meta: Array<{ total?: number }> }).meta[0]?.total
      ? (result as { meta: Array<{ total?: number }> }).meta[0]!.total!
      : 0;

  const totalPage = Math.max(1, Math.ceil(total / limit));

  const overview =
    result &&
    typeof result === 'object' &&
    Array.isArray((result as { overview?: unknown[] }).overview) &&
    (result as { overview: Array<Record<string, unknown>> }).overview[0]
      ? (result as { overview: Array<Record<string, unknown>> }).overview[0]!
      : {};

  return {
    data:
      result &&
      typeof result === 'object' &&
      Array.isArray((result as { data?: unknown[] }).data)
        ? (result as { data: unknown[] }).data
        : [],
    meta: {
      page,
      limit,
      total,
      totalPage,
      hasNextPage: page < totalPage,
      hasPrevPage: page > 1,
    },
    overview: {
      totalReportedUsers:
        typeof overview.totalReportedUsers === 'number'
          ? overview.totalReportedUsers
          : 0,
      totalReports:
        typeof overview.totalReports === 'number' ? overview.totalReports : 0,
      totalResolvedReports:
        typeof overview.totalResolvedReports === 'number'
          ? overview.totalResolvedReports
          : 0,
      totalUnresolvedReports:
        typeof overview.totalUnresolvedReports === 'number'
          ? overview.totalUnresolvedReports
          : 0,
    },
  };
};

const getAdminReportsByUserIdFromDB = async (userId: string) => {
  if (!Types.ObjectId.isValid(userId)) {
    throw new AppError('Invalid user id', httpStatus.BAD_REQUEST);
  }

  const [reportedUser, exporterProfile, importerProfile, reports] =
    await Promise.all([
      assertTargetUserExists(userId),
      ExporterProfile.findOne({ userId: toObjectId(userId) })
        .select('companyName')
        .lean(),
      ImporterProfile.findOne({ userId: toObjectId(userId) })
        .select('companyName')
        .lean(),
      Report.find({ userId: toObjectId(userId) })
        .populate({
          path: 'reportBy',
          select: 'name email profileImage status',
          populate: { path: 'profileImage', select: 'url alt' },
        })
        .populate({
          path: 'resolvedBy',
          select: 'name email profileImage status',
        })
        .sort({ resolved: 1, createdAt: -1 })
        .lean(),
    ]);

  const reportedCompanyName =
    (exporterProfile &&
    typeof exporterProfile === 'object' &&
    typeof (exporterProfile as { companyName?: unknown }).companyName === 'string'
      ? (exporterProfile as { companyName: string }).companyName
      : undefined) ??
    (importerProfile &&
    typeof importerProfile === 'object' &&
    typeof (importerProfile as { companyName?: unknown }).companyName === 'string'
      ? (importerProfile as { companyName: string }).companyName
      : null);

  return {
    reportedUser,
    reportedCompanyName,
    totalReports: reports.length,
    resolvedReports: reports.filter((report) => Boolean(report.resolved)).length,
    unresolvedReports: reports.filter((report) => !report.resolved).length,
    reports,
  };
};

const updateReportResolutionInDB = async (
  adminUserId: string,
  reportId: string,
  payload: UpdateReportResolutionPayload,
) => {
  if (!Types.ObjectId.isValid(reportId)) {
    throw new AppError('Invalid report id', httpStatus.BAD_REQUEST);
  }

  const trimmedResolutionMessage = payload.resolvedMessage?.trim();

  const updateQuery = payload.resolved
    ? {
        $set: {
          resolved: true,
          resolvedAt: new Date(),
          resolvedBy: toObjectId(adminUserId),
          ...(trimmedResolutionMessage
            ? { resolvedMessage: trimmedResolutionMessage }
            : {}),
        },
        ...(trimmedResolutionMessage ? {} : { $unset: { resolvedMessage: '' } }),
      }
    : {
        $set: {
          resolved: false,
        },
        $unset: {
          resolvedAt: '',
          resolvedBy: '',
          resolvedMessage: '',
        },
      };

  const report = await Report.findByIdAndUpdate(reportId, updateQuery, {
    new: true,
    runValidators: true,
  })
    .populate({ path: 'userId', select: 'name email profileImage status' })
    .populate({ path: 'reportBy', select: 'name email profileImage status' })
    .populate({ path: 'resolvedBy', select: 'name email profileImage status' })
    .lean();

  if (!report) {
    throw new AppError('Report not found', httpStatus.NOT_FOUND);
  }

  const targetUserId =
    report.userId && typeof report.userId === 'object' && '_id' in report.userId
      ? String((report.userId as { _id?: unknown })._id ?? '')
      : typeof report.userId === 'string'
        ? report.userId
        : '';

  if (payload.resolved && targetUserId) {
    const unresolvedCount = await countUnresolvedReportsByUserId(targetUserId);

    if (unresolvedCount < REPORT_ACTIVE_RESTORE_THRESHOLD) {
      await User.updateOne(
        { _id: toObjectId(targetUserId), status: 'WARNING' },
        { $set: { status: 'ACTIVE' } },
      );
    }
  }

  return report;
};

export const ReportService = {
  createReportIntoDB,
  getMyReportsFromDB,
  getReportsAgainstMeFromDB,
  getAdminReportSummaryFromDB,
  getAdminReportsByUserIdFromDB,
  updateReportResolutionInDB,
};
