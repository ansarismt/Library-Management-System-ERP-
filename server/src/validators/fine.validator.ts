import { z } from "zod";
import {
  idParamsSchema,
  objectIdSchema,
  positiveNumberSchema,
} from "./common.validator.js";

export const fineIdParamsSchema = idParamsSchema;
export const fineIssueParamsSchema = z.object({
  issueId: objectIdSchema,
}).strict();
export const fineMemberParamsSchema = z.object({
  memberId: objectIdSchema,
}).strict();

export const payFineBodySchema = z.object({
  amount: positiveNumberSchema,
  paymentMethod: z.enum([
    "CASH",
    "CARD",
    "UPI",
    "BANK_TRANSFER",
    "ONLINE",
  ]),
  paidBy: objectIdSchema,
}).strict();

export const waiveFineBodySchema = z.object({
  waivedBy: objectIdSchema,
  reason: z.string().trim().min(1).max(1000),
}).strict();
