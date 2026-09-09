import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorizePermission } from "../middleware/authorization.middleware.js";
import { PERMISSIONS } from "../constants/permissions.js";
import { validateQuery } from "../middleware/validation.middleware.js";
import { reportQuerySchema } from "../validators/report.validator.js";
import {
  booksReportController,
  circulationReportController,
  finesReportController,
  membersReportController,
  reportSummaryController,
  reservationsReportController,
} from "../controllers/report.controller.js";

const router = Router();

router.use(authenticate);
router.use(authorizePermission(PERMISSIONS.REPORT_VIEW));
router.use(validateQuery(reportQuerySchema));

router.get("/circulation", circulationReportController);
router.get("/books", booksReportController);
router.get("/members", membersReportController);
router.get("/fines", finesReportController);
router.get("/reservations", reservationsReportController);
router.get("/summary", reportSummaryController);

export default router;
