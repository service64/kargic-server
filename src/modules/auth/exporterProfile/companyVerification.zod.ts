import { z } from 'zod';

const objectIdString = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');

const optionalObjectId = objectIdString.optional();

export const patchExporterCompanyVerificationZodSchema = z.object({
  params: z.any().optional(),
  body: z
    .object({
      tax: z
        .object({
          eTinNumber: z.string().optional(),
          binNumber: z.string().optional(),
          vatBinCertificate: optionalObjectId,
        })
        .optional(),
      bankSolvency: z
        .object({
          bankName: z.string().optional(),
          accountHolderName: z.string().optional(),
          accountNumber: z.string().optional(),
          issueDate: z.string().optional(),
          solvencyCertificate: optionalObjectId,
        })
        .optional(),
      chamberMembership: z
        .object({
          chamberName: z.string().optional(),
          memberId: z.string().optional(),
          validityDate: z.string().optional(),
          membershipCertificate: optionalObjectId,
        })
        .optional(),
      erc: z
        .object({
          ercNumber: z.string().optional(),
          issuingAuthority: z.string().optional(),
          issueDate: z.string().optional(),
          expiryDate: z.string().optional(),
          certificate: optionalObjectId,
        })
        .optional(),
      tradeLicense: z
        .object({
          tradeLicenseNumber: z.string().optional(),
          businessType: z.string().optional(),
          issueDate: z.string().optional(),
          expiryDate: z.string().optional(),
          tradeLicenseDocument: optionalObjectId,
        })
        .optional(),
    })
    .refine(
      (b) =>
        b.tax != null ||
        b.bankSolvency != null ||
        b.chamberMembership != null ||
        b.erc != null ||
        b.tradeLicense != null,
      { message: 'At least one verification section is required' },
    ),
  query: z.any().optional(),
});

const nullableObjectId = z.union([objectIdString, z.null()]).optional();

export const patchAdminCompanyVerificationZodSchema = z.object({
  params: z.object({
    userId: objectIdString,
  }),
  body: z
    .object({
      tax: z
        .object({
          eTinNumber: z.string().optional(),
          binNumber: z.string().optional(),
          vatBinCertificate: nullableObjectId,
          verifyByAdmin: z.boolean().optional(),
        })
        .optional(),
      bankSolvency: z
        .object({
          bankName: z.string().optional(),
          accountHolderName: z.string().optional(),
          accountNumber: z.string().optional(),
          issueDate: z.string().optional(),
          solvencyCertificate: nullableObjectId,
          verifyByAdmin: z.boolean().optional(),
        })
        .optional(),
      chamberMembership: z
        .object({
          chamberName: z.string().optional(),
          memberId: z.string().optional(),
          validityDate: z.string().optional(),
          membershipCertificate: nullableObjectId,
          verifyByAdmin: z.boolean().optional(),
        })
        .optional(),
      erc: z
        .object({
          ercNumber: z.string().optional(),
          issuingAuthority: z.string().optional(),
          issueDate: z.string().optional(),
          expiryDate: z.string().optional(),
          certificate: nullableObjectId,
          verifyByAdmin: z.boolean().optional(),
        })
        .optional(),
      tradeLicense: z
        .object({
          tradeLicenseNumber: z.string().optional(),
          businessType: z.string().optional(),
          issueDate: z.string().optional(),
          expiryDate: z.string().optional(),
          tradeLicenseDocument: nullableObjectId,
          verifyByAdmin: z.boolean().optional(),
        })
        .optional(),
    })
    .refine(
      (b) =>
        b.tax != null ||
        b.bankSolvency != null ||
        b.chamberMembership != null ||
        b.erc != null ||
        b.tradeLicense != null,
      { message: 'At least one verification section is required' },
    ),
  query: z.any().optional(),
});

export const exporterVerificationMeParamZodSchema = z.object({
  params: z.any().optional(),
  body: z.any().optional(),
  query: z.any().optional(),
});

export const exporterVerificationAdminUserParamZodSchema = z.object({
  params: z.object({
    userId: objectIdString,
  }),
  body: z.any().optional(),
  query: z.any().optional(),
});
