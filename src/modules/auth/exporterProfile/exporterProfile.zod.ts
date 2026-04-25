import { z } from "zod";
import { COMPANY_TYPES, EMPLOYEE_COUNTS } from "../../../type/common.type";

const objectIdString = z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid id");

const companyTypeEnum = z.enum(
  COMPANY_TYPES as unknown as [string, ...string[]],
);

const employeeCountEnum = z.enum(
  EMPLOYEE_COUNTS as unknown as [string, ...string[]],
);

const slugSchema = z
  .string()
  .min(1)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Slug must be lowercase alphanumeric with single hyphens",
  );

const mainProductsSchema = z.array(z.string().min(1));

export const createExporterProfileZodSchema = z.object({
  body: z.object({
    companyName: z.string().min(1),
    yearEstablished: z.string().min(4),
    companyType: companyTypeEnum,
    employeeCount: employeeCountEnum,
    mainProducts: mainProductsSchema,
    description: z.string().optional(),
  }),
});

export const exporterProfileIdParamZodSchema = z.object({
  params: z.object({
    id: objectIdString,
  }),
  body: z.any().optional(),
  query: z.any().optional(),
});

export const updateExporterProfileZodSchema = z.object({
  params: z.object({
    id: objectIdString,
  }),
  body: z
    .object({
      companyName: z.string().min(1).optional(),
      slug: slugSchema.optional(),
      logoUrl: objectIdString.optional().nullable(),
      bannerUrl: z
        .tuple([
          z.union([objectIdString, z.null()]),
          z.union([objectIdString, z.null()]),
          z.union([objectIdString, z.null()]),
        ])
        .optional()
        .nullable(),
      yearEstablished: z.string().min(4).optional(),
      companyType: companyTypeEnum.optional(),
      employeeCount: employeeCountEnum.optional(),
      mainProducts: mainProductsSchema.optional(),
      description: z.string().optional().nullable(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field is required to update",
    }),
  query: z.any().optional(),
});
