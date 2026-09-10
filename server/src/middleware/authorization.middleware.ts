import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./auth.middleware.js";
import { Role } from "../constants/roles.js";
import { Permission } from "../constants/permissions.js";
import { ROLE_PERMISSIONS } from "../constants/rolePermissions.js";
import { AppError } from "./error.middleware.js";
import { AUDIT_ACTIONS } from "../constants/auditActions.js";
import {
  createAuditLog,
  getAuditRequestContext,
} from "../services/audit.service.js";

const auditAccessDenied = (
  req: AuthenticatedRequest,
  description: string
): void => {
  void createAuditLog({
    ...getAuditRequestContext(req),
    action: AUDIT_ACTIONS.AUTH_ACCESS_DENIED,
    resourceType: "AUTH",
    description,
    success: false,
    statusCode: 403,
  });
};

export const authorizeRoles = (...allowedRoles: Role[]) => {
  return (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction
  ): void => {
    if (!req.user) {
      next(new AppError(401, "Authentication required"));
      return;
    }

    if (!allowedRoles.includes(req.user.role as Role)) {
      auditAccessDenied(req, "Role authorization denied");
      next(new AppError(403, "You do not have permission to access this resource"));
      return;
    }

    next();
  };
};

export const authorizePermission = (
  permission: Permission
) => {
  return (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction
  ): void => {
    if (!req.user) {
      next(new AppError(401, "Authentication required"));
      return;
    }

    const role = req.user.role as Role;

    const permissions = ROLE_PERMISSIONS[role] ?? [];

    if (!permissions.includes(permission)) {
      auditAccessDenied(req, `Permission denied: ${permission}`);
      next(new AppError(403, "Insufficient permissions", {
        requiredPermission: permission,
      }));
      return;
    }

    next();
  };
};

export const authorizeAnyPermission = (
  ...permissions: Permission[]
) => {
  return (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction
  ): void => {
    if (!req.user) {
      next(new AppError(401, "Authentication required"));
      return;
    }

    const role = req.user.role as Role;

    const userPermissions =
      ROLE_PERMISSIONS[role] ?? [];

    const hasPermission = permissions.some(
      (permission) =>
        userPermissions.includes(permission)
    );

    if (!hasPermission) {
      auditAccessDenied(req, "Permission authorization denied");
      next(new AppError(403, "Insufficient permissions"));
      return;
    }

    next();
  };
};