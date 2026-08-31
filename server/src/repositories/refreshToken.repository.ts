import { RefreshToken } from "../models/RefreshToken.js";

export const createRefreshToken = async (data: {
  user: string;
  tokenHash: string;
  expiresAt: Date;
}) => {
  return RefreshToken.create(data);
};

export const findRefreshToken = async (
  tokenHash: string
) => {
  return RefreshToken.findOne({
    tokenHash,
    revokedAt: { $exists: false },
  });
};

export const revokeRefreshToken = async (
  tokenHash: string
) => {
  return RefreshToken.findOneAndUpdate(
    { tokenHash },
    {
      revokedAt: new Date(),
    },
    {
     returnDocument: "after",
    }
  );
};