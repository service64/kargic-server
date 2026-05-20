import httpStatus from 'http-status';
import { Types } from 'mongoose';
import AppError from '../../../errors/AppError';
import { Image } from '../../media/image.model';
import { ExporterProfile } from './exporterProfile.model';
import type { ICompanyVerificationBundle } from './exporterProfile.interface';

export const VERIFICATION_SECTION_KEYS = [
  'tax',
  'bankSolvency',
  'chamberMembership',
  'erc',
  'tradeLicense',
] as const;

export type VerificationSectionKey = (typeof VERIFICATION_SECTION_KEYS)[number];

const IMAGE_FIELD: Record<VerificationSectionKey, string> = {
  tax: 'vatBinCertificate',
  bankSolvency: 'solvencyCertificate',
  chamberMembership: 'membershipCertificate',
  erc: 'certificate',
  tradeLicense: 'tradeLicenseDocument',
};

function normalizeCvForStore(cv: Record<string, unknown>): void {
  for (const key of VERIFICATION_SECTION_KEYS) {
    const sec = cv[key] as Record<string, unknown> | undefined;
    if (!sec) continue;
    const fld = IMAGE_FIELD[key];
    const v = sec[fld];
    if (v === null || v === undefined || v === '') {
      delete sec[fld];
      continue;
    }
    if (typeof v === 'string' && Types.ObjectId.isValid(v)) {
      sec[fld] = new Types.ObjectId(v);
    }
  }
}

function computeVerifyCompanyPercent(cv: Record<string, unknown>): number {
  let n = 0;
  for (const key of VERIFICATION_SECTION_KEYS) {
    const sec = cv[key];
    if (sec && typeof sec === 'object' && (sec as { verifyByAdmin?: boolean }).verifyByAdmin === true) {
      n += 1;
    }
  }
  return n * 20;
}

function plainCv(
  cv: unknown,
): Record<string, unknown> & { verifyCompanyPercent: number } {
  if (!cv || typeof cv !== 'object') {
    return { verifyCompanyPercent: 0 };
  }
  const o = cv as Record<string, unknown> & { verifyCompanyPercent?: number };
  const base = JSON.parse(JSON.stringify(o)) as Record<string, unknown> & {
    verifyCompanyPercent: number;
  };
  if (typeof base.verifyCompanyPercent !== 'number') {
    base.verifyCompanyPercent = 0;
  }
  return base;
}

export async function populateCompanyVerificationImages(
  cv: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const out = { ...cv };
  const pairs: [VerificationSectionKey, string][] = [
    ['tax', 'vatBinCertificate'],
    ['bankSolvency', 'solvencyCertificate'],
    ['chamberMembership', 'membershipCertificate'],
    ['erc', 'certificate'],
    ['tradeLicense', 'tradeLicenseDocument'],
  ];
  const ids: Types.ObjectId[] = [];
  const refs: { section: VerificationSectionKey; field: string }[] = [];

  for (const [section, field] of pairs) {
    const sec = out[section] as Record<string, unknown> | undefined;
    if (!sec) continue;
    const id = sec[field];
    if (id && Types.ObjectId.isValid(String(id))) {
      ids.push(new Types.ObjectId(String(id)));
      refs.push({ section, field });
    }
  }

  if (ids.length === 0) return out;

  const imgs = await Image.find({ _id: { $in: ids } })
    .select('url alt')
    .lean();
  const map = new Map(imgs.map((i) => [String(i._id), i]));

  for (const { section, field } of refs) {
    const sec = { ...(out[section] as Record<string, unknown>) };
    const id = String(sec[field]);
    const img = map.get(id);
    sec[field] = img
      ? {
          _id: img._id,
          url: img.url,
          alt: typeof img.alt === 'string' ? img.alt : '',
        }
      : { _id: new Types.ObjectId(id), url: null };
    out[section] = sec;
  }
  return out;
}

const findProfileDocByUserId = async (userId: string) => {
  const doc = await ExporterProfile.findOne({
    userId: new Types.ObjectId(userId),
  });
  if (!doc) {
    throw new AppError('Exporter profile not found', httpStatus.NOT_FOUND);
  }
  return doc;
};

export const getCompanyVerificationByUserId = async (userId: string) => {
  const raw = await ExporterProfile.findOne({
    userId: new Types.ObjectId(userId),
  }).lean();
  if (!raw) {
    throw new AppError('Exporter profile not found', httpStatus.NOT_FOUND);
  }
  const cv = (raw as { companyVerification?: unknown }).companyVerification;
  const shaped = await populateCompanyVerificationImages(plainCv(cv));
  return shaped;
};

/** Exporter: merge sections; strips verifyByAdmin; sets verifyByAdmin false per touched section; recalculates %. */
export const patchCompanyVerificationForExporter = async (
  userId: string,
  body: Record<string, unknown>,
) => {
  const profile = await findProfileDocByUserId(userId);
  const cv = plainCv(profile.companyVerification);

  for (const key of VERIFICATION_SECTION_KEYS) {
    const patch = body[key];
    if (!patch || typeof patch !== 'object') continue;

    const cleaned: Record<string, unknown> = {
      ...(patch as Record<string, unknown>),
    };
    delete cleaned.verifyByAdmin;

    const existing = (cv[key] as Record<string, unknown> | undefined) ?? {};
    const merged: Record<string, unknown> = { ...existing, ...cleaned };

    merged.verifyByAdmin = false;
    cv[key] = merged;
  }

  normalizeCvForStore(cv);
  cv.verifyCompanyPercent = computeVerifyCompanyPercent(cv);
  profile.set('companyVerification', cv as unknown as ICompanyVerificationBundle);
  profile.markModified('companyVerification');
  await profile.save();

  return populateCompanyVerificationImages(plainCv(profile.companyVerification));
};

/** Admin: merge any section incl. verifyByAdmin; recalculates % from flags. */
export const patchCompanyVerificationForAdmin = async (
  targetUserId: string,
  body: Record<string, unknown>,
) => {
  const profile = await findProfileDocByUserId(targetUserId);
  const cv = plainCv(profile.companyVerification);

  for (const key of VERIFICATION_SECTION_KEYS) {
    const patch = body[key];
    if (!patch || typeof patch !== 'object') continue;

    const p = patch as Record<string, unknown>;
    const existing = (cv[key] as Record<string, unknown> | undefined) ?? {};
    const merged: Record<string, unknown> = {
      ...existing,
      ...p,
    };
    const imgField = IMAGE_FIELD[key];
    if (imgField in p) {
      if (p[imgField] === null || p[imgField] === '') {
        merged[imgField] = undefined;
      }
    }
    if (typeof p.verifyByAdmin === 'boolean') {
      merged.verifyByAdmin = p.verifyByAdmin;
    } else if (typeof existing.verifyByAdmin === 'boolean') {
      merged.verifyByAdmin = existing.verifyByAdmin;
    } else {
      merged.verifyByAdmin = false;
    }
    cv[key] = merged;
  }

  normalizeCvForStore(cv);
  cv.verifyCompanyPercent = computeVerifyCompanyPercent(cv);
  profile.set('companyVerification', cv as unknown as ICompanyVerificationBundle);
  profile.markModified('companyVerification');
  await profile.save();

  return populateCompanyVerificationImages(plainCv(profile.companyVerification));
};

export const deleteCompanyVerificationForAdmin = async (targetUserId: string) => {
  const profile = await findProfileDocByUserId(targetUserId);
  profile.set('companyVerification', undefined);
  profile.markModified('companyVerification');
  await profile.save();
  return { removed: true as const };
};

export const CompanyVerificationService = {
  getCompanyVerificationByUserId,
  patchCompanyVerificationForExporter,
  patchCompanyVerificationForAdmin,
  deleteCompanyVerificationForAdmin,
  VERIFICATION_SECTION_KEYS,
};
