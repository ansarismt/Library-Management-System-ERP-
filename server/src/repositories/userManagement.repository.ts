import { User } from "../models/User.js";
import { Role } from "../constants/roles.js";

export const findUsers = async () => {
  return User.find()
    .select("-passwordHash")
    .sort({ createdAt: -1 });
};

export const findUserByIdForManagement = async (
  userId: string
) => {
  return User.findById(userId).select("-passwordHash");
};

export const createManagedUser = async (data: {
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  status?: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  memberId?: string;
  department?: string;
}) => {
  return User.create(data);
};

export const updateManagedUser = async (
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
  return User.findByIdAndUpdate(
    userId,
    data,
    {
      returnDocument: "after",
      runValidators: true,
    }
  ).select("-passwordHash");
};

export const deleteManagedUser = async (
  userId: string
) => {
  return User.findByIdAndDelete(userId);
};

export const updateUserRole = async (
  userId: string,
  role: Role
) => {
  return User.findByIdAndUpdate(
    userId,
    { role },
    {
      returnDocument: "after",
      runValidators: true,
    }
  ).select("-passwordHash");
};