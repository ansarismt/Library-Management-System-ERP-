import mongoose from "mongoose";

import {
  createMember,
  getMembers,
  getMemberById,
  getMemberByMemberId,
  getMemberByEmail,
  updateMember,
  deleteMember,
  CreateMemberData,
} from "../repositories/member.repository.js";

export const createMemberService = async (
  data: CreateMemberData
) => {
  const existingMemberId =
    await getMemberByMemberId(data.memberId);

  if (existingMemberId) {
    throw new Error("Member ID already exists");
  }

  const existingEmail =
    await getMemberByEmail(data.email);

  if (existingEmail) {
    throw new Error("Email is already registered");
  }

  return createMember(data);
};

export const listMembersService = async () => {
  return getMembers();
};

export const getMemberService = async (
  id: string
) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid member ID");
  }

  const member = await getMemberById(id);

  if (!member) {
    throw new Error("Member not found");
  }

  return member;
};

export const updateMemberService = async (
  id: string,
  data: Partial<CreateMemberData>
) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid member ID");
  }

  const existingMember = await getMemberById(id);

  if (!existingMember) {
    throw new Error("Member not found");
  }

  if (
    data.memberId &&
    data.memberId !== existingMember.memberId
  ) {
    const duplicate =
      await getMemberByMemberId(data.memberId);

    if (duplicate) {
      throw new Error("Member ID already exists");
    }
  }

  if (
    data.email &&
    data.email.toLowerCase() !== existingMember.email
  ) {
    const duplicate =
      await getMemberByEmail(data.email);

    if (duplicate) {
      throw new Error("Email is already registered");
    }
  }

  return updateMember(id, data);
};

export const deleteMemberService = async (
  id: string
) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid member ID");
  }

  const member = await getMemberById(id);

  if (!member) {
    throw new Error("Member not found");
  }

  return deleteMember(id);
};