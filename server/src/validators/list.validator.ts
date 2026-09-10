import { z } from "zod";
import { dateInputSchema, objectIdSchema } from "./common.validator.js";

const pageSchema = z.coerce.number().int().min(1).default(1);
const limitSchema = z.coerce.number().int().min(1).max(100).default(20);
const searchSchema = z.string().trim().min(1).max(100).optional();
const sortSchema = (fields: string[]) => z.enum(fields as [string, ...string[]]).default(fields[0]);
const orderSchema = z.enum(["asc", "desc"]).default("desc");

const baseQueryFields = {
  page: pageSchema,
  limit: limitSchema,
  order: orderSchema,
  search: searchSchema,
  dateFrom: dateInputSchema.optional(),
  dateTo: dateInputSchema.optional(),
};

const withDateRange = (shape: z.ZodRawShape) =>
  z.object({ ...shape, ...baseQueryFields }).strict().refine(
    (value) => {
      const dateFrom = value.dateFrom as string | undefined;
      const dateTo = value.dateTo as string | undefined;
      return !dateFrom || !dateTo || Date.parse(dateFrom) <= Date.parse(dateTo);
    },
    "dateFrom must be earlier than or equal to dateTo"
  );

export const usersQuerySchema = withDateRange({
  sort: sortSchema(["createdAt", "name", "email", "role", "status"]),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
  role: z.enum([
    "SUPER_ADMIN",
    "LIBRARY_ADMIN",
    "LIBRARIAN",
    "ASSISTANT_LIBRARIAN",
    "FACULTY",
    "STUDENT",
    "MEMBER",
    "AUDITOR",
  ]).optional(),
});

export const booksQuerySchema = withDateRange({
  sort: sortSchema(["createdAt", "title", "isbn", "publicationYear", "availableCopies"]),
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
  category: z.string().trim().min(1).max(100).optional(),
});

export const bookCopiesQuerySchema = withDateRange({
  sort: sortSchema(["createdAt", "accessionNumber", "barcode", "status", "condition"]),
  status: z.enum(["AVAILABLE", "ISSUED", "RESERVED", "LOST", "DAMAGED", "MAINTENANCE"]).optional(),
  condition: z.enum(["NEW", "GOOD", "FAIR", "POOR"]).optional(),
  bookId: objectIdSchema.optional(),
});

export const membersQuerySchema = withDateRange({
  sort: sortSchema(["createdAt", "name", "memberId", "email", "status"]),
  status: z.enum(["ACTIVE", "SUSPENDED", "EXPIRED", "INACTIVE"]).optional(),
  membershipType: z.enum(["STUDENT", "FACULTY", "STAFF", "GUEST"]).optional(),
});

export const issuesQuerySchema = withDateRange({
  sort: sortSchema(["createdAt", "issuedAt", "dueAt", "status"]),
  status: z.enum(["ISSUED", "RETURNED", "OVERDUE", "LOST"]).optional(),
  bookId: objectIdSchema.optional(),
  memberId: objectIdSchema.optional(),
});

export const finesQuerySchema = withDateRange({
  sort: sortSchema(["createdAt", "amount", "paidAmount", "status", "daysOverdue"]),
  status: z.enum(["UNPAID", "PAID", "WAIVED", "PARTIAL"]).optional(),
  paymentMethod: z.enum(["CASH", "CARD", "UPI", "BANK_TRANSFER", "ONLINE"]).optional(),
  memberId: objectIdSchema.optional(),
});

export const reservationsQuerySchema = withDateRange({
  sort: sortSchema(["reservedAt", "createdAt", "queuePosition", "status"]),
  status: z.enum(["WAITING", "READY", "FULFILLED", "CANCELLED", "EXPIRED"]).optional(),
  bookId: objectIdSchema.optional(),
  memberId: objectIdSchema.optional(),
});
