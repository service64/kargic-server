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
