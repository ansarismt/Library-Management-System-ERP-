import mongoose from "mongoose";
import {
  createBookCopy,
  getBookCopies,
  getBookCopiesByBookId,
  getBookCopyById,
  getBookCopyByAccessionNumber,
  updateBookCopy,
  deleteBookCopy,
} from "../repositories/bookCopy.repository.js";
import { Book } from "../models/Book.js";

export const createBookCopyService = async (data: {
  bookId: string;
  accessionNumber: string;
  barcode?: string;
  location?: string;
  status?: "AVAILABLE" | "ISSUED" | "RESERVED" | "LOST" | "DAMAGED" | "MAINTENANCE";
  condition?: "NEW" | "GOOD" | "FAIR" | "POOR";
  acquiredAt?: Date;
  price?: number;
  notes?: string;
}) => {
  if (!mongoose.Types.ObjectId.isValid(data.bookId)) {
    throw new Error("Invalid book ID");
  }

  const book = await Book.findById(data.bookId);

  if (!book) {
    throw new Error("Book not found");
  }

  const existingCopy = await getBookCopyByAccessionNumber(
    data.accessionNumber
  );

  if (existingCopy) {
    throw new Error("Accession number already exists");
  }

  const copy = await createBookCopy(data);

  await Book.findByIdAndUpdate(data.bookId, {
    $inc: {
      totalCopies: 1,
      ...(copy.status === "AVAILABLE"
        ? { availableCopies: 1 }
        : {}),
    },
  });

  return copy;
};

export const listBookCopiesService = async () => {
  return getBookCopies();
};

export const listBookCopiesByBookService = async (
  bookId: string
) => {
  if (!mongoose.Types.ObjectId.isValid(bookId)) {
    throw new Error("Invalid book ID");
  }

  const book = await Book.findById(bookId);

  if (!book) {
    throw new Error("Book not found");
  }

  return getBookCopiesByBookId(bookId);
};

export const getBookCopyService = async (
  id: string
) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid book copy ID");
  }

  const copy = await getBookCopyById(id);

  if (!copy) {
    throw new Error("Book copy not found");
  }

  return copy;
};

export const updateBookCopyService = async (
  id: string,
  data: {
    location?: string;
    status?: "AVAILABLE" | "ISSUED" | "RESERVED" | "LOST" | "DAMAGED" | "MAINTENANCE";
    condition?: "NEW" | "GOOD" | "FAIR" | "POOR";
    notes?: string;
    price?: number;
  }
) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid book copy ID");
  }

  const existingCopy = await getBookCopyById(id);

  if (!existingCopy) {
    throw new Error("Book copy not found");
  }

  const oldStatus = existingCopy.status;

  const updatedCopy = await updateBookCopy(id, data);

  if (!updatedCopy) {
    throw new Error("Failed to update book copy");
  }

  const newStatus = updatedCopy.status;

  if (oldStatus !== newStatus) {
    const wasAvailable = oldStatus === "AVAILABLE";
    const isAvailable = newStatus === "AVAILABLE";

    if (wasAvailable && !isAvailable) {
      await Book.findByIdAndUpdate(existingCopy.bookId, {
        $inc: { availableCopies: -1 },
      });
    }

    if (!wasAvailable && isAvailable) {
      await Book.findByIdAndUpdate(existingCopy.bookId, {
        $inc: { availableCopies: 1 },
      });
    }
  }

  return updatedCopy;
};

export const deleteBookCopyService = async (
  id: string
) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid book copy ID");
  }

  const copy = await getBookCopyById(id);

  if (!copy) {
    throw new Error("Book copy not found");
  }

  if (copy.status === "ISSUED") {
    throw new Error(
      "Issued book copies cannot be deleted"
    );
  }

  const deletedCopy = await deleteBookCopy(id);

  if (!deletedCopy) {
    throw new Error("Failed to delete book copy");
  }

  await Book.findByIdAndUpdate(copy.bookId, {
    $inc: {
      totalCopies: -1,
      ...(copy.status === "AVAILABLE"
        ? { availableCopies: -1 }
        : {}),
    },
  });

  return deletedCopy;
};