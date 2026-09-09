import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorizePermission } from "../middleware/authorization.middleware.js";
import { PERMISSIONS } from "../constants/permissions.js";
import { validateQuery } from "../middleware/validation.middleware.js";
import { auditQuerySchema } from "../validators/audit.validator.js";
import { listAuditLogsController } from "../controllers/audit.controller.js";

const router = Router();

router.get(
  "/",
  authenticate,
  authorizePermission(PERMISSIONS.AUDIT_LOG_VIEW),
  validateQuery(auditQuerySchema),
  listAuditLogsController
);

export default router;
