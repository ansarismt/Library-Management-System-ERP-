import { z } from "zod";
import {
	dateInputSchema,
	idParamsSchema,
	nonNegativeNumberSchema,
	objectIdSchema,
} from "./common.validator.js";

const bookCopyFields = {
	bookId: objectIdSchema,
	accessionNumber: z.string().trim().min(1).max(100),
	barcode: z.string().trim().max(100).optional(),
	location: z.string().trim().max(200).optional(),
	status: z.enum([
		"AVAILABLE",
		"ISSUED",
		"RESERVED",
		"LOST",
		"DAMAGED",
		"MAINTENANCE",
	]).optional(),
	condition: z.enum(["NEW", "GOOD", "FAIR", "POOR"]).optional(),
	acquiredAt: dateInputSchema.optional(),
	price: nonNegativeNumberSchema.optional(),
	notes: z.string().trim().max(1000).optional(),
};

export const bookCopyIdParamsSchema = idParamsSchema;
export const bookCopyBookParamsSchema = z.object({
	bookId: objectIdSchema,
}).strict();
export const createBookCopyBodySchema = z.object(bookCopyFields).strict().required({
	bookId: true,
	accessionNumber: true,
});
export const updateBookCopyBodySchema = z.object(bookCopyFields).partial().strict().refine(
	(value) => Object.keys(value).length > 0,
	"at least one field is required"
);
