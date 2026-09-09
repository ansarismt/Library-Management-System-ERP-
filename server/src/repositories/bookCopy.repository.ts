import { BookCopy, IBookCopy } from "../models/BookCopy.js";
import mongoose from "mongoose";
import { PaginatedResult, PaginationQuery } from "../types/pagination.js";
import { createPaginationMetadata, getPaginationOptions } from "../utils/pagination.js";
import { escapeRegex } from "../utils/search.js";

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

export const getBookCopies = async (
  query: PaginationQuery
): Promise<PaginatedResult<IBookCopy>> => {
  const filters: Record<string, unknown> = {};

  if (query.search) {
    const search = new RegExp(escapeRegex(query.search), "i");
    filters.$or = [
      { accessionNumber: search },
      { barcode: search },
      { location: search },
    ];
  }
  if (query.status) filters.status = query.status;
  if (query.condition) filters.condition = query.condition;
  if (query.bookId) filters.bookId = new mongoose.Types.ObjectId(query.bookId);
  if (query.dateFrom || query.dateTo) {
    filters.createdAt = {
      ...(query.dateFrom ? { $gte: new Date(query.dateFrom) } : {}),
      ...(query.dateTo ? { $lte: new Date(query.dateTo) } : {}),
    };
  }

  const { skip, limit, sort } = getPaginationOptions(query);
  const [items, total] = await Promise.all([
    BookCopy.find(filters)
      .populate("bookId", "isbn title authors")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .exec(),
    BookCopy.countDocuments(filters).exec(),
  ]);

  return {
    items,
    pagination: createPaginationMetadata(query, total),
  };
};

export const getBookCopiesByBookId = async (
  bookId: string,
  query: PaginationQuery
): Promise<PaginatedResult<IBookCopy>> => {
  const filters = { bookId: new mongoose.Types.ObjectId(bookId) };
  const { skip, limit, sort } = getPaginationOptions(query);
  const [items, total] = await Promise.all([
    BookCopy.find(filters).sort(sort).skip(skip).limit(limit).exec(),
    BookCopy.countDocuments(filters).exec(),
  ]);

  return {
    items,
    pagination: createPaginationMetadata(query, total),
  };
};

export const getAvailableBookCopyByBookId = async (
  bookId: string,
  session?: mongoose.ClientSession
) => {
  return BookCopy.findOne({
    bookId: new mongoose.Types.ObjectId(bookId),
    status: "AVAILABLE",
  })
    .sort({ accessionNumber: 1 })
    .session(session || null);
};

export const getBookCopyById = async (
  id: string,
  session?: mongoose.ClientSession
) => {
  return BookCopy.findById(id)
    .populate("bookId", "isbn title authors")
    .session(session || null);
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
      returnDocument: "after",
      runValidators: true,
    }
  ).populate("bookId", "isbn title authors");
};

export const deleteBookCopy = async (
  id: string
) => {
  return BookCopy.findByIdAndDelete(id);
};