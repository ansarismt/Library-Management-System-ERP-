import { Request, Response } from "express";
import {
  createBook,
  getBookById,
  getBookByIsbn,
  getBooks,
  updateBook,
  deleteBook,
} from "../services/book.service.js";

export const createBookController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const book = await createBook(req.body);

    res.status(201).json({
      success: true,
      message: "Book created successfully",
      data: book,
    });
  } catch (error) {
    console.error("Create book error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create book",
    });
  }
};

export const getBooksController = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const books = await getBooks();

    res.status(200).json({
      success: true,
      data: books,
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

    const book = await updateBook(id, req.body);

    if (!book) {
      res.status(404).json({
        success: false,
        message: "Book not found",
      });
      return;
    }

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
