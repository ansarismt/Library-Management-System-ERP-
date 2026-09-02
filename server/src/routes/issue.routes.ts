import { Router } from "express";

import { authenticate } from "../middleware/auth.middleware.js";
import { authorizePermission } from "../middleware/authorization.middleware.js";
import { PERMISSIONS } from "../constants/permissions.js";

import {
  issueBookController,
  listIssuesController,
  getIssueController,
  getMemberIssuesController,
  returnBookController,
  renewBookController,
  updateIssueController,
  deleteIssueController,
} from "../controllers/issue.controller.js";

const router = Router();


/**
 * Get all issues
 */
router.get(
  "/",
  authenticate,
  authorizePermission(
    PERMISSIONS.BOOK_ISSUE
  ),
  listIssuesController
);


/**
 * Get issues for member
 *
 * IMPORTANT:
 * This must come before /:id
 */
router.get(
  "/member/:memberId",
  authenticate,
  authorizePermission(
    PERMISSIONS.BOOK_ISSUE
  ),
  getMemberIssuesController
);


/**
 * Get single issue
 */
router.get(
  "/:id",
  authenticate,
  authorizePermission(
    PERMISSIONS.BOOK_ISSUE
  ),
  getIssueController
);


/**
 * Issue book
 */
router.post(
  "/",
  authenticate,
  authorizePermission(
    PERMISSIONS.BOOK_ISSUE
  ),
  issueBookController
);


/**
 * Return book
 */
router.post(
  "/:id/return",
  authenticate,
  authorizePermission(
    PERMISSIONS.BOOK_RETURN
  ),
  returnBookController
);


/**
 * Renew book
 */
router.post(
  "/:id/renew",
  authenticate,
  authorizePermission(
    PERMISSIONS.BOOK_RENEW
  ),
  renewBookController
);


/**
 * Update issue
 */
router.patch(
  "/:id",
  authenticate,
  authorizePermission(
    PERMISSIONS.BOOK_ISSUE
  ),
  updateIssueController
);


/**
 * Delete issue
 */
router.delete(
  "/:id",
  authenticate,
  authorizePermission(
    PERMISSIONS.BOOK_ISSUE
  ),
  deleteIssueController
);

export default router;