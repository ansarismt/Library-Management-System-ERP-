import mongoose, { Document, Schema } from "mongoose";

export interface IMember extends Document {
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

  status:
    | "ACTIVE"
    | "SUSPENDED"
    | "EXPIRED"
    | "INACTIVE";

  joinedAt: Date;
  expiryDate?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const memberSchema = new Schema<IMember>(
  {
    memberId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 150,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    phone: {
      type: String,
      trim: true,
    },

    department: {
      type: String,
      trim: true,
    },

    course: {
      type: String,
      trim: true,
    },

    year: {
      type: Number,
      min: 1,
      max: 10,
    },

    membershipType: {
      type: String,
      enum: [
        "STUDENT",
        "FACULTY",
        "STAFF",
        "GUEST",
      ],
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: [
        "ACTIVE",
        "SUSPENDED",
        "EXPIRED",
        "INACTIVE",
      ],
      default: "ACTIVE",
      index: true,
    },

    joinedAt: {
      type: Date,
      default: Date.now,
    },

    expiryDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const Member = mongoose.model<IMember>(
  "Member",
  memberSchema
);