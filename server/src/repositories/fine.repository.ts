import mongoose from "mongoose";
import {
  Fine,
  IFine,
  FineStatus,
} from "../models/Fine.js";

export interface CreateFineData {
  issueId: string;
  memberId: string;
  bookId: string;

  amount: number;
  paidAmount?: number;

  daysOverdue: number;
  ratePerDay: number;

  status?: FineStatus;

  paymentMethod?: IFine["paymentMethod"];
  paidAt?: Date;
  paidBy?: string;

  waivedAt?: Date;
  waivedBy?: string;
  waiverReason?: string;

  notes?: string;
}

export interface UpdateFineData {
  amount?: number;
  paidAmount?: number;
  daysOverdue?: number;
  ratePerDay?: number;
  status?: FineStatus;

  paymentMethod?: IFine["paymentMethod"];
  paidAt?: Date;
  paidBy?: string;

  waivedAt?: Date;
  waivedBy?: string;
  waiverReason?: string;

  notes?: string;
}


/* =========================================================
   CREATE
========================================================= */

export const createFine = async (
  data: CreateFineData
): Promise<IFine> => {
  return Fine.create({
    issueId: new mongoose.Types.ObjectId(
      data.issueId
    ),

    memberId: new mongoose.Types.ObjectId(
      data.memberId
    ),

    bookId: new mongoose.Types.ObjectId(
      data.bookId
    ),

    amount: data.amount,
    paidAmount: data.paidAmount ?? 0,

    daysOverdue: data.daysOverdue,
    ratePerDay: data.ratePerDay,

    status: data.status ?? "UNPAID",

    paymentMethod:
      data.paymentMethod,

    paidAt:
      data.paidAt,

    paidBy:
      data.paidBy
        ? new mongoose.Types.ObjectId(data.paidBy)
        : undefined,

    waivedAt:
      data.waivedAt,

    waivedBy:
      data.waivedBy
        ? new mongoose.Types.ObjectId(data.waivedBy)
        : undefined,

    waiverReason:
      data.waiverReason,

    notes:
      data.notes,
  });
};


/* =========================================================
   LIST
========================================================= */

export const getFines = async () => {
  return Fine.find()
    .populate(
      "issueId"
    )
    .populate(
      "memberId"
    )
    .populate(
      "bookId"
    )
    .populate(
      "paidBy",
      "name email role"
    )
    .populate(
      "waivedBy",
      "name email role"
    )
    .sort({
      createdAt: -1,
    });
};


/* =========================================================
   GET BY ID
========================================================= */

export const getFineById = async (
  id: string
) => {
  if (
    !mongoose.Types.ObjectId.isValid(id)
  ) {
    return null;
  }

  return Fine.findById(id)
    .populate("issueId")
    .populate("memberId")
    .populate("bookId")
    .populate(
      "paidBy",
      "name email role"
    )
    .populate(
      "waivedBy",
      "name email role"
    );
};


/* =========================================================
   GET BY ISSUE
========================================================= */

export const getFineByIssueId = async (
  issueId: string
) => {
  if (
    !mongoose.Types.ObjectId.isValid(
      issueId
    )
  ) {
    return null;
  }

  return Fine.findOne({
    issueId,
  });
};


/* =========================================================
   MEMBER FINES
========================================================= */

export const getFinesByMemberId =
  async (
    memberId: string
  ) => {
    if (
      !mongoose.Types.ObjectId.isValid(
        memberId
      )
    ) {
      return [];
    }

    return Fine.find({
      memberId,
    })
      .populate("issueId")
      .populate("bookId")
      .sort({
        createdAt: -1,
      });
  };


/* =========================================================
   UPDATE
========================================================= */

export const updateFine = async (
  id: string,
  data: UpdateFineData
) => {
  if (
    !mongoose.Types.ObjectId.isValid(id)
  ) {
    return null;
  }

  return Fine.findByIdAndUpdate(
    id,
    {
      $set: data,
    },
    {
      new: true,
      runValidators: true,
    }
  );
};


/* =========================================================
   DELETE
========================================================= */

export const deleteFine = async (
  id: string
) => {
  if (
    !mongoose.Types.ObjectId.isValid(id)
  ) {
    return null;
  }

  return Fine.findByIdAndDelete(id);
};