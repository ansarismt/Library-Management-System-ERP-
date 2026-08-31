import jwt from "jsonwebtoken";

interface AccessTokenPayload {
  userId: string;
  role: string;
}

const getAccessSecret = (): string => {
  const secret = process.env.JWT_ACCESS_SECRET;

  if (!secret) {
    throw new Error("JWT_ACCESS_SECRET is not configured");
  }

  return secret;
};

const getRefreshSecret = (): string => {
  const secret = process.env.JWT_REFRESH_SECRET;

  if (!secret) {
    throw new Error("JWT_REFRESH_SECRET is not configured");
  }

  return secret;
};

export const generateAccessToken = (
  payload: AccessTokenPayload
): string => {
  return jwt.sign(payload, getAccessSecret(), {
    expiresIn: "15m",
  });
};

export const generateRefreshToken = (
  userId: string
): string => {
  return jwt.sign(
    { userId },
    getRefreshSecret(),
    {
      expiresIn: "7d",
    }
  );
};

export const verifyAccessToken = (
  token: string
): AccessTokenPayload => {
  return jwt.verify(token, getAccessSecret()) as AccessTokenPayload;
};

export const verifyRefreshToken = (
  token: string
): { userId: string } => {
  return jwt.verify(token, getRefreshSecret()) as {
    userId: string;
  };
};