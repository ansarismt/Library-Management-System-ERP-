import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorizePermission } from "../middleware/authorization.middleware.js";
import { validateQuery } from "../middleware/validation.middleware.js";
import { PERMISSIONS } from "../constants/permissions.js";
import { reportQuerySchema } from "../validators/report.validator.js";
import { dashboardSummaryController } from "../controllers/dashboard.controller.js";

const router = Router();

router.get(
  "/summary",
  authenticate,
  authorizePermission(PERMISSIONS.REPORT_VIEW),
  validateQuery(reportQuerySchema),
  dashboardSummaryController
);

export default router;