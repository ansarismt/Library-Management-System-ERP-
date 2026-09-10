import { Router } from "express";

import { authenticate } from "../middleware/auth.middleware.js";
import { authorizePermission } from "../middleware/authorization.middleware.js";
import { PERMISSIONS } from "../constants/permissions.js";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../middleware/validation.middleware.js";
import {
  createMemberBodySchema,
  memberIdParamsSchema,
  updateMemberBodySchema,
} from "../validators/member.validator.js";
import { membersQuerySchema } from "../validators/list.validator.js";
import { sensitiveMutationLimiter } from "../middleware/rate-limit.middleware.js";

import {
  createMemberController,
  listMembersController,
  getMemberController,
  updateMemberController,
  deleteMemberController,
} from "../controllers/member.controller.js";

const router = Router();

router.get(
  "/",
  authenticate,
  authorizePermission(PERMISSIONS.MEMBER_READ),
  validateQuery(membersQuerySchema),
  listMembersController
);

router.get(
  "/:id",
  authenticate,
  authorizePermission(PERMISSIONS.MEMBER_READ),
  validateParams(memberIdParamsSchema),
  getMemberController
);

router.post(
  "/",
  authenticate,
  sensitiveMutationLimiter,
  authorizePermission(PERMISSIONS.MEMBER_CREATE),
  validateBody(createMemberBodySchema),
  createMemberController
);

router.patch(
  "/:id",
  authenticate,
  sensitiveMutationLimiter,
  authorizePermission(PERMISSIONS.MEMBER_UPDATE),
  validateParams(memberIdParamsSchema),
  validateBody(updateMemberBodySchema),
  updateMemberController
);

router.delete(
  "/:id",
  authenticate,
  sensitiveMutationLimiter,
  authorizePermission(PERMISSIONS.MEMBER_DELETE),
  validateParams(memberIdParamsSchema),
  deleteMemberController
);

export default router;
