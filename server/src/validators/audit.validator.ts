import { z } from "zod";
import { dateInputSchema, objectIdSchema } from "./common.validator.js";

export const auditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).max(100).optional(),
  sort: z.enum(["createdAt", "action", "resourceType", "success"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
  action: z.string().trim().min(1).max(60).optional(),
  resourceType: z.enum(["AUTH", "USER", "BOOK", "BOOK_COPY", "MEMBER", "ISSUE", "FINE", "RESERVATION"]).optional(),
  actorUserId: objectIdSchema.optional(),
  success: z.enum(["true", "false"]).transform((value) => value === "true").optional(),
  dateFrom: dateInputSchema.optional(),
  dateTo: dateInputSchema.optional(),
}).strict().refine(
  (value) => !value.dateFrom || !value.dateTo || Date.parse(value.dateFrom) <= Date.parse(value.dateTo),
  "dateFrom must be earlier than or equal to dateTo"
);
