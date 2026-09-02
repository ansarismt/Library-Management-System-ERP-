import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorizePermission } from "../middleware/authorization.middleware.js";
import { PERMISSIONS } from "../constants/permissions.js";

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
  getBooksController
);

// GET /api/v1/books/isbn/:isbn
router.get(
  "/isbn/:isbn",
  authorizePermission(PERMISSIONS.BOOK_READ),
  getBookByIsbnController
);

// GET /api/v1/books/:id
router.get(
  "/:id",
  authorizePermission(PERMISSIONS.BOOK_READ),
  getBookController
);

// POST /api/v1/books
router.post(
  "/",
  authorizePermission(PERMISSIONS.BOOK_CREATE),
  createBookController
);

// PATCH /api/v1/books/:id
router.patch(
  "/:id",
  authorizePermission(PERMISSIONS.BOOK_UPDATE),
  updateBookController
);

// DELETE /api/v1/books/:id
router.delete(
  "/:id",
  authorizePermission(PERMISSIONS.BOOK_DELETE),
  deleteBookController
);

export default router;
