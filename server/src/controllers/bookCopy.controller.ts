import { Request, Response } from "express";

import {
  createBookCopyService,
  listBookCopiesService,
  listBookCopiesByBookService,
  getBookCopyService,
  updateBookCopyService,
  deleteBookCopyService,
} from "../services/bookCopy.service.js";
import { AUDIT_ACTIONS } from "../constants/auditActions.js";
import { auditRequest } from "../services/audit.service.js";

export const createBookCopyController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const copy = await createBookCopyService(req.body);

    await auditRequest(req, {
      action: AUDIT_ACTIONS.BOOK_COPY_CREATED,
      resourceType: "BOOK_COPY",
      resourceId: copy._id.toString(),
      description: "Book copy created",
      after: {
        bookId: copy.bookId,
        accessionNumber: copy.accessionNumber,
        barcode: copy.barcode,
        status: copy.status,
        condition: copy.condition,
      },
      success: true,
      statusCode: 201,
    });

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
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const copies = await listBookCopiesService(req.query as never);

    res.status(200).json({
      success: true,
      data: copies.items,
      pagination: copies.pagination,
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
      await listBookCopiesByBookService(bookId, req.query as never);

    res.status(200).json({
      success: true,
      data: copies.items,
      pagination: copies.pagination,
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

    const beforeCopy = await getBookCopyService(id);
    const copy = await updateBookCopyService(
      id,
      req.body
    );

    await auditRequest(req, {
      action: AUDIT_ACTIONS.BOOK_COPY_UPDATED,
      resourceType: "BOOK_COPY",
      resourceId: id,
      description: "Book copy updated",
      before: {
        bookId: beforeCopy.bookId,
        accessionNumber: beforeCopy.accessionNumber,
        barcode: beforeCopy.barcode,
        status: beforeCopy.status,
        condition: beforeCopy.condition,
      },
      after: copy ? {
        bookId: copy.bookId,
        accessionNumber: copy.accessionNumber,
        barcode: copy.barcode,
        status: copy.status,
        condition: copy.condition,
      } : undefined,
      success: true,
      statusCode: 200,
    });

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

    await auditRequest(req, {
      action: AUDIT_ACTIONS.BOOK_COPY_DELETED,
      resourceType: "BOOK_COPY",
      resourceId: id,
      description: "Book copy deleted",
      before: copy ? {
        bookId: copy.bookId,
        accessionNumber: copy.accessionNumber,
        barcode: copy.barcode,
        status: copy.status,
        condition: copy.condition,
      } : undefined,
      success: true,
      statusCode: 200,
    });

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