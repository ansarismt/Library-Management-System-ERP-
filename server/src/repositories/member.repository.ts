import { Member, IMember } from "../models/Member.js";
import { PaginatedResult, PaginationQuery } from "../types/pagination.js";
import { createPaginationMetadata, getPaginationOptions } from "../utils/pagination.js";
import { escapeRegex } from "../utils/search.js";

export interface CreateMemberData {
  memberId: string;
  name: string;
  email: string;
  phone?: string;
  department?: string;
  course?: string;
  year?: number;
  membershipType:
    | "STUDENT"
    | "FACULTY"
    | "STAFF"
    | "GUEST";
  status?:
    | "ACTIVE"
    | "SUSPENDED"
    | "EXPIRED"
    | "INACTIVE";
  joinedAt?: Date;
  expiryDate?: Date;
}

export const createMember = async (
  data: CreateMemberData
): Promise<IMember> => {
  return Member.create(data);
};

export const getMembers = async (
  query: PaginationQuery
): Promise<PaginatedResult<IMember>> => {
  const filters: Record<string, unknown> = {};

  if (query.search) {
    const search = new RegExp(escapeRegex(query.search), "i");
    filters.$or = [
      { name: search },
      { memberId: search },
      { email: search },
      { phone: search },
    ];
  }
  if (query.status) filters.status = query.status;
  if (query.membershipType) filters.membershipType = query.membershipType;
  if (query.dateFrom || query.dateTo) {
    filters.createdAt = {
      ...(query.dateFrom ? { $gte: new Date(query.dateFrom) } : {}),
      ...(query.dateTo ? { $lte: new Date(query.dateTo) } : {}),
    };
  }

  const { skip, limit, sort } = getPaginationOptions(query);
  const [items, total] = await Promise.all([
    Member.find(filters).sort(sort).skip(skip).limit(limit).exec(),
    Member.countDocuments(filters).exec(),
  ]);

  return {
    items,
    pagination: createPaginationMetadata(query, total),
  };
};

export const getMemberById = async (
  id: string
): Promise<IMember | null> => {
  return Member.findById(id);
};

export const getMemberByMemberId = async (
  memberId: string
): Promise<IMember | null> => {
  return Member.findOne({ memberId });
};

export const getMemberByEmail = async (
  email: string
): Promise<IMember | null> => {
  return Member.findOne({
    email: email.toLowerCase(),
  });
};

export const updateMember = async (
  id: string,
  data: Partial<CreateMemberData>
): Promise<IMember | null> => {
  return Member.findByIdAndUpdate(
    id,
    data,
    {
      returnDocument: "after",
      runValidators: true,
    }
  );
};

export const deleteMember = async (
  id: string
): Promise<IMember | null> => {
  return Member.findByIdAndDelete(id);
};