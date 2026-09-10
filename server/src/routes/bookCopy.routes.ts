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
  bookCopyBookParamsSchema,
  bookCopyIdParamsSchema,
  createBookCopyBodySchema,
  updateBookCopyBodySchema,
} from "../validators/bookCopy.validator.js";
import { bookCopiesQuerySchema } from "../validators/list.validator.js";
import { sensitiveMutationLimiter } from "../middleware/rate-limit.middleware.js";

import {
  createBookCopyController,
  listBookCopiesController,
  listBookCopiesByBookController,
  getBookCopyController,
  updateBookCopyController,
  deleteBookCopyController,
} from "../controllers/bookCopy.controller.js";

const router = Router();

/**
 * Get all book copies
 */
router.get(
  "/",
  authenticate,
  authorizePermission(PERMISSIONS.BOOK_COPY_READ),
  validateQuery(bookCopiesQuerySchema),
  listBookCopiesController
);

/**
 * Get all copies belonging to a specific book
 */
router.get(
  "/book/:bookId",
  authenticate,
  authorizePermission(PERMISSIONS.BOOK_COPY_READ),
  validateParams(bookCopyBookParamsSchema),
  validateQuery(bookCopiesQuerySchema),
  listBookCopiesByBookController
);

/**
 * Get a single book copy
 */
router.get(
  "/:id",
  authenticate,
  authorizePermission(PERMISSIONS.BOOK_COPY_READ),
  validateParams(bookCopyIdParamsSchema),
  getBookCopyController
);

/**
 * Create a book copy
 */
router.post(
  "/",
  authenticate,
  sensitiveMutationLimiter,
  authorizePermission(PERMISSIONS.BOOK_COPY_CREATE),
  validateBody(createBookCopyBodySchema),
  createBookCopyController
);

/**
 * Update a book copy
 */
router.patch(
  "/:id",
  authenticate,
  sensitiveMutationLimiter,
  authorizePermission(PERMISSIONS.BOOK_COPY_UPDATE),
  validateParams(bookCopyIdParamsSchema),
  validateBody(updateBookCopyBodySchema),
  updateBookCopyController
);

/**
 * Delete a book copy
 */
router.delete(
  "/:id",
  authenticate,
  sensitiveMutationLimiter,
  authorizePermission(PERMISSIONS.BOOK_COPY_DELETE),
  validateParams(bookCopyIdParamsSchema),
  deleteBookCopyController
);

export default router;
