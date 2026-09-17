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
import { notifyMemberEvent, notifyAdmins } from "./notification.service.js";

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

  const member = await createMember(data);

  // Notify member about account creation
  await notifyMemberEvent(
    member._id.toString(),
    "MEMBER_CREATED",
    "Member account created",
    `Your library member account has been created. Your member ID is ${member.memberId}.`,
    "MEMBER",
    member._id.toString()
  );

  // Notify admins about new member
  await notifyAdmins(
    "MEMBER_CREATED",
    "New member registered",
    `New member "${member.name}" (${member.memberId}) has been registered.`,
    "MEMBER",
    member._id.toString()
  );

  return member;
};

export const listMembersService = async (
  query: import("../types/pagination.js").PaginationQuery
) => {
  return getMembers(query);
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

  const updatedMember = await updateMember(id, data);

  if (!updatedMember) {
    throw new Error("Failed to update member");
  }

  await notifyMemberEvent(
    id,
    "MEMBER_UPDATED",
    "Member account updated",
    "Your member account details have been updated.",
    "MEMBER",
    id
  );

  // Notify admins about member update
  await notifyAdmins(
    "MEMBER_UPDATED",
    "Member account updated",
    `Member account "${existingMember.name}" (${existingMember.memberId}) has been updated.`,
    "MEMBER",
    id
  );

  return updatedMember;
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

  const deletedMember = await deleteMember(id);

  if (!deletedMember) {
    throw new Error("Failed to delete member");
  }

  await notifyMemberEvent(
    id,
    "MEMBER_DELETED",
    "Member account deleted",
    "Your member account has been deleted.",
    "MEMBER",
    id
  );

  // Notify admins about member deletion
  await notifyAdmins(
    "MEMBER_DELETED",
    "Member account deleted",
    `Member account "${member.name}" (${member.memberId}) has been deleted.`,
    "MEMBER",
    id
  );

  return deletedMember;
};