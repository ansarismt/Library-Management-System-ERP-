import mongoose, { Document, Schema, Types } from "mongoose";

export type ReservationStatus =
  | "WAITING"
  | "READY"
  | "FULFILLED"
  | "CANCELLED"
  | "EXPIRED";

export interface IReservation extends Document {
  bookId: Types.ObjectId;
  memberId: Types.ObjectId;
  reservedAt: Date;
  expiresAt?: Date;
  fulfilledAt?: Date;
  cancelledAt?: Date;
  status: ReservationStatus;
  queuePosition?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const reservationSchema = new Schema<IReservation>(
  {
    bookId: {
      type: Schema.Types.ObjectId,
      ref: "Book",
      required: true,
      index: true,
    },

    memberId: {
      type: Schema.Types.ObjectId,
      ref: "Member",
      required: true,
      index: true,
    },

    reservedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },

    expiresAt: {
      type: Date,
    },

    fulfilledAt: {
      type: Date,
    },

    cancelledAt: {
      type: Date,
    },

    status: {
      type: String,
      enum: [
        "WAITING",
        "READY",
        "FULFILLED",
        "CANCELLED",
        "EXPIRED",
      ],
      default: "WAITING",
      required: true,
      index: true,
    },

    queuePosition: {
      type: Number,
      min: 1,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

reservationSchema.index({
  bookId: 1,
  status: 1,
  reservedAt: 1,
});

reservationSchema.index({
  memberId: 1,
  status: 1,
});

reservationSchema.index({ status: 1, reservedAt: -1 });

const Reservation =
  mongoose.models.Reservation ||
  mongoose.model<IReservation>("Reservation", reservationSchema);

export default Reservation;