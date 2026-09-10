import { Book, IBook } from "../models/Book.js";
import { PaginatedResult, PaginationQuery } from "../types/pagination.js";
import { createPaginationMetadata, getPaginationOptions } from "../utils/pagination.js";
import { escapeRegex } from "../utils/search.js";

export interface CreateBookData {
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
  availableCopies?: number;
  status?: "ACTIVE" | "INACTIVE" | "ARCHIVED";
}

export const createBook = async (
  data: CreateBookData
): Promise<IBook> => {
  const book = await Book.create({
    ...data,
    availableCopies:
      data.availableCopies ?? data.totalCopies,
  });

  return book;
};

export const getBookById = async (
  id: string
): Promise<IBook | null> => {
  return Book.findById(id);
};

export const getBookByIsbn = async (
  isbn: string
): Promise<IBook | null> => {
  return Book.findOne({
    isbn: new RegExp(`^${escapeRegex(isbn)}$`, "i"),
  });
};

export const getBooks = async (
  query: PaginationQuery
): Promise<PaginatedResult<IBook>> => {
  const filters: Record<string, unknown> = {};

  if (query.search) {
    const search = new RegExp(escapeRegex(query.search), "i");
    filters.$or = [
      { title: search },
      { isbn: search },
      { authors: search },
      { publisher: search },
    ];
  }

  if (query.status) filters.status = query.status;
  if (query.category) filters.category = query.category;
  if (query.dateFrom || query.dateTo) {
    filters.createdAt = {
      ...(query.dateFrom ? { $gte: new Date(query.dateFrom) } : {}),
      ...(query.dateTo ? { $lte: new Date(query.dateTo) } : {}),
    };
  }

  const { skip, limit, sort } = getPaginationOptions(query);
  const [items, total] = await Promise.all([
    Book.find(filters).sort(sort).skip(skip).limit(limit).exec(),
    Book.countDocuments(filters).exec(),
  ]);

  return {
    items,
    pagination: createPaginationMetadata(query, total),
  };
};

export const updateBook = async (
  id: string,
  data: Partial<CreateBookData>
): Promise<IBook | null> => {
  return Book.findByIdAndUpdate(
    id,
    data,
    {
      returnDocument: "after",
      runValidators: true,
    }
  );
};

export const deleteBook = async (
  id: string
): Promise<IBook | null> => {
  return Book.findByIdAndDelete(id);
};
