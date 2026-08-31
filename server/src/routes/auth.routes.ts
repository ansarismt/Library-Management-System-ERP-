import { Router } from "express";

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

export default router;