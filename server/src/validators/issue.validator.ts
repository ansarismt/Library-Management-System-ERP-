import { z } from "zod";
import {
  dateInputSchema,
  idParamsSchema,
  objectIdSchema,
  positiveIntegerSchema,
} from "./common.validator.js";

export const issueIdParamsSchema = idParamsSchema;
export const issueMemberParamsSchema = z.object({
  memberId: objectIdSchema,
}).strict();
export const issueBookParamsSchema = z.object({
  issueId: objectIdSchema,
}).strict();

export const createIssueBodySchema = z.object({
  bookId: objectIdSchema,
  bookCopyId: objectIdSchema,
  memberId: objectIdSchema,
  issuedBy: objectIdSchema,
  dueAt: dateInputSchema,
  notes: z.string().trim().max(1000).optional(),
}).strict();

export const returnIssueBodySchema = z.object({
  returnedBy: objectIdSchema,
  notes: z.string().trim().max(1000).optional(),
}).strict();

export const renewIssueBodySchema = z.object({
  additionalDays: positiveIntegerSchema.optional(),
  dueAt: dateInputSchema.optional(),
}).strict().refine(
  (value) => value.additionalDays !== undefined || value.dueAt !== undefined,
  "provide additionalDays or dueAt"
);

export const updateIssueBodySchema = z.object({
  dueAt: dateInputSchema.optional(),
  notes: z.string().trim().max(1000).optional(),
}).strict().refine(
  (value) => Object.keys(value).length > 0,
  "at least one field is required"
);
