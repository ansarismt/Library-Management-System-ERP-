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
  bookIdParamsSchema,
  bookIsbnParamsSchema,
  createBookBodySchema,
  updateBookBodySchema,
} from "../validators/book.validator.js";
import { booksQuerySchema } from "../validators/list.validator.js";
import { sensitiveMutationLimiter } from "../middleware/rate-limit.middleware.js";

import {
  createBookController,
  getBooksController,
  getBookController,
  getBookByIsbnController,
  updateBookController,
  deleteBookController,
} from "../controllers/book.controller.js";

const router = Router();

// All book routes require authentication
router.use(authenticate);

// GET /api/v1/books
router.get(
  "/",
  authorizePermission(PERMISSIONS.BOOK_READ),
  validateQuery(booksQuerySchema),
  getBooksController
);

// GET /api/v1/books/isbn/:isbn
router.get(
  "/isbn/:isbn",
  authorizePermission(PERMISSIONS.BOOK_READ),
  validateParams(bookIsbnParamsSchema),
  getBookByIsbnController
);

// GET /api/v1/books/:id
router.get(
  "/:id",
  authorizePermission(PERMISSIONS.BOOK_READ),
  validateParams(bookIdParamsSchema),
  getBookController
);

// POST /api/v1/books
router.post(
  "/",
  sensitiveMutationLimiter,
  authorizePermission(PERMISSIONS.BOOK_CREATE),
  validateBody(createBookBodySchema),
  createBookController
);

// PATCH /api/v1/books/:id
router.patch(
  "/:id",
  sensitiveMutationLimiter,
  authorizePermission(PERMISSIONS.BOOK_UPDATE),
  validateParams(bookIdParamsSchema),
  validateBody(updateBookBodySchema),
  updateBookController
);

// DELETE /api/v1/books/:id
router.delete(
  "/:id",
  sensitiveMutationLimiter,
  authorizePermission(PERMISSIONS.BOOK_DELETE),
  validateParams(bookIdParamsSchema),
  deleteBookController
);

export default router;
