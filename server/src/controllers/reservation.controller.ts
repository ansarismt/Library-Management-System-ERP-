import {
  Response,
} from "express";

import {
  AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

import {
  createReservationService,
  listReservationsService,
  getReservationService,
  listBookReservationsService,
  listMemberReservationsService,
  cancelReservationService,
  markReservationReadyService,
  fulfillReservationService,
  expireReservationService,
  updateReservationService,
  deleteReservationService,
  ReservationActor,
  ReservationAuthorizationError,
} from "../services/reservation.service.js";
import { AUDIT_ACTIONS } from "../constants/auditActions.js";
import { auditRequest } from "../services/audit.service.js";

const getReservationActor = (
  req: AuthenticatedRequest
): ReservationActor => {
  if (!req.user) {
    throw new Error("Authentication required");
  }

  return req.user;
};

const getReservationErrorStatus = (
  error: unknown,
  fallbackStatus: number
): number =>
  error instanceof ReservationAuthorizationError
    ? 403
    : fallbackStatus;

/* =========================================================
   CREATE RESERVATION
========================================================= */

export const createReservationController =
  async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const {
        bookId,
        memberId,
        expiresAt,
        notes,
      } = req.body;

      if (!bookId) {
        res.status(400).json({
          success: false,
          message: "bookId is required",
        });
        return;
      }

      if (!memberId) {
        res.status(400).json({
          success: false,
          message: "memberId is required",
        });
        return;
      }

      let parsedExpiresAt:
        Date | undefined;

      if (expiresAt !== undefined) {
        parsedExpiresAt =
          new Date(expiresAt);

        if (
          Number.isNaN(
            parsedExpiresAt.getTime()
          )
        ) {
          res.status(400).json({
            success: false,
            message:
              "Invalid expiresAt date",
          });
          return;
        }
      }

      const reservation =
        await createReservationService({
          bookId,
          memberId,
          expiresAt:
            parsedExpiresAt,
          notes,
        }, getReservationActor(req));

      await auditRequest(req, {
        action: AUDIT_ACTIONS.RESERVATION_CREATED,
        resourceType: "RESERVATION",
        resourceId: reservation?._id?.toString(),
        description: "Reservation created",
        after: reservation ? {
          bookId: reservation.bookId,
          memberId: reservation.memberId,
          status: reservation.status,
          queuePosition: reservation.queuePosition,
        } : undefined,
        success: true,
        statusCode: 201,
      });

      res.status(201).json({
        success: true,
        message:
          "Reservation created successfully",
        data: reservation,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to create reservation";

      res.status(getReservationErrorStatus(error, 400)).json({
        success: false,
        message,
      });
    }
  };

/* =========================================================
   LIST RESERVATIONS
========================================================= */

export const listReservationsController =
  async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const reservations =
        await listReservationsService(
          getReservationActor(req),
          req.query as never
        );

      res.status(200).json({
        success: true,
        data: reservations.items,
        pagination: reservations.pagination,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to fetch reservations";

      res.status(getReservationErrorStatus(error, 500)).json({
        success: false,
        message,
      });
    }
  };

/* =========================================================
   GET RESERVATION
========================================================= */

export const getReservationController =
  async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { id } =
        req.params;

      if (
        typeof id !== "string"
      ) {
        res.status(400).json({
          success: false,
          message:
            "Invalid reservation ID",
        });
        return;
      }

      const reservation =
        await getReservationService(
          id,
          getReservationActor(req)
        );

      res.status(200).json({
        success: true,
        data: reservation,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Reservation not found";

      res.status(getReservationErrorStatus(error, 404)).json({
        success: false,
        message,
      });
    }
  };

/* =========================================================
   BOOK RESERVATIONS
========================================================= */

export const getBookReservationsController =
  async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { bookId } =
        req.params;

      if (
        typeof bookId !== "string"
      ) {
        res.status(400).json({
          success: false,
          message:
            "Invalid book ID",
        });
        return;
      }

      const reservations =
        await listBookReservationsService(
          bookId,
          getReservationActor(req)
        );

      res.status(200).json({
        success: true,
        data: reservations,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to fetch book reservations";

      res.status(getReservationErrorStatus(error, 400)).json({
        success: false,
        message,
      });
    }
  };

/* =========================================================
   MEMBER RESERVATIONS
========================================================= */

export const getMemberReservationsController =
  async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { memberId } =
        req.params;

      if (
        typeof memberId !== "string"
      ) {
        res.status(400).json({
          success: false,
          message:
            "Invalid member ID",
        });
        return;
      }

      const reservations =
        await listMemberReservationsService(
          memberId,
          getReservationActor(req)
        );

      res.status(200).json({
        success: true,
        data: reservations,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to fetch member reservations";

      res.status(getReservationErrorStatus(error, 400)).json({
        success: false,
        message,
      });
    }
  };

/* =========================================================
   CANCEL RESERVATION
========================================================= */

export const cancelReservationController =
  async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { id } =
        req.params;

      if (
        typeof id !== "string"
      ) {
        res.status(400).json({
          success: false,
          message:
            "Invalid reservation ID",
        });
        return;
      }

      const reservation =
        await cancelReservationService(
          id,
          getReservationActor(req)
        );

      await auditRequest(req, {
        action: AUDIT_ACTIONS.RESERVATION_CANCELLED,
        resourceType: "RESERVATION",
        resourceId: id,
        description: "Reservation cancelled",
        after: { status: reservation?.status, cancelledAt: reservation?.cancelledAt },
        success: true,
        statusCode: 200,
      });

      res.status(200).json({
        success: true,
        message:
          "Reservation cancelled successfully",
        data: reservation,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to cancel reservation";

      res.status(getReservationErrorStatus(error, 400)).json({
        success: false,
        message,
      });
    }
  };

/* =========================================================
   MARK READY
========================================================= */

export const markReservationReadyController =
  async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { id } =
        req.params;

      if (
        typeof id !== "string"
      ) {
        res.status(400).json({
          success: false,
          message:
            "Invalid reservation ID",
        });
        return;
      }

      const reservation =
        await markReservationReadyService(
          id,
          getReservationActor(req)
        );

      await auditRequest(req, {
        action: AUDIT_ACTIONS.RESERVATION_READY,
        resourceType: "RESERVATION",
        resourceId: id,
        description: "Reservation marked ready",
        after: { status: reservation?.status, queuePosition: reservation?.queuePosition },
        success: true,
        statusCode: 200,
      });

      res.status(200).json({
        success: true,
        message:
          "Reservation marked as ready",
        data: reservation,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to mark reservation ready";

      res.status(getReservationErrorStatus(error, 400)).json({
        success: false,
        message,
      });
    }
  };

/* =========================================================
   FULFILL RESERVATION
========================================================= */

export const fulfillReservationController =
  async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { id } = req.params;

      if (typeof id !== "string") {
        res.status(400).json({
          success: false,
          message: "Invalid reservation ID",
        });
        return;
      }

      if (!req.user?.userId) {
        res.status(401).json({
          success: false,
          message: "Authenticated user is required",
        });
        return;
      }

      const {
        dueAt,
        notes,
      } = req.body;

      if (!dueAt) {
        res.status(400).json({
          success: false,
          message: "dueAt is required",
        });
        return;
      }

      const parsedDueAt = new Date(dueAt);

      if (
        Number.isNaN(
          parsedDueAt.getTime()
        )
      ) {
        res.status(400).json({
          success: false,
          message: "Invalid dueAt date",
        });
        return;
      }

      if (parsedDueAt <= new Date()) {
        res.status(400).json({
          success: false,
          message: "dueAt must be in the future",
        });
        return;
      }

      const result =
        await fulfillReservationService(
          id,
          {
            issuedBy: req.user.userId,
            dueAt: parsedDueAt,
            notes,
          },
          getReservationActor(req)
        );

      await auditRequest(req, {
        action: AUDIT_ACTIONS.RESERVATION_FULFILLED,
        resourceType: "RESERVATION",
        resourceId: id,
        description: "Reservation fulfilled and book issued",
        after: {
          status: result.reservation?.status,
          issueId: result.issue?._id,
          bookCopyId: result.issue?.bookCopyId,
        },
        success: true,
        statusCode: 200,
      });

      res.status(200).json({
        success: true,
        message:
          "Reservation fulfilled and book issued successfully",
        data: result,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to fulfill reservation";

      res.status(getReservationErrorStatus(error, 400)).json({
        success: false,
        message,
      });
    }
  };

/* =========================================================
   EXPIRE RESERVATION
========================================================= */

export const expireReservationController =
  async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { id } =
        req.params;

      if (
        typeof id !== "string"
      ) {
        res.status(400).json({
          success: false,
          message:
            "Invalid reservation ID",
        });
        return;
      }

      const reservation =
        await expireReservationService(
          id,
          getReservationActor(req)
        );

      await auditRequest(req, {
        action: AUDIT_ACTIONS.RESERVATION_EXPIRED,
        resourceType: "RESERVATION",
        resourceId: id,
        description: "Reservation expired",
        after: { status: reservation?.status },
        success: true,
        statusCode: 200,
      });

      res.status(200).json({
        success: true,
        message:
          "Reservation expired successfully",
        data: reservation,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to expire reservation";

      res.status(getReservationErrorStatus(error, 400)).json({
        success: false,
        message,
      });
    }
  };

/* =========================================================
   UPDATE RESERVATION
========================================================= */

export const updateReservationController =
  async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { id } =
        req.params;

      if (
        typeof id !== "string"
      ) {
        res.status(400).json({
          success: false,
          message:
            "Invalid reservation ID",
        });
        return;
      }

      const {
        expiresAt,
        notes,
      } = req.body;

      let parsedExpiresAt:
        Date | undefined;

      if (expiresAt !== undefined) {
        parsedExpiresAt =
          new Date(expiresAt);

        if (
          Number.isNaN(
            parsedExpiresAt.getTime()
          )
        ) {
          res.status(400).json({
            success: false,
            message:
              "Invalid expiresAt date",
          });
          return;
        }
      }

      const reservation =
        await updateReservationService(
          id,
          {
            expiresAt:
              parsedExpiresAt,
            notes,
          },
          getReservationActor(req)
        );

      await auditRequest(req, {
        action: AUDIT_ACTIONS.RESERVATION_UPDATED,
        resourceType: "RESERVATION",
        resourceId: id,
        description: "Reservation updated",
        after: {
          status: reservation?.status,
          expiresAt: reservation?.expiresAt,
          notes: reservation?.notes,
        },
        success: true,
        statusCode: 200,
      });

      res.status(200).json({
        success: true,
        message:
          "Reservation updated successfully",
        data: reservation,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to update reservation";

      res.status(getReservationErrorStatus(error, 400)).json({
        success: false,
        message,
      });
    }
  };

/* =========================================================
   DELETE RESERVATION
========================================================= */

export const deleteReservationController =
  async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { id } =
        req.params;

      if (
        typeof id !== "string"
      ) {
        res.status(400).json({
          success: false,
          message:
            "Invalid reservation ID",
        });
        return;
      }

      const reservation =
        await deleteReservationService(
          id,
          getReservationActor(req)
        );

      await auditRequest(req, {
        action: AUDIT_ACTIONS.RESERVATION_DELETED,
        resourceType: "RESERVATION",
        resourceId: id,
        description: "Reservation deleted",
        before: reservation ? {
          status: reservation.status,
          bookId: reservation.bookId,
          memberId: reservation.memberId,
        } : undefined,
        success: true,
        statusCode: 200,
      });

      res.status(200).json({
        success: true,
        message:
          "Reservation deleted successfully",
        data: reservation,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to delete reservation";

      res.status(getReservationErrorStatus(error, 400)).json({
        success: false,
        message,
      });
    }
  };