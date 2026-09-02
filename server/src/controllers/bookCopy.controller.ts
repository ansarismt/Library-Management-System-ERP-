import { Request, Response } from "express";

import {
  createBookCopyService,
  listBookCopiesService,
  listBookCopiesByBookService,
  getBookCopyService,
  updateBookCopyService,
  deleteBookCopyService,
} from "../services/bookCopy.service.js";

export const createBookCopyController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const copy = await createBookCopyService(req.body);

    res.status(201).json({
      success: true,
      message: "Book copy created successfully",
      data: copy,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to create book copy";

    res.status(400).json({
      success: false,
      message,
    });
  }
};

export const listBookCopiesController = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const copies = await listBookCopiesService();

    res.status(200).json({
      success: true,
      data: copies,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch book copies";

    res.status(500).json({
      success: false,
      message,
    });
  }
};

export const listBookCopiesByBookController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { bookId } = req.params;

    if (typeof bookId !== "string") {
      res.status(400).json({
        success: false,
        message: "Invalid book ID",
      });
      return;
    }

    const copies =
      await listBookCopiesByBookService(bookId);

    res.status(200).json({
      success: true,
      data: copies,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch book copies";

    res.status(400).json({
      success: false,
      message,
    });
  }
};

export const getBookCopyController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    if (typeof id !== "string") {
      res.status(400).json({
        success: false,
        message: "Invalid book copy ID",
      });
      return;
    }

    const copy = await getBookCopyService(id);

    res.status(200).json({
      success: true,
      data: copy,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch book copy";

    res.status(404).json({
      success: false,
      message,
    });
  }
};

export const updateBookCopyController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    if (typeof id !== "string") {
      res.status(400).json({
        success: false,
        message: "Invalid book copy ID",
      });
      return;
    }

    const copy = await updateBookCopyService(
      id,
      req.body
    );

    res.status(200).json({
      success: true,
      message: "Book copy updated successfully",
      data: copy,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to update book copy";

    res.status(400).json({
      success: false,
      message,
    });
  }
};

export const deleteBookCopyController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    if (typeof id !== "string") {
      res.status(400).json({
        success: false,
        message: "Invalid book copy ID",
      });
      return;
    }

    const copy = await deleteBookCopyService(id);

    res.status(200).json({
      success: true,
      message: "Book copy deleted successfully",
      data: copy,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to delete book copy";

    res.status(400).json({
      success: false,
      message,
    });
  }
};