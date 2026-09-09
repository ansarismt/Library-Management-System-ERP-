import { Router } from "express";

import { authenticate } from "../middleware/auth.middleware.js";
import {
  authorizePermission,
} from "../middleware/authorization.middleware.js";

import { PERMISSIONS } from "../constants/permissions.js";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../middleware/validation.middleware.js";
import {
  changeUserRoleBodySchema,
  createUserBodySchema,
  updateUserBodySchema,
  userIdParamsSchema,
} from "../validators/user.validator.js";
import { usersQuerySchema } from "../validators/list.validator.js";
import { sensitiveMutationLimiter } from "../middleware/rate-limit.middleware.js";

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
  validateQuery(usersQuerySchema),
  getUsersController
);

router.get(
  "/:id",
  authorizePermission(PERMISSIONS.USER_READ),
  validateParams(userIdParamsSchema),
  getUserController
);

router.post(
  "/",
  sensitiveMutationLimiter,
  authorizePermission(PERMISSIONS.USER_CREATE),
  validateBody(createUserBodySchema),
  createUserController
);

router.patch(
  "/:id",
  sensitiveMutationLimiter,
  authorizePermission(PERMISSIONS.USER_UPDATE),
  validateParams(userIdParamsSchema),
  validateBody(updateUserBodySchema),
  updateUserController
);

router.delete(
  "/:id",
  sensitiveMutationLimiter,
  authorizePermission(PERMISSIONS.USER_DELETE),
  validateParams(userIdParamsSchema),
  deleteUserController
);

router.patch(
  "/:id/role",
  sensitiveMutationLimiter,
  authorizePermission(PERMISSIONS.USER_MANAGE_ROLES),
  validateParams(userIdParamsSchema),
  validateBody(changeUserRoleBodySchema),
  changeUserRoleController
);

export default router;