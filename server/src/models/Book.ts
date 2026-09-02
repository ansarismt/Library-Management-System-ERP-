import mongoose, { Document, Schema } from "mongoose";

export interface IBook extends Document {
  isbn: string;
  title: string;
  subtitle?: string;
  authors: string[];
  publisher?: string;
  publicationYear?: number;
  edition?: string;
  category?: string;
  language?: string;
  description?: string;
  coverImage?: string;
  totalCopies: number;
  availableCopies: number;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  createdAt: Date;
  updatedAt: Date;
}

const bookSchema = new Schema<IBook>(
  {
    isbn: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 250,
      index: true,
    },

    subtitle: {
      type: String,
      trim: true,
      maxlength: 250,
    },

    authors: {
      type: [String],
      required: true,
      validate: {
        validator: (value: string[]) => value.length > 0,
        message: "At least one author is required",
      },
    },

    publisher: {
      type: String,
      trim: true,
    },

    publicationYear: {
      type: Number,
      min: 1000,
      max: new Date().getFullYear(),
    },

    edition: {
      type: String,
      trim: true,
    },

    category: {
      type: String,
      trim: true,
      index: true,
    },

    language: {
      type: String,
      trim: true,
      default: "English",
    },

    description: {
      type: String,
      trim: true,
    },

    coverImage: {
      type: String,
      trim: true,
    },

    totalCopies: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    availableCopies: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "ARCHIVED"],
      default: "ACTIVE",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Book = mongoose.model<IBook>("Book", bookSchema);