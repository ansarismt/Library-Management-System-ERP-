import { z } from "zod";
import { dateInputSchema, objectIdSchema } from "./common.validator.js";

export const reportQuerySchema = z.object({
  dateFrom: dateInputSchema.optional(),
  dateTo: dateInputSchema.optional(),
  status: z.string().trim().min(1).max(30).optional(),
  category: z.string().trim().min(1).max(100).optional(),
  bookId: objectIdSchema.optional(),
  memberId: objectIdSchema.optional(),
}).strict().refine(
  (value) => !value.dateFrom || !value.dateTo || Date.parse(value.dateFrom) <= Date.parse(value.dateTo),
  "dateFrom must be earlier than or equal to dateTo"
);
