import mongoose, { Document, Schema } from "mongoose";
import { ROLES, Role } from "../constants/roles.js";

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  memberId?: string;
  department?: string;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    passwordHash: {
      type: String,
      required: true,
      select: false,
    },

    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.STUDENT,
      index: true,
    },

    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "SUSPENDED"],
      default: "ACTIVE",
      index: true,
    },

    memberId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },

    department: {
      type: String,
      trim: true,
    },

    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model<IUser>("User", userSchema);