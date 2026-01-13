// src/common/schemas/address.schemas.ts
import { z } from 'zod';

export const createAddressSchema = z.object({
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  company: z.string().max(100).optional(), // string vide OK
  phone: z.string().min(6),
  addressLine: z.string().min(5).max(200),
  deliveryNotes: z.string().optional(),
  city: z.string().min(2).max(100),
  state: z.string().optional(), // pas besoin d'en faire un enum ici
  isDefault: z.boolean().optional().default(false),
});

export const updateAddressSchema = z.object({
  firstName: z.string().min(2).max(50).optional(),
  lastName: z.string().min(2).max(50).optional(),
  company: z.string().max(100).optional(),
  phone: z.string().min(6).optional(),
  addressLine: z.string().min(5).max(200).optional(),
  deliveryNotes: z.string().optional(),
  city: z.string().min(2).max(100).optional(),
  state: z.string().optional(),
  isDefault: z.preprocess((v) => {
    // accepte "true" | "false" | true | false
    if (v === 'true') return true;
    if (v === 'false') return false;
    return v;
  }, z.boolean().optional()),
});

export const addressIdParamSchema = z.object({
  addressId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid address ID'),
});
