import { z } from "zod";
import { idParamsSchema, nonNegativeNumberSchema } from "./common.validator.js";

const bookFields = {
  isbn: z.string().trim().min(1).max(32),
  title: z.string().trim().min(1).max(250),
  subtitle: z.string().trim().max(250).optional(),
  authors: z.array(z.string().trim().min(1).max(150)).min(1),
  publisher: z.string().trim().max(200).optional(),
  publicationYear: z.number().int().min(1000).max(new Date().getFullYear()).optional(),
  edition: z.string().trim().max(100).optional(),
  category: z.string().trim().max(100).optional(),
  language: z.string().trim().max(100).optional(),
  description: z.string().trim().max(5000).optional(),
  coverImage: z.string().trim().max(2000).optional(),
  totalCopies: nonNegativeNumberSchema,
  availableCopies: nonNegativeNumberSchema.optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
};

export const bookIdParamsSchema = idParamsSchema;
export const bookIsbnParamsSchema = z.object({
  isbn: z.string().trim().min(1).max(32),
}).strict();
export const createBookBodySchema = z.object(bookFields).strict();
export const updateBookBodySchema = z.object(bookFields).partial().strict().refine(
  (value) => Object.keys(value).length > 0,
  "at least one field is required"
);
