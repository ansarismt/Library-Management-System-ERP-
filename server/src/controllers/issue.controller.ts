import {
  Request,
  Response,
} from "express";

import {
  issueBookService,
  listIssuesService,
  getIssueService,
  listMemberIssuesService,
  returnBookService,
  renewBookService,
  updateIssueService,
  deleteIssueService,
} from "../services/issue.service.js";
import { AUDIT_ACTIONS } from "../constants/auditActions.js";
import { auditRequest } from "../services/audit.service.js";


/* =========================================================
   ISSUE BOOK
========================================================= */

export const issueBookController =
  async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const {
        bookId,
        bookCopyId,
        memberId,
        issuedBy,
        dueAt,
        notes,
      } = req.body;

      if (!bookId) {
        res.status(400).json({
          success: false,
          message: "bookId is required",
        });
        return;
      }

      if (!bookCopyId) {
        res.status(400).json({
          success: false,
          message:
            "bookCopyId is required",
        });
        return;
      }

      if (!memberId) {
        res.status(400).json({
          success: false,
          message:
            "memberId is required",
        });
        return;
      }

      if (!issuedBy) {
        res.status(400).json({
          success: false,
          message:
            "issuedBy is required",
        });
        return;
      }

      let parsedDueAt:
        | Date
        | undefined;

      if (dueAt !== undefined) {
        parsedDueAt =
          new Date(dueAt);

        if (
          Number.isNaN(
            parsedDueAt.getTime(),
          )
        ) {
          res.status(400).json({
            success: false,
            message:
              "Invalid dueAt date",
          });
          return;
        }
      }

      const issue =
        await issueBookService({
          bookId,
          bookCopyId,
          memberId,
          issuedBy,
          dueAt: parsedDueAt,
          notes,
        });

      await auditRequest(req, {
        action:
          AUDIT_ACTIONS.ISSUE_CREATED,
        resourceType: "ISSUE",
        resourceId:
          issue?._id?.toString(),
        description:
          "Book issued",
        after: issue
          ? {
              bookId:
                issue.bookId,
              bookCopyId:
                issue.bookCopyId,
              memberId:
                issue.memberId,
              status:
                issue.status,
              dueAt:
                issue.dueAt,
            }
          : undefined,
        success: true,
        statusCode: 201,
      });

      res.status(201).json({
        success: true,
        message:
          "Book issued successfully",
        data: issue,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to issue book";

      res.status(400).json({
        success: false,
        message,
      });
    }
  };


/* =========================================================
   LIST ISSUES
========================================================= */

export const listIssuesController =
  async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const issues =
        await listIssuesService(req.query as never);

      res.status(200).json({
        success: true,
        data: issues.items,
        pagination: issues.pagination,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to fetch issues";

      res.status(500).json({
        success: false,
        message,
      });
    }
  };


/* =========================================================
   GET ISSUE
========================================================= */

export const getIssueController =
  async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { id } =
        req.params;

      if (
        typeof id !==
        "string"
      ) {
        res.status(400).json({
          success: false,
          message:
            "Invalid issue ID",
        });
        return;
      }

      const issue =
        await getIssueService(
          id
        );

      res.status(200).json({
        success: true,
        data: issue,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Issue not found";

      res.status(404).json({
        success: false,
        message,
      });
    }
  };


/* =========================================================
   MEMBER ISSUES
========================================================= */

export const getMemberIssuesController =
  async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { memberId } =
        req.params;

      if (
        typeof memberId !==
        "string"
      ) {
        res.status(400).json({
          success: false,
          message:
            "Invalid member ID",
        });
        return;
      }

      const issues =
        await listMemberIssuesService(
          memberId
        );

      res.status(200).json({
        success: true,
        data: issues,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to fetch member issues";

      res.status(400).json({
        success: false,
        message,
      });
    }
  };


/* =========================================================
   RETURN BOOK
========================================================= */

export const returnBookController =
  async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { id } =
        req.params;

      const {
        returnedBy,
        notes,
      } = req.body;

      if (
        typeof id !==
        "string"
      ) {
        res.status(400).json({
          success: false,
          message:
            "Invalid issue ID",
        });
        return;
      }

      if (!returnedBy) {
        res.status(400).json({
          success: false,
          message:
            "returnedBy is required",
        });
        return;
      }

      const issue =
        await returnBookService(
          id,
          {
            returnedBy,
            notes,
          }
        );

      await auditRequest(req, {
        action: AUDIT_ACTIONS.ISSUE_RETURNED,
        resourceType: "ISSUE",
        resourceId: id,
        description: "Book returned",
        after: {
          status: issue.issue?.status,
          dueAt: issue.issue?.dueAt,
          returnedAt: issue.issue?.returnedAt,
          fineId: issue.fine?._id,
        },
        success: true,
        statusCode: 200,
      });

      if (issue.fine) {
        await auditRequest(req, {
          action: AUDIT_ACTIONS.FINE_CREATED,
          resourceType: "FINE",
          resourceId: issue.fine._id.toString(),
          description: "Fine created during book return",
          after: {
            amount: issue.fine.amount,
            daysOverdue: issue.fine.daysOverdue,
            status: issue.fine.status,
          },
          success: true,
          statusCode: 200,
        });
      }

      res.status(200).json({
        success: true,
        message:
          "Book returned successfully",
        data: issue,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to return book";

      res.status(400).json({
        success: false,
        message,
      });
    }
  };


/* =========================================================
   RENEW BOOK
========================================================= */

export const renewBookController =
  async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { id } =
        req.params;

      const {
        additionalDays,
        dueAt,
      } = req.body;

      if (
        typeof id !==
        "string"
      ) {
        res.status(400).json({
          success: false,
          message:
            "Invalid issue ID",
        });
        return;
      }


      let parsedAdditionalDays:
        number | undefined;


      if (
        additionalDays !==
        undefined
      ) {
        parsedAdditionalDays =
          Number(
            additionalDays
          );

        if (
          !Number.isInteger(
            parsedAdditionalDays
          ) ||
          parsedAdditionalDays <= 0
        ) {
          res.status(400).json({
            success: false,
            message:
              "additionalDays must be a positive integer",
          });
          return;
        }
      }


      let parsedDueAt:
        Date | undefined;


      if (
        dueAt !== undefined
      ) {
        parsedDueAt =
          new Date(dueAt);

        if (
          Number.isNaN(
            parsedDueAt.getTime()
          )
        ) {
          res.status(400).json({
            success: false,
            message:
              "Invalid dueAt date",
          });
          return;
        }
      }


      if (
        parsedAdditionalDays ===
          undefined &&
        parsedDueAt ===
          undefined
      ) {
        res.status(400).json({
          success: false,
          message:
            "Provide additionalDays or dueAt",
        });
        return;
      }


      const issue =
        await renewBookService(
          id,
          {
            additionalDays:
              parsedAdditionalDays,

            dueAt:
              parsedDueAt,
          }
        );

      await auditRequest(req, {
        action: AUDIT_ACTIONS.ISSUE_RENEWED,
        resourceType: "ISSUE",
        resourceId: id,
        description: "Book issue renewed",
        after: {
          status: issue?.status,
          dueAt: issue?.dueAt,
          renewalCount: issue?.renewalCount,
        },
        success: true,
        statusCode: 200,
      });


      res.status(200).json({
        success: true,
        message:
          "Book renewed successfully",
        data: issue,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to renew book";

      res.status(400).json({
        success: false,
        message,
      });
    }
  };


/* =========================================================
   UPDATE ISSUE
========================================================= */

export const updateIssueController =
  async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { id } =
        req.params;

      if (
        typeof id !==
        "string"
      ) {
        res.status(400).json({
          success: false,
          message:
            "Invalid issue ID",
        });
        return;
      }


      const {
        dueAt,
        notes,
      } = req.body;

      const unsupportedFields = [
        "returnedAt",
        "returnedBy",
        "status",
        "renewalCount",
      ].filter((field) => req.body[field] !== undefined);

      if (unsupportedFields.length > 0) {
        res.status(400).json({
          success: false,
          message:
            "Issue status, return details, and renewal count must be changed through the circulation endpoints",
        });
        return;
      }


      let parsedDueAt:
        Date | undefined;


      if (
        dueAt !== undefined
      ) {
        parsedDueAt =
          new Date(dueAt);

        if (
          Number.isNaN(
            parsedDueAt.getTime()
          )
        ) {
          res.status(400).json({
            success: false,
            message:
              "Invalid dueAt date",
          });
          return;
        }
      }


      const issue =
        await updateIssueService(
          id,
          {
            dueAt:
              parsedDueAt,

            notes,
          }
        );

      await auditRequest(req, {
        action: AUDIT_ACTIONS.ISSUE_UPDATED,
        resourceType: "ISSUE",
        resourceId: id,
        description: "Issue metadata updated",
        after: {
          status: issue?.status,
          dueAt: issue?.dueAt,
          notes: issue?.notes,
        },
        success: true,
        statusCode: 200,
      });


      res.status(200).json({
        success: true,
        message:
          "Issue updated successfully",
        data: issue,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to update issue";

      res.status(400).json({
        success: false,
        message,
      });
    }
  };


/* =========================================================
   DELETE ISSUE
========================================================= */

export const deleteIssueController =
  async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { id } =
        req.params;

      if (
        typeof id !==
        "string"
      ) {
        res.status(400).json({
          success: false,
          message:
            "Invalid issue ID",
        });
        return;
      }


      const issue =
        await deleteIssueService(
          id
        );

      await auditRequest(req, {
        action: AUDIT_ACTIONS.ISSUE_DELETED,
        resourceType: "ISSUE",
        resourceId: id,
        description: "Issue deleted",
        before: issue ? {
          status: issue.status,
          dueAt: issue.dueAt,
          memberId: issue.memberId,
          bookId: issue.bookId,
        } : undefined,
        success: true,
        statusCode: 200,
      });


      res.status(200).json({
        success: true,
        message:
          "Issue deleted successfully",
        data: issue,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to delete issue";

      res.status(400).json({
        success: false,
        message,
      });
    }
  };