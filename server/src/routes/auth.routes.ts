import { Router } from "express";
import { authorizeRoles } from "../middleware/authorization.middleware.js";
import { ROLES } from "../constants/roles.js";
import { authorizePermission } from "../middleware/authorization.middleware.js";
import { PERMISSIONS } from "../constants/permissions.js";



import {
  loginController,
  logoutController,
  meController,
  refreshController,
  registerController,
} from "../controllers/auth.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/register", registerController);
router.post("/login", loginController);
router.post("/refresh", refreshController);
router.post("/logout", logoutController);

router.get("/me", authenticate, meController);

router.get(
  "/admin-test",
  authenticate,
  authorizeRoles(
    ROLES.SUPER_ADMIN,
    ROLES.LIBRARY_ADMIN
  ),
  (_req, res) => {
    res.json({
      success: true,
      message: "Admin authorization successful",
    });
  }
);

router.get(
  "/permission-test",
  authenticate,
  authorizePermission(PERMISSIONS.BOOK_CREATE),
  (_req, res) => {
    res.json({
      success: true,
      message: "BOOK_CREATE permission granted",
    });
  }
);

router.get(
  "/book-read-test",
  authenticate,
  authorizePermission(PERMISSIONS.BOOK_READ),
  (_req, res) => {
    res.json({
      success: true,
      message: "BOOK_READ permission granted",
    });
  }
);

export default router;