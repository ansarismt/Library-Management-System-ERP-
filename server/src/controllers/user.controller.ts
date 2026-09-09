import { Request, Response } from "express";
import {
  changeUserRole,
  createUser,
  deleteUser,
  getUserById,
  getUsers,
  updateUser,
} from "../services/user.service.js";
import { Role } from "../constants/roles.js";
import { AUDIT_ACTIONS } from "../constants/auditActions.js";
import { auditRequest } from "../services/audit.service.js";

const getIdParam = (req: Request): string => {
  const id = req.params.id;

  if (Array.isArray(id)) {
    return id[0];
  }

  return id;
};

export const getUsersController = async (
  req: Request,
  res: Response
) => {
  try {
    const users = await getUsers(req.query as never);

    return res.status(200).json({
      success: true,
      data: users.items,
      pagination: users.pagination,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    });
  }
};

export const getUserController = async (
  req: Request,
  res: Response
) => {
  try {
    const user = await getUserById(getIdParam(req));

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "User not found",
    });
  }
};

export const createUserController = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      name,
      email,
      password,
      role,
      status,
      memberId,
      department,
    } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message:
          "Name, email, password and role are required",
      });
    }

    const user = await createUser({
      name,
      email,
      password,
      role: role as Role,
      status,
      memberId,
      department,
    });

    await auditRequest(req, {
      action: AUDIT_ACTIONS.USER_CREATED,
      resourceType: "USER",
      resourceId: user.id,
      description: "User created",
      after: {
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        memberId: user.memberId,
      },
      success: true,
      statusCode: 201,
    });

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      data: user,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to create user",
    });
  }
};

export const updateUserController = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      name,
      email,
      status,
      memberId,
      department,
    } = req.body;

    const beforeUser = await getUserById(getIdParam(req));
    const user = await updateUser(
      getIdParam(req),
      {
        name,
        email,
        status,
        memberId,
        department,
      }
    );

    await auditRequest(req, {
      action: AUDIT_ACTIONS.USER_UPDATED,
      resourceType: "USER",
      resourceId: getIdParam(req),
      description: "User updated",
      before: {
        name: beforeUser.name,
        email: beforeUser.email,
        role: beforeUser.role,
        status: beforeUser.status,
        memberId: beforeUser.memberId,
      },
      after: {
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        memberId: user.memberId,
      },
      success: true,
      statusCode: 200,
    });

    if (beforeUser.status !== user.status) {
      await auditRequest(req, {
        action: AUDIT_ACTIONS.USER_STATUS_CHANGED,
        resourceType: "USER",
        resourceId: getIdParam(req),
        description: "User status changed",
        before: { status: beforeUser.status },
        after: { status: user.status },
        success: true,
        statusCode: 200,
      });
    }

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: user,
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to update user",
    });
  }
};

export const deleteUserController = async (
  req: Request,
  res: Response
) => {
  try {
    const beforeUser = await getUserById(getIdParam(req));
    const result = await deleteUser(getIdParam(req));

    await auditRequest(req, {
      action: AUDIT_ACTIONS.USER_DELETED,
      resourceType: "USER",
      resourceId: getIdParam(req),
      description: "User deleted",
      before: {
        name: beforeUser.name,
        email: beforeUser.email,
        role: beforeUser.role,
        status: beforeUser.status,
        memberId: beforeUser.memberId,
      },
      success: true,
      statusCode: 200,
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to delete user",
    });
  }
};

export const changeUserRoleController = async (
  req: Request,
  res: Response
) => {
  try {
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({
        success: false,
        message: "Role is required",
      });
    }

    const beforeUser = await getUserById(getIdParam(req));
    const user = await changeUserRole(
      getIdParam(req),
      role as Role
    );

    await auditRequest(req, {
      action: AUDIT_ACTIONS.USER_ROLE_CHANGED,
      resourceType: "USER",
      resourceId: getIdParam(req),
      description: "User role changed",
      before: { role: beforeUser.role },
      after: { role: user.role },
      success: true,
      statusCode: 200,
    });

    return res.status(200).json({
      success: true,
      message: "User role updated successfully",
      data: user,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to update user role",
    });
  }
};