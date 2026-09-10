import { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../utils/jwt.js";
import { Role } from "../constants/roles.js";
import { AppError } from "./error.middleware.js";
import { AUDIT_ACTIONS } from "../constants/auditActions.js";
import {
  createAuditLog,
  getAuditRequestContext,
} from "../services/audit.service.js";

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    role: Role;
  };
}

const auditAuthenticationFailure = (
  req: AuthenticatedRequest,
  description: string
): void => {
  void createAuditLog({
    ...getAuditRequestContext(req),
    action: AUDIT_ACTIONS.AUTH_ACCESS_DENIED,
    resourceType: "AUTH",
    description,
    success: false,
    statusCode: 401,
  });
};

export const authenticate = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const authorization = req.headers.authorization;

    if (!authorization?.startsWith("Bearer ")) {
      auditAuthenticationFailure(req, "Authentication header missing");
      next(new AppError(401, "Authentication required"));
      return;
    }

    const token = authorization.substring(7).trim();

    if (!token) {
      auditAuthenticationFailure(req, "Access token missing");
      next(new AppError(401, "Access token is missing"));
      return;
    }

    const payload = verifyAccessToken(token);

    if (!payload.userId || !payload.role) {
      auditAuthenticationFailure(req, "Access token payload invalid");
      next(new AppError(401, "Invalid access token"));
      return;
    }

       req.user = {
      userId: payload.userId,
      role: payload.role as Role,
    };

    next();
  } catch (error) {
    console.error("JWT authentication error:", error);

    auditAuthenticationFailure(req, "Access token rejected");
    next(new AppError(401, "Invalid or expired access token"));
  }
};