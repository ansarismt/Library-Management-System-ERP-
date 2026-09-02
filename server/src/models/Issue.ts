import mongoose, {
  Document,
  Schema,
} from "mongoose";

export type IssueStatus =
  | "ISSUED"
  | "RETURNED"
  | "OVERDUE"
  | "LOST";

export interface IIssue extends Document {
  bookId: mongoose.Types.ObjectId;
  bookCopyId: mongoose.Types.ObjectId;
  memberId: mongoose.Types.ObjectId;
  issuedBy: mongoose.Types.ObjectId;

  issuedAt: Date;
  dueAt: Date;

  returnedAt?: Date;
  returnedBy?: mongoose.Types.ObjectId;

  status: IssueStatus;

  renewalCount: number;

  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

const issueSchema = new Schema<IIssue>(
  {
    bookId: {
      type: Schema.Types.ObjectId,
      ref: "Book",
      required: true,
      index: true,
    },

    bookCopyId: {
      type: Schema.Types.ObjectId,
      ref: "BookCopy",
      required: true,
      index: true,
    },

    memberId: {
      type: Schema.Types.ObjectId,
      ref: "Member",
      required: true,
      index: true,
    },

    issuedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    issuedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },

    dueAt: {
      type: Date,
      required: true,
      index: true,
    },

    returnedAt: {
      type: Date,
    },

    returnedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    status: {
      type: String,
      enum: [
        "ISSUED",
        "RETURNED",
        "OVERDUE",
        "LOST",
      ],
      default: "ISSUED",
      required: true,
      index: true,
    },

    renewalCount: {
      type: Number,
      default: 0,
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

export const Issue = mongoose.model<IIssue>(
  "Issue",
  issueSchema
);