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
  fineIdParamsSchema,
  fineIssueParamsSchema,
  fineMemberParamsSchema,
  payFineBodySchema,
  waiveFineBodySchema,
} from "../validators/fine.validator.js";
import { finesQuerySchema } from "../validators/list.validator.js";
import { sensitiveMutationLimiter } from "../middleware/rate-limit.middleware.js";

import {
  listFinesController,
  getFineController,
  getMemberFinesController,
  calculateFineController,
  payFineController,
  waiveFineController,
  deleteFineController,
} from "../controllers/fine.controller.js";

const router = Router();


/**
 * Get all fines
 */
router.get(
  "/",
  authenticate,
  authorizePermission(
    PERMISSIONS.FINE_READ
  ),
  validateQuery(finesQuerySchema),
  listFinesController
);


/**
 * Get member fines
 *
 * Must come before /:id
 */
router.get(
  "/member/:memberId",
  authenticate,
  authorizePermission(
    PERMISSIONS.FINE_READ
  ),
  validateParams(fineMemberParamsSchema),
  getMemberFinesController
);


/**
 * Calculate fine for issue
 */
router.post(
  "/calculate/:issueId",
  authenticate,
  sensitiveMutationLimiter,
  authorizePermission(
    PERMISSIONS.FINE_CREATE
  ),
  validateParams(fineIssueParamsSchema),
  calculateFineController
);


/**
 * Pay fine
 */
router.post(
  "/:id/pay",
  authenticate,
  sensitiveMutationLimiter,
  authorizePermission(
    PERMISSIONS.FINE_UPDATE
  ),
  validateParams(fineIdParamsSchema),
  validateBody(payFineBodySchema),
  payFineController
);


/**
 * Waive fine
 */
router.post(
  "/:id/waive",
  authenticate,
  sensitiveMutationLimiter,
  authorizePermission(
    PERMISSIONS.FINE_WAIVE
  ),
  validateParams(fineIdParamsSchema),
  validateBody(waiveFineBodySchema),
  waiveFineController
);


/**
 * Get single fine
 */
router.get(
  "/:id",
  authenticate,
  authorizePermission(
    PERMISSIONS.FINE_READ
  ),
  validateParams(fineIdParamsSchema),
  getFineController
);


/**
 * Delete fine
 */
router.delete(
  "/:id",
  authenticate,
  sensitiveMutationLimiter,
  authorizePermission(
    PERMISSIONS.FINE_UPDATE
  ),
  validateParams(fineIdParamsSchema),
  deleteFineController
);

export default router;
