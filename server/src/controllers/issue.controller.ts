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


/* =========================================================
   ISSUE BOOK
========================================================= */

export const issueBookController =
  async (
    req: Request,
    res: Response
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
          message:
            "bookId is required",
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

      if (!dueAt) {
        res.status(400).json({
          success: false,
          message:
            "dueAt is required",
        });
        return;
      }

      const parsedDueAt =
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

      const issue =
        await issueBookService({
          bookId,
          bookCopyId,
          memberId,
          issuedBy,
          dueAt:
            parsedDueAt,
          notes,
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
    _req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const issues =
        await listIssuesService();

      res.status(200).json({
        success: true,
        data: issues,
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
        returnedAt,
        returnedBy,
        status,
        renewalCount,
        notes,
      } = req.body;


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


      let parsedReturnedAt:
        Date | undefined;


      if (
        returnedAt !==
        undefined
      ) {
        parsedReturnedAt =
          new Date(
            returnedAt
          );

        if (
          Number.isNaN(
            parsedReturnedAt.getTime()
          )
        ) {
          res.status(400).json({
            success: false,
            message:
              "Invalid returnedAt date",
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

            returnedAt:
              parsedReturnedAt,

            returnedBy,

            status,

            renewalCount,

            notes,
          }
        );


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