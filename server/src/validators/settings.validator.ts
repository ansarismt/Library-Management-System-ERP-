import { z } from "zod";

const librarySettingsSchema = z.object({
  libraryName: z.string().trim().min(1).max(150).optional(),
  address: z.string().trim().max(500).optional(),
  phone: z.string().trim().max(30).optional(),
  email: z.string().trim().email().max(254).optional(),
}).strict();

const circulationSettingsSchema = z.object({
  defaultLoanDays: z.number().int().min(1).max(365).optional(),
  maxBooksPerMember: z.number().int().min(1).max(100).optional(),
  renewalLimit: z.number().int().min(0).max(20).optional(),
  finePerDay: z.number().min(0).max(100000).optional(),
}).strict();

const reservationSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  holdDays: z.number().int().min(1).max(30).optional(),
}).strict();

const notificationSettingsSchema = z.object({
  dueSoonEnabled: z.boolean().optional(),
  overdueEnabled: z.boolean().optional(),
  reservationReadyEnabled: z.boolean().optional(),
  fineEnabled: z.boolean().optional(),
}).strict();

const systemSettingsSchema = z.object({
  timezone: z.string().trim().min(1).max(100).optional(),
}).strict();

export const updateSettingsBodySchema = z.object({
  library: librarySettingsSchema.optional(),
  circulation: circulationSettingsSchema.optional(),
  reservations: reservationSettingsSchema.optional(),
  notifications: notificationSettingsSchema.optional(),
  system: systemSettingsSchema.optional(),
}).strict().refine(
  (value) => Object.keys(value).length > 0,
  "at least one section is required"
);