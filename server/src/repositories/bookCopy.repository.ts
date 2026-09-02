import { BookCopy, IBookCopy } from "../models/BookCopy.js";
import mongoose from "mongoose";

export interface CreateBookCopyData {
  bookId: string;
  accessionNumber: string;
  barcode?: string;
  location?: string;
  status?: IBookCopy["status"];
  condition?: IBookCopy["condition"];
  acquiredAt?: Date;
  price?: number;
  notes?: string;
}

export const createBookCopy = async (
  data: CreateBookCopyData
) => {
  return BookCopy.create({
    ...data,
    bookId: new mongoose.Types.ObjectId(data.bookId),
  });
};

export const getBookCopies = async () => {
  return BookCopy.find()
    .populate("bookId", "isbn title authors")
    .sort({ createdAt: -1 });
};

export const getBookCopiesByBookId = async (
  bookId: string
) => {
  return BookCopy.find({
    bookId: new mongoose.Types.ObjectId(bookId),
  }).sort({ accessionNumber: 1 });
};

export const getBookCopyById = async (
  id: string
) => {
  return BookCopy.findById(id).populate(
    "bookId",
    "isbn title authors"
  );
};

export const getBookCopyByAccessionNumber = async (
  accessionNumber: string
) => {
  return BookCopy.findOne({
    accessionNumber: accessionNumber.trim(),
  }).populate("bookId", "isbn title authors");
};

export const updateBookCopy = async (
  id: string,
  data: Partial<CreateBookCopyData>
) => {
  const updateData = { ...data };

  if (data.bookId) {
    updateData.bookId = new mongoose.Types.ObjectId(
      data.bookId
    ).toString();
  }

  return BookCopy.findByIdAndUpdate(
    id,
    updateData,
    {
      new: true,
      runValidators: true,
    }
  ).populate("bookId", "isbn title authors");
};

export const deleteBookCopy = async (
  id: string
) => {
  return BookCopy.findByIdAndDelete(id);
};