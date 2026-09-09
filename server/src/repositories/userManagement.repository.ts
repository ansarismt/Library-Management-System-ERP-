import { User } from "../models/User.js";
import { Role } from "../constants/roles.js";
import { PaginatedResult, PaginationQuery } from "../types/pagination.js";
import { createPaginationMetadata, getPaginationOptions } from "../utils/pagination.js";
import { escapeRegex } from "../utils/search.js";

export const findUsers = async (
  query: PaginationQuery
): Promise<PaginatedResult<Awaited<ReturnType<typeof User.find>>[number]>> => {
  const filters: Record<string, unknown> = {};

  if (query.search) {
    const search = new RegExp(escapeRegex(query.search), "i");
    filters.$or = [
      { name: search },
      { email: search },
      { department: search },
      { memberId: search },
    ];
  }
  if (query.role) filters.role = query.role;
  if (query.status) filters.status = query.status;
  if (query.dateFrom || query.dateTo) {
    filters.createdAt = {
      ...(query.dateFrom ? { $gte: new Date(query.dateFrom) } : {}),
      ...(query.dateTo ? { $lte: new Date(query.dateTo) } : {}),
    };
  }

  const { skip, limit, sort } = getPaginationOptions(query);
  const [items, total] = await Promise.all([
    User.find(filters).select("-passwordHash").sort(sort).skip(skip).limit(limit).exec(),
    User.countDocuments(filters).exec(),
  ]);

  return {
    items,
    pagination: createPaginationMetadata(query, total),
  };
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