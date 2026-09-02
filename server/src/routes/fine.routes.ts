import { Router } from "express";

import { authenticate } from "../middleware/auth.middleware.js";
import { authorizePermission } from "../middleware/authorization.middleware.js";
import { PERMISSIONS } from "../constants/permissions.js";

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
  getMemberFinesController
);


/**
 * Calculate fine for issue
 */
router.post(
  "/calculate/:issueId",
  authenticate,
  authorizePermission(
    PERMISSIONS.FINE_CREATE
  ),
  calculateFineController
);


/**
 * Pay fine
 */
router.post(
  "/:id/pay",
  authenticate,
  authorizePermission(
    PERMISSIONS.FINE_UPDATE
  ),
  payFineController
);


/**
 * Waive fine
 */
router.post(
  "/:id/waive",
  authenticate,
  authorizePermission(
    PERMISSIONS.FINE_WAIVE
  ),
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
  getFineController
);


/**
 * Delete fine
 */
router.delete(
  "/:id",
  authenticate,
  authorizePermission(
    PERMISSIONS.FINE_UPDATE
  ),
  deleteFineController
);

export default router;