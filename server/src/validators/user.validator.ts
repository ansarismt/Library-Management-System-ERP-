import { z } from "zod";
import { idParamsSchema } from "./common.validator.js";

const roleSchema = z.enum([
  "SUPER_ADMIN",
  "LIBRARY_ADMIN",
  "LIBRARIAN",
  "ASSISTANT_LIBRARIAN",
  "FACULTY",
  "STUDENT",
  "MEMBER",
  "AUDITOR",
]);

const statusSchema = z.enum([
  "ACTIVE",
  "INACTIVE",
  "SUSPENDED",
]);

export const userIdParamsSchema = idParamsSchema;

export const createUserBodySchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
  role: roleSchema,
  status: statusSchema.optional(),
  memberId: z.string().trim().min(1).max(100).optional(),
  department: z.string().trim().max(150).optional(),
}).strict();

export const updateUserBodySchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  email: z.string().trim().email().max(254).optional(),
  status: statusSchema.optional(),
  memberId: z.string().trim().min(1).max(100).optional(),
  department: z.string().trim().max(150).optional(),
}).strict().refine(
  (value) => Object.keys(value).length > 0,
  "at least one field is required"
);

export const changeUserRoleBodySchema = z.object({
  role: roleSchema,
}).strict();
