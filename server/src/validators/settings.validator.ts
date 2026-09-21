import { z } from "zod";

const optionalString = (max: number) =>
  z.preprocess(
    (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
    z.string().trim().max(max).optional()
  );

const optionalEmail = () =>
  z.preprocess(
    (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
    z.string().trim().email().max(254).optional()
  );

const librarySettingsSchema = z.object({
  libraryName: z.string().trim().min(1).max(150).optional(),
  address: optionalString(500),
  phone: optionalString(30),
  email: optionalEmail(),
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
  timezone: z.preprocess(
    (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
    z.string().trim().min(1).max(100).optional()
  ),
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