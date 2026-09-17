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
import { notifyAdmins } from "./notification.service.js";

export const createBook = async (
  data: CreateBookData
) => {
  const book = await createBookRepository(data);

  // Notify admins about new book
  await notifyAdmins(
    "BOOK_CREATED",
    "New book added",
    `New book "${data.title}" has been added to the catalog.`,
    "BOOK",
    book._id.toString()
  );

  return book;
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
  const book = await updateBookRepository(id, data);
  
  if (book) {
    await notifyAdmins(
      "BOOK_UPDATED",
      "Book updated",
      `Book "${book.title}" has been updated.`,
      "BOOK",
      book._id.toString()
    );
  }
  
  return book;
};

export const deleteBook = async (
  id: string
) => {
  const book = await getBookByIdRepository(id);
  const bookTitle = book?.title || "Unknown book";
  
  const result = await deleteBookRepository(id);
  
  if (result) {
    await notifyAdmins(
      "BOOK_DELETED",
      "Book deleted",
      `Book "${bookTitle}" has been removed from the catalog.`,
      "BOOK",
      id
    );
  }
  
  return result;
};
