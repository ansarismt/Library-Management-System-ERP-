import crypto from "crypto";
import {
  createUser,
  findUserByEmail,
  findUserById,
  updateLastLogin,
} from "../repositories/user.repository.js";
import { Member } from "../models/Member.js";
import { User } from "../models/User.js";
import {
  createRefreshToken,
  findRefreshToken,
  revokeRefreshToken,
} from "../repositories/refreshToken.repository.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt.js";
import {
  comparePassword,
  hashPassword,
} from "../utils/password.js";


const hashToken = (token: string): string => {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
};

export const generateMemberId = async () => {
  const lastMember = await Member.findOne({}, { memberId: 1 })
    .sort({ createdAt: -1 })
    .lean()
    .exec();

  if (!lastMember?.memberId) {
    return "MEM001";
  }

  const match = lastMember.memberId.match(/MEM(\d+)/);
  if (!match) return "MEM001";

  const nextNum = parseInt(match[1], 10) + 1;
  return `MEM${String(nextNum).padStart(3, "0")}`;
};

const createMemberForUser = async (user: any) => {
  const roleToMembershipType: Record<string, "STUDENT" | "FACULTY" | "STAFF" | "GUEST" | "MEMBER"> = {
    STUDENT: "STUDENT",
    FACULTY: "FACULTY",
    MEMBER: "MEMBER",
    LIBRARIAN: "STAFF",
    ASSISTANT_LIBRARIAN: "STAFF",
    LIBRARY_ADMIN: "STAFF",
    SUPER_ADMIN: "STAFF",
    AUDITOR: "STAFF",
  };

  const membershipType = roleToMembershipType[user.role] || "GUEST";

  // Only create member for roles that should have a library membership
  if (!["STUDENT", "FACULTY", "MEMBER"].includes(user.role)) {
    return null;
  }

  const memberId = await generateMemberId();

  const member = await Member.create({
    memberId,
    name: user.name,
    email: user.email.toLowerCase().trim(),
    membershipType,
    status: "ACTIVE",
    joinedAt: new Date(),
  });

  // Link the member to the user
  await User.findByIdAndUpdate(user._id, {
    memberId: member._id.toString(),
  });

  return member;
};

export const register = async (data: {
  name: string;
  email: string;
  password: string;
}) => {
  const existingUser = await findUserByEmail(data.email);

  if (existingUser) {
    throw new Error("Email is already registered");
  }

  const passwordHash = await hashPassword(data.password);

  const user = await createUser({
    name: data.name,
    email: data.email,
    passwordHash,
    role: "STUDENT",
  });

  // Create Member record for student/faculty/member roles
  await createMemberForUser(user);

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
  };
};

export const login = async (
  email: string,
  password: string
) => {
  const user = await findUserByEmail(email);

  if (!user) {
    throw new Error("Invalid email or password");
  }

  const validPassword = await comparePassword(
    password,
    user.passwordHash
  );

  if (!validPassword) {
    throw new Error("Invalid email or password");
  }

  if (user.status !== "ACTIVE") {
    throw new Error("User account is not active");
  }

  await updateLastLogin(user._id.toString());

  const accessToken = generateAccessToken({
    userId: user._id.toString(),
    role: user.role,
  });

  const refreshToken = generateRefreshToken(
    user._id.toString()
  );

  await createRefreshToken({
    user: user._id.toString(),
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    ),
  });

  return {
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    },
    accessToken,
    refreshToken,
  };
};

export const refreshAccessToken = async (
  refreshToken: string
) => {
  const payload = verifyRefreshToken(refreshToken);

  const tokenRecord = await findRefreshToken(
    hashToken(refreshToken)
  );

  if (!tokenRecord) {
    throw new Error("Invalid or revoked refresh token");
  }

  const user = await findUserById(payload.userId);

  if (!user || user.status !== "ACTIVE") {
    throw new Error("User account is not active");
  }

  await revokeRefreshToken(hashToken(refreshToken));

  const newAccessToken = generateAccessToken({
    userId: user._id.toString(),
    role: user.role,
  });

  const newRefreshToken = generateRefreshToken(
    user._id.toString()
  );

  await createRefreshToken({
    user: user._id.toString(),
    tokenHash: hashToken(newRefreshToken),
    expiresAt: new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    ),
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
};

export const logout = async (refreshToken: string) => {
  await revokeRefreshToken(hashToken(refreshToken));
};
