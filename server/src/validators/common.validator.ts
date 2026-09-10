import { z } from "zod";

export const objectIdSchema = z.string().regex(
  /^[a-f\d]{24}$/i,
  "must be a valid MongoDB ObjectId"
);

export const dateInputSchema = z.string().refine(
  (value) => !Number.isNaN(Date.parse(value)),
  "must be a valid date"
);

export const nonNegativeNumberSchema = z.union([
  z.number().finite().nonnegative(),
  z.string().regex(/^\d+(\.\d+)?$/, "must be a non-negative number"),
]);

export const positiveNumberSchema = z.union([
  z.number().finite().positive(),
  z.string().regex(/^\d+(\.\d+)?$/, "must be a positive number"),
]);

export const positiveIntegerSchema = z.union([
  z.number().int().positive(),
  z.string().regex(/^[1-9]\d*$/, "must be a positive integer"),
]);

export const idParamsSchema = z.object({
  id: objectIdSchema,
}).strict();
