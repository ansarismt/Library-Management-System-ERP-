import crypto from "crypto";
import {
  createUser,
  findUserByEmail,
  findUserById,
  updateLastLogin,
} from "../repositories/user.repository.js";
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

console.log("LOGIN DEBUG:", {
  email,
  userFound: !!user,
  userId: user?._id?.toString(),
  userEmail: user?.email,
  userStatus: user?.status,
  userRole: user?.role,
});

if (!user) {
  throw new Error("Invalid email or password");
}

 const validPassword = await comparePassword(
  password,
  user.passwordHash
);

console.log("PASSWORD DEBUG:", {
  validPassword,
  hasPasswordHash: !!user.passwordHash,
});

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