import { z } from "zod";
import { idParamsSchema } from "./common.validator.js";

const memberFields = {
	memberId: z.string().trim().min(1).max(100),
	name: z.string().trim().min(2).max(150),
	email: z.string().trim().email().max(254),
	phone: z.string().trim().max(30).optional(),
	department: z.string().trim().max(150).optional(),
	course: z.string().trim().max(150).optional(),
	year: z.number().int().min(1).max(10).optional(),
	membershipType: z.enum(["STUDENT", "FACULTY", "STAFF", "GUEST"]),
	status: z.enum(["ACTIVE", "SUSPENDED", "EXPIRED", "INACTIVE"]).optional(),
	joinedAt: z.string().refine((value) => !Number.isNaN(Date.parse(value)), "must be a valid date").optional(),
	expiryDate: z.string().refine((value) => !Number.isNaN(Date.parse(value)), "must be a valid date").optional(),
};

export const memberIdParamsSchema = idParamsSchema;
export const createMemberBodySchema = z.object(memberFields).strict().required({
	memberId: true,
	name: true,
	email: true,
	membershipType: true,
});
export const updateMemberBodySchema = z.object(memberFields).partial().strict().refine(
	(value) => Object.keys(value).length > 0,
	"at least one field is required"
);
