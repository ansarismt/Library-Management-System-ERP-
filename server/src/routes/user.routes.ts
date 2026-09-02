import { Router } from "express";

import { authenticate } from "../middleware/auth.middleware.js";
import {
  authorizePermission,
} from "../middleware/authorization.middleware.js";

import { PERMISSIONS } from "../constants/permissions.js";

import {
  getUsersController,
  getUserController,
  createUserController,
  updateUserController,
  deleteUserController,
  changeUserRoleController,
} from "../controllers/user.controller.js";

const router = Router();

router.use(authenticate);

router.get(
  "/",
  authorizePermission(PERMISSIONS.USER_READ),
  getUsersController
);

router.get(
  "/:id",
  authorizePermission(PERMISSIONS.USER_READ),
  getUserController
);

router.post(
  "/",
  authorizePermission(PERMISSIONS.USER_CREATE),
  createUserController
);

router.patch(
  "/:id",
  authorizePermission(PERMISSIONS.USER_UPDATE),
  updateUserController
);

router.delete(
  "/:id",
  authorizePermission(PERMISSIONS.USER_DELETE),
  deleteUserController
);

router.patch(
  "/:id/role",
  authorizePermission(PERMISSIONS.USER_MANAGE_ROLES),
  changeUserRoleController
);

export default router;