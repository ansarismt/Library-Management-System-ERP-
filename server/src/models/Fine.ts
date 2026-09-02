import mongoose, {
  Document,
  Schema,
} from "mongoose";

export type FineStatus =
  | "UNPAID"
  | "PAID"
  | "WAIVED"
  | "PARTIAL";

export type PaymentMethod =
  | "CASH"
  | "CARD"
  | "UPI"
  | "BANK_TRANSFER"
  | "ONLINE";

export interface IFine extends Document {
  issueId: mongoose.Types.ObjectId;
  memberId: mongoose.Types.ObjectId;
  bookId: mongoose.Types.ObjectId;

  amount: number;
  paidAmount: number;

  daysOverdue: number;
  ratePerDay: number;

  status: FineStatus;

  paymentMethod?: PaymentMethod;
  paidAt?: Date;
  paidBy?: mongoose.Types.ObjectId;

  waivedAt?: Date;
  waivedBy?: mongoose.Types.ObjectId;
  waiverReason?: string;

  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

const fineSchema = new Schema<IFine>(
  {
    issueId: {
      type: Schema.Types.ObjectId,
      ref: "Issue",
      required: true,
      unique: true,
      index: true,
    },

    memberId: {
      type: Schema.Types.ObjectId,
      ref: "Member",
      required: true,
      index: true,
    },

    bookId: {
      type: Schema.Types.ObjectId,
      ref: "Book",
      required: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    daysOverdue: {
      type: Number,
      required: true,
      min: 0,
    },

    ratePerDay: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      enum: [
        "UNPAID",
        "PAID",
        "WAIVED",
        "PARTIAL",
      ],
      default: "UNPAID",
      required: true,
      index: true,
    },

    paymentMethod: {
      type: String,
      enum: [
        "CASH",
        "CARD",
        "UPI",
        "BANK_TRANSFER",
        "ONLINE",
      ],
    },

    paidAt: {
      type: Date,
    },

    paidBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    waivedAt: {
      type: Date,
    },

    waivedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    waiverReason: {
      type: String,
      trim: true,
      maxlength: 1000,
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

export const Fine = mongoose.model<IFine>(
  "Fine",
  fineSchema
);