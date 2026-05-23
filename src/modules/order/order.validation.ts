import { z } from 'zod';

const objectIdString = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');

const orderItemSchema = z.object({
  productId: objectIdString,
  quantity: z.number().int().positive(),
  unitPrice: z.number().positive(),
});

/** Inline snapshot — same fields as `ShippingAddress` (no userId / isDefault). */
const inlineShippingAddressSchema = z.object({
  fullName: z.string().min(1).trim(),
  phone: z.string().min(1).trim(),
  addressLine: z.string().min(1).trim(),
  city: z.string().min(1).trim(),
  state: z.string().trim().optional(),
  postalCode: z.string().trim().optional(),
  country: z.string().min(1).trim(),
});

const paymentBodySchema = z.object({
  method: z.enum(['bkash', 'nagad', 'card', 'cod']),
  transactionId: z.string().trim().optional(),
});

export const createOrderZodSchema = z
  .object({
    body: z.object({
      items: z.array(orderItemSchema).min(1, 'At least one item is required'),
      payment: paymentBodySchema,
      /** Use a saved address: server copies a snapshot and stores this id on the order. */
      shippingAddressId: objectIdString.optional(),
      /** Required if `shippingAddressId` is omitted. */
      shippingAddress: inlineShippingAddressSchema.optional(),
    }),
  })
  .superRefine((data, ctx) => {
    const { shippingAddressId, shippingAddress } = data.body;
    if (!shippingAddressId && !shippingAddress) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Provide shippingAddressId (saved address) or shippingAddress (inline snapshot)',
        path: ['body', 'shippingAddress'],
      });
    }
  });

const orderStatusEnum = z.enum([
  'awaiting_exporter_approval',
  'confirmed',
  'processing',
  'shipped',
  'received',
  'cheking',
  'completed',
  'cancelled',
  'returned',
]);

/** PATCH `/:id/status` — body is the desired next status (validated against workflow server-side). */
export const orderStatusTransitionZodSchema = z.object({
  params: z.object({
    id: objectIdString,
  }),
  body: z.object({
    status: orderStatusEnum,
  }),
});

/** GET `/:id` — order details (params only). */
export const orderDetailsParamsZodSchema = z.object({
  params: z.object({
    id: objectIdString,
  }),
});

/** GET `/` — pagination + filters (custom filters applied in service, not via QueryBuilder.filter). */
export const getOrdersQueryZodSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    sort: z.string().trim().optional(),
    fields: z.string().trim().optional(),
    productId: objectIdString.optional(),
    productName: z.string().trim().max(200).optional(),
    userId: objectIdString.optional(),
    userName: z.string().trim().max(200).optional(),
    /** Exact match on Order `_id`. */
    orderId: objectIdString.optional(),
  }),
});

/** GET `/admin` — admin order list (pagination + optional filters). */
export const adminGetOrdersQueryZodSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    sort: z.string().trim().optional(),
    fields: z.string().trim().optional(),
    status: orderStatusEnum.optional(),
    productId: objectIdString.optional(),
    productName: z.string().trim().max(200).optional(),
    /** Importer (buyer) user id. */
    userId: objectIdString.optional(),
    userName: z.string().trim().max(200).optional(),
    orderId: objectIdString.optional(),
    /** Filter orders created on this UTC calendar day (`YYYY-MM-DD`). */
    orderDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'orderDate must be YYYY-MM-DD')
      .optional(),
  }),
});
