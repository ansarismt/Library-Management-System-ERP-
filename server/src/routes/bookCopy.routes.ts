import { Router } from "express";

import { authenticate } from "../middleware/auth.middleware.js";
import { authorizePermission } from "../middleware/authorization.middleware.js";
import { PERMISSIONS } from "../constants/permissions.js";

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
  listBookCopiesController
);

/**
 * Get all copies belonging to a specific book
 */
router.get(
  "/book/:bookId",
  authenticate,
  authorizePermission(PERMISSIONS.BOOK_COPY_READ),
  listBookCopiesByBookController
);

/**
 * Get a single book copy
 */
router.get(
  "/:id",
  authenticate,
  authorizePermission(PERMISSIONS.BOOK_COPY_READ),
  getBookCopyController
);

/**
 * Create a book copy
 */
router.post(
  "/",
  authenticate,
  authorizePermission(PERMISSIONS.BOOK_COPY_CREATE),
  createBookCopyController
);

/**
 * Update a book copy
 */
router.patch(
  "/:id",
  authenticate,
  authorizePermission(PERMISSIONS.BOOK_COPY_UPDATE),
  updateBookCopyController
);

/**
 * Delete a book copy
 */
router.delete(
  "/:id",
  authenticate,
  authorizePermission(PERMISSIONS.BOOK_COPY_DELETE),
  deleteBookCopyController
);

export default router;