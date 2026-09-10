import { z } from "zod";
import {
  dateInputSchema,
  idParamsSchema,
  objectIdSchema,
} from "./common.validator.js";

export const reservationIdParamsSchema = idParamsSchema;
export const reservationBookParamsSchema = z.object({
  bookId: objectIdSchema,
}).strict();
export const reservationMemberParamsSchema = z.object({
  memberId: objectIdSchema,
}).strict();

export const createReservationBodySchema = z.object({
  bookId: objectIdSchema,
  memberId: objectIdSchema,
  expiresAt: dateInputSchema.optional(),
  notes: z.string().trim().max(500).optional(),
}).strict();

export const updateReservationBodySchema = z.object({
  expiresAt: dateInputSchema.optional(),
  notes: z.string().trim().max(500).optional(),
}).strict().refine(
  (value) => Object.keys(value).length > 0,
  "at least one field is required"
);

export const fulfillReservationBodySchema = z.object({
  dueAt: dateInputSchema,
  notes: z.string().trim().max(1000).optional(),
}).strict();
