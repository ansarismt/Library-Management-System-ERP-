import mongoose, { Document, Schema } from "mongoose";

export interface IBookCopy extends Document {
  bookId: mongoose.Types.ObjectId;
  reservationId?: mongoose.Types.ObjectId;
  accessionNumber: string;
  barcode?: string;
  location?: string;
  status:
    | "AVAILABLE"
    | "ISSUED"
    | "RESERVED"
    | "LOST"
    | "DAMAGED"
    | "MAINTENANCE";
  condition: "NEW" | "GOOD" | "FAIR" | "POOR";
  acquiredAt?: Date;
  price?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const bookCopySchema = new Schema<IBookCopy>(
  {
    bookId: {
      type: Schema.Types.ObjectId,
      ref: "Book",
      required: true,
      index: true,
    },

    /*
     * Reservation that currently holds this physical copy.
     *
     * When a student reserves an available book:
     *
     * AVAILABLE
     *    ↓
     * RESERVED + reservationId
     *
     * This prevents the same physical copy from being
     * allocated to multiple reservations.
     */
    reservationId: {
      type: Schema.Types.ObjectId,
      ref: "Reservation",
      index: true,
    },

    accessionNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    barcode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      index: true,
    },

    location: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      enum: [
        "AVAILABLE",
        "ISSUED",
        "RESERVED",
        "LOST",
        "DAMAGED",
        "MAINTENANCE",
      ],
      default: "AVAILABLE",
      index: true,
    },

    condition: {
      type: String,
      enum: ["NEW", "GOOD", "FAIR", "POOR"],
      default: "GOOD",
    },

    acquiredAt: {
      type: Date,
    },

    price: {
      type: Number,
      min: 0,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
  }
);

/*
 * Existing indexes
 */
bookCopySchema.index({
  bookId: 1,
  status: 1,
  createdAt: -1,
});

bookCopySchema.index({
  status: 1,
  condition: 1,
  createdAt: -1,
});

/*
 * Reservation lookup index.
 *
 * Useful for finding the physical copy held for
 * a specific reservation during fulfillment.
 */
bookCopySchema.index({
  reservationId: 1,
  status: 1,
});

export const BookCopy = mongoose.model<IBookCopy>(
  "BookCopy",
  bookCopySchema
);