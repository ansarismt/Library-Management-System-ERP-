import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./auth.middleware.js";
import { Role } from "../constants/roles.js";
import { Permission } from "../constants/permissions.js";
import { ROLE_PERMISSIONS } from "../constants/rolePermissions.js";

export const authorizeRoles = (...allowedRoles: Role[]) => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role as Role)) {
      res.status(403).json({
        success: false,
        message: "You do not have permission to access this resource",
      });
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
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const role = req.user.role as Role;

    const permissions = ROLE_PERMISSIONS[role] ?? [];

    if (!permissions.includes(permission)) {
      res.status(403).json({
        success: false,
        message: "Insufficient permissions",
        requiredPermission: permission,
      });
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
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
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
      res.status(403).json({
        success: false,
        message: "Insufficient permissions",
      });
      return;
    }

    next();
  };
};