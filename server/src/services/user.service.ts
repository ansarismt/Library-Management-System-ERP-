import {
  createManagedUser,
  deleteManagedUser,
  findUserByIdForManagement,
  findUsers,
  updateManagedUser,
  updateUserRole,
} from "../repositories/userManagement.repository.js";

import {
  findUserByEmail,
} from "../repositories/user.repository.js";

import {
  hashPassword,
} from "../utils/password.js";

import { Role } from "../constants/roles.js";

export const getUsers = async () => {
  return findUsers();
};

export const getUserById = async (userId: string) => {
  const user = await findUserByIdForManagement(userId);

  if (!user) {
    throw new Error("User not found");
  }

  return user;
};

export const createUser = async (data: {
  name: string;
  email: string;
  password: string;
  role: Role;
  status?: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  memberId?: string;
  department?: string;
}) => {
  const existingUser = await findUserByEmail(data.email);

  if (existingUser) {
    throw new Error("Email is already registered");
  }

  const passwordHash = await hashPassword(data.password);

  const user = await createManagedUser({
    name: data.name,
    email: data.email.toLowerCase(),
    passwordHash,
    role: data.role,
    status: data.status ?? "ACTIVE",
    memberId: data.memberId,
    department: data.department,
  });

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    memberId: user.memberId,
    department: user.department,
  };
};

export const updateUser = async (
  userId: string,
  data: {
    name?: string;
    email?: string;
    role?: Role;
    status?: "ACTIVE" | "INACTIVE" | "SUSPENDED";
    memberId?: string;
    department?: string;
  }
) => {
  const user = await updateManagedUser(userId, {
    ...data,
    email: data.email?.toLowerCase(),
  });

  if (!user) {
    throw new Error("User not found");
  }

  return user;
};

export const deleteUser = async (userId: string) => {
  const user = await deleteManagedUser(userId);

  if (!user) {
    throw new Error("User not found");
  }

  return {
    id: user._id.toString(),
    message: "User deleted successfully",
  };
};

export const changeUserRole = async (
  userId: string,
  role: Role
) => {
  const user = await updateUserRole(userId, role);

  if (!user) {
    throw new Error("User not found");
  }

  return user;
};