import { User } from "../models/User.js";

export const findUserByEmail = async (email: string) => {
  return User.findOne({
    email: email.toLowerCase(),
  }).select("+passwordHash");
};

export const findUserById = async (userId: string) => {
  return User.findById(userId);
};

export const createUser = async (data: {
  name: string;
  email: string;
  passwordHash: string;
  role: string;
}) => {
  return User.create(data);
};

export const updateLastLogin = async (userId: string) => {
  return User.findByIdAndUpdate(
    userId,
    {
      lastLogin: new Date(),
    },
    {
      returnDocument: "after"
    }
  );
};