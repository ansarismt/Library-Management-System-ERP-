import { Member, IMember } from "../models/Member.js";

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

export const getMembers = async (): Promise<IMember[]> => {
  return Member.find()
    .sort({ createdAt: -1 })
    .exec();
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
      new: true,
      runValidators: true,
    }
  );
};

export const deleteMember = async (
  id: string
): Promise<IMember | null> => {
  return Member.findByIdAndDelete(id);
};