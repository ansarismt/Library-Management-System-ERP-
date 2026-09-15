import { Router } from "express";

import { authenticate } from "../middleware/auth.middleware.js";
import { authorizePermission } from "../middleware/authorization.middleware.js";
import { PERMISSIONS } from "../constants/permissions.js";
import { validateBody } from "../middleware/validation.middleware.js";
import { updateSettingsBodySchema } from "../validators/settings.validator.js";
import {
  getSettingsController,
  updateSettingsController,
} from "../controllers/settings.controller.js";

const router = Router();

router.get(
  "/",
  authenticate,
  authorizePermission(PERMISSIONS.LIBRARY_SETTINGS),
  getSettingsController,
);

router.patch(
  "/",
  authenticate,
  authorizePermission(PERMISSIONS.LIBRARY_SETTINGS),
  validateBody(updateSettingsBodySchema),
  updateSettingsController,
);

export default router;