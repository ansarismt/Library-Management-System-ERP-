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
  createIssueBodySchema,
  issueIdParamsSchema,
  issueMemberParamsSchema,
  renewIssueBodySchema,
  returnIssueBodySchema,
  updateIssueBodySchema,
} from "../validators/issue.validator.js";
import { issuesQuerySchema } from "../validators/list.validator.js";
import { sensitiveMutationLimiter } from "../middleware/rate-limit.middleware.js";

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
  validateQuery(issuesQuerySchema),
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
  validateParams(issueMemberParamsSchema),
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
  validateParams(issueIdParamsSchema),
  getIssueController
);


/**
 * Issue book
 */
router.post(
  "/",
  authenticate,
  sensitiveMutationLimiter,
  authorizePermission(
    PERMISSIONS.BOOK_ISSUE
  ),
  validateBody(createIssueBodySchema),
  issueBookController
);


/**
 * Return book
 */
router.post(
  "/:id/return",
  authenticate,
  sensitiveMutationLimiter,
  authorizePermission(
    PERMISSIONS.BOOK_RETURN
  ),
  validateParams(issueIdParamsSchema),
  validateBody(returnIssueBodySchema),
  returnBookController
);


/**
 * Renew book
 */
router.post(
  "/:id/renew",
  authenticate,
  sensitiveMutationLimiter,
  authorizePermission(
    PERMISSIONS.BOOK_RENEW
  ),
  validateParams(issueIdParamsSchema),
  validateBody(renewIssueBodySchema),
  renewBookController
);


/**
 * Update issue
 */
router.patch(
  "/:id",
  authenticate,
  sensitiveMutationLimiter,
  authorizePermission(
    PERMISSIONS.BOOK_ISSUE
  ),
  validateParams(issueIdParamsSchema),
  validateBody(updateIssueBodySchema),
  updateIssueController
);


/**
 * Delete issue
 */
router.delete(
  "/:id",
  authenticate,
  sensitiveMutationLimiter,
  authorizePermission(
    PERMISSIONS.BOOK_ISSUE
  ),
  validateParams(issueIdParamsSchema),
  deleteIssueController
);

export default router;
