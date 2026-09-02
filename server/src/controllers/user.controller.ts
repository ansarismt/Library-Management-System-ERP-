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

const getIdParam = (req: Request): string => {
  const id = req.params.id;

  if (Array.isArray(id)) {
    return id[0];
  }

  return id;
};

export const getUsersController = async (
  _req: Request,
  res: Response
) => {
  try {
    const users = await getUsers();

    return res.status(200).json({
      success: true,
      data: users,
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
    const user = await updateUser(
      getIdParam(req),
      req.body
    );

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
    const result = await deleteUser(getIdParam(req));

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

    const user = await changeUserRole(
      getIdParam(req),
      role as Role
    );

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