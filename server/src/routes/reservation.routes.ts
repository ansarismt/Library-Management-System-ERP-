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
  createReservationBodySchema,
  fulfillReservationBodySchema,
  reservationBookParamsSchema,
  reservationIdParamsSchema,
  reservationMemberParamsSchema,
  updateReservationBodySchema,
} from "../validators/reservation.validator.js";
import { reservationsQuerySchema } from "../validators/list.validator.js";
import { sensitiveMutationLimiter } from "../middleware/rate-limit.middleware.js";

import {
  createReservationController,
  listReservationsController,
  getReservationController,
  getBookReservationsController,
  getMemberReservationsController,
  cancelReservationController,
  markReservationReadyController,
  fulfillReservationController,
  expireReservationController,
  updateReservationController,
  deleteReservationController,
} from "../controllers/reservation.controller.js";

const router = Router();

/* =========================================================
   RESERVATIONS
========================================================= */

// Create reservation
router.post(
  "/",
  authenticate,
  sensitiveMutationLimiter,
  authorizePermission(PERMISSIONS.RESERVATION_CREATE),
  validateBody(createReservationBodySchema),
  createReservationController
);

// List all reservations
router.get(
  "/",
  authenticate,
  authorizePermission(PERMISSIONS.RESERVATION_READ),
  validateQuery(reservationsQuerySchema),
  listReservationsController
);

// List reservations for a book
router.get(
  "/book/:bookId",
  authenticate,
  authorizePermission(PERMISSIONS.RESERVATION_READ),
  validateParams(reservationBookParamsSchema),
  getBookReservationsController
);

// List reservations for a member
router.get(
  "/member/:memberId",
  authenticate,
  authorizePermission(PERMISSIONS.RESERVATION_READ),
  validateParams(reservationMemberParamsSchema),
  getMemberReservationsController
);

// Get single reservation
router.get(
  "/:id",
  authenticate,
  sensitiveMutationLimiter,
  authorizePermission(PERMISSIONS.RESERVATION_READ),
  validateParams(reservationIdParamsSchema),
  getReservationController
);

// Update reservation
router.patch(
  "/:id",
  authenticate,
  sensitiveMutationLimiter,
  authorizePermission(PERMISSIONS.RESERVATION_UPDATE),
  validateParams(reservationIdParamsSchema),
  validateBody(updateReservationBodySchema),
  updateReservationController
);

// Cancel reservation
router.patch(
  "/:id/cancel",
  authenticate,
  sensitiveMutationLimiter,
  authorizePermission(PERMISSIONS.RESERVATION_CANCEL),
  validateParams(reservationIdParamsSchema),
  cancelReservationController
);

// Mark reservation ready
router.patch(
  "/:id/ready",
  authenticate,
  sensitiveMutationLimiter,
  authorizePermission(PERMISSIONS.RESERVATION_UPDATE),
  validateParams(reservationIdParamsSchema),
  markReservationReadyController
);

// Fulfill reservation
router.patch(
  "/:id/fulfill",
  authenticate,
  sensitiveMutationLimiter,
  authorizePermission(PERMISSIONS.RESERVATION_UPDATE),
  validateParams(reservationIdParamsSchema),
  validateBody(fulfillReservationBodySchema),
  fulfillReservationController
);

// Expire reservation
router.patch(
  "/:id/expire",
  authenticate,
  sensitiveMutationLimiter,
  authorizePermission(PERMISSIONS.RESERVATION_UPDATE),
  validateParams(reservationIdParamsSchema),
  expireReservationController
);

// Delete reservation
router.delete(
  "/:id",
  authenticate,
  sensitiveMutationLimiter,
  authorizePermission(PERMISSIONS.RESERVATION_UPDATE),
  validateParams(reservationIdParamsSchema),
  deleteReservationController
);

export default router;
