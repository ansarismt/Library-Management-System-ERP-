import { NextFunction, Request, Response } from "express";
import {
  createBook,
  getBookById,
  getBookByIsbn,
  getBooks,
  updateBook,
  deleteBook,
} from "../services/book.service.js";
import { AUDIT_ACTIONS } from "../constants/auditActions.js";
import { auditRequest } from "../services/audit.service.js";

export const createBookController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const book = await createBook(req.body);

    await auditRequest(req, {
      action: AUDIT_ACTIONS.BOOK_CREATED,
      resourceType: "BOOK",
      resourceId: book._id.toString(),
      description: "Book created",
      after: {
        isbn: book.isbn,
        title: book.title,
        category: book.category,
        status: book.status,
      },
      success: true,
      statusCode: 201,
    });

    res.status(201).json({
      success: true,
      message: "Book created successfully",
      data: book,
    });
  } catch (error) {
    next(error);
  }
};

export const getBooksController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const books = await getBooks(req.query as never);

    res.status(200).json({
      success: true,
      data: books.items,
      pagination: books.pagination,
    });
  } catch (error) {
    console.error("Get books error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch books",
    });
  }
};

export const getBookController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const id = req.params.id;

    if (typeof id !== "string") {
      res.status(400).json({
        success: false,
        message: "Invalid book ID",
      });
      return;
    }

    const book = await getBookById(id);

    if (!book) {
      res.status(404).json({
        success: false,
        message: "Book not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: book,
    });
  } catch (error) {
    console.error("Get book error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch book",
    });
  }
};

export const getBookByIsbnController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const isbn = req.params.isbn;

    if (typeof isbn !== "string") {
      res.status(400).json({
        success: false,
        message: "Invalid ISBN",
      });
      return;
    }

    const book = await getBookByIsbn(isbn);

    if (!book) {
      res.status(404).json({
        success: false,
        message: "Book not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: book,
    });
  } catch (error) {
    console.error("Get book by ISBN error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch book",
    });
  }
};

export const updateBookController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const id = req.params.id;

    if (typeof id !== "string") {
      res.status(400).json({
        success: false,
        message: "Invalid book ID",
      });
      return;
    }

    const beforeBook = await getBookById(id);
    const book = await updateBook(id, req.body);

    if (!book) {
      res.status(404).json({
        success: false,
        message: "Book not found",
      });
      return;
    }

    await auditRequest(req, {
      action: AUDIT_ACTIONS.BOOK_UPDATED,
      resourceType: "BOOK",
      resourceId: id,
      description: "Book updated",
      before: beforeBook ? {
        isbn: beforeBook.isbn,
        title: beforeBook.title,
        category: beforeBook.category,
        status: beforeBook.status,
      } : undefined,
      after: {
        isbn: book.isbn,
        title: book.title,
        category: book.category,
        status: book.status,
      },
      success: true,
      statusCode: 200,
    });

    res.status(200).json({
      success: true,
      message: "Book updated successfully",
      data: book,
    });
  } catch (error) {
    console.error("Update book error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update book",
    });
  }
};

export const deleteBookController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const id = req.params.id;

    if (typeof id !== "string") {
      res.status(400).json({
        success: false,
        message: "Invalid book ID",
      });
      return;
    }

    const book = await deleteBook(id);

    if (!book) {
      res.status(404).json({
        success: false,
        message: "Book not found",
      });
      return;
    }

    await auditRequest(req, {
      action: AUDIT_ACTIONS.BOOK_DELETED,
      resourceType: "BOOK",
      resourceId: id,
      description: "Book deleted",
      before: {
        isbn: book.isbn,
        title: book.title,
        category: book.category,
        status: book.status,
      },
      success: true,
      statusCode: 200,
    });

    res.status(200).json({
      success: true,
      message: "Book deleted successfully",
      data: book,
    });
  } catch (error) {
    console.error("Delete book error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete book",
    });
  }
};
