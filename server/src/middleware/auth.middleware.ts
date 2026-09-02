import { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../utils/jwt.js";
import { Role } from "../constants/roles.js";

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    role: Role;
  };
}

export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authorization = req.headers.authorization;

    if (!authorization?.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const token = authorization.substring(7).trim();

    if (!token) {
      res.status(401).json({
        success: false,
        message: "Access token is missing",
      });
      return;
    }

    const payload = verifyAccessToken(token);

    if (!payload.userId || !payload.role) {
      res.status(401).json({
        success: false,
        message: "Invalid access token",
      });
      return;
    }

       req.user = {
      userId: payload.userId,
      role: payload.role as Role,
    };

    next();
  } catch (error) {
    console.error("JWT authentication error:", error);

    res.status(401).json({
      success: false,
      message: "Invalid or expired access token",
    });
  }
};