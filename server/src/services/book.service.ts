import {
  createBook as createBookRepository,
  getBookById as getBookByIdRepository,
  getBookByIsbn as getBookByIsbnRepository,
  getBooks as getBooksRepository,
  updateBook as updateBookRepository,
  deleteBook as deleteBookRepository,
  CreateBookData,
} from "../repositories/book.repository.js";
import { PaginatedResult, PaginationQuery } from "../types/pagination.js";

export const createBook = async (
  data: CreateBookData
) => {
  return createBookRepository(data);
};

export const getBookById = async (
  id: string
) => {
  return getBookByIdRepository(id);
};

export const getBookByIsbn = async (
  isbn: string
) => {
  return getBookByIsbnRepository(isbn);
};

export const getBooks = async (
  query: PaginationQuery
): Promise<PaginatedResult<Awaited<ReturnType<typeof getBooksRepository>>["items"][number]>> => {
  return getBooksRepository(query);
};

export const updateBook = async (
  id: string,
  data: Partial<CreateBookData>
) => {
  return updateBookRepository(id, data);
};

export const deleteBook = async (
  id: string
) => {
  return deleteBookRepository(id);
};
