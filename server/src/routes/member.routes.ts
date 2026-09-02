import { Router } from "express";

import { authenticate } from "../middleware/auth.middleware.js";
import { authorizePermission } from "../middleware/authorization.middleware.js";
import { PERMISSIONS } from "../constants/permissions.js";

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
  listMembersController
);

router.get(
  "/:id",
  authenticate,
  authorizePermission(PERMISSIONS.MEMBER_READ),
  getMemberController
);

router.post(
  "/",
  authenticate,
  authorizePermission(PERMISSIONS.MEMBER_CREATE),
  createMemberController
);

router.patch(
  "/:id",
  authenticate,
  authorizePermission(PERMISSIONS.MEMBER_UPDATE),
  updateMemberController
);

router.delete(
  "/:id",
  authenticate,
  authorizePermission(PERMISSIONS.MEMBER_DELETE),
  deleteMemberController
);

export default router;