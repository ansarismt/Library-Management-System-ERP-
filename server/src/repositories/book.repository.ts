import { Book, IBook } from "../models/Book.js";

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
    isbn: isbn.toLowerCase(),
  });
};

export const getBooks = async (): Promise<IBook[]> => {
  return Book.find()
    .sort({ createdAt: -1 })
    .exec();
};

export const updateBook = async (
  id: string,
  data: Partial<CreateBookData>
): Promise<IBook | null> => {
  return Book.findByIdAndUpdate(
    id,
    data,
    {
      new: true,
      runValidators: true,
    }
  );
};

export const deleteBook = async (
  id: string
): Promise<IBook | null> => {
  return Book.findByIdAndDelete(id);
};