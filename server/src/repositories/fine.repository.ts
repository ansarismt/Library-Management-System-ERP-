import mongoose from "mongoose";
import {
  Fine,
  IFine,
  FineStatus,
} from "../models/Fine.js";
import { PaginatedResult, PaginationQuery } from "../types/pagination.js";
import { createPaginationMetadata, getPaginationOptions } from "../utils/pagination.js";

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
  data: CreateFineData,
  session?: mongoose.ClientSession
): Promise<IFine> => {
  const fines = await Fine.create(
    [
      {
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
      },
    ],
    {
      session,
    }
  );

  return fines[0];
};


/* =========================================================
   LIST
========================================================= */

export const getFines = async (
  query: PaginationQuery
): Promise<PaginatedResult<IFine>> => {
  const filters: Record<string, unknown> = {};

  if (query.status) filters.status = query.status;
  if (query.paymentMethod) filters.paymentMethod = query.paymentMethod;
  if (query.memberId) filters.memberId = new mongoose.Types.ObjectId(query.memberId);
  if (query.dateFrom || query.dateTo) {
    filters.createdAt = {
      ...(query.dateFrom ? { $gte: new Date(query.dateFrom) } : {}),
      ...(query.dateTo ? { $lte: new Date(query.dateTo) } : {}),
    };
  }

  const { skip, limit, sort } = getPaginationOptions(query);
  const [items, total] = await Promise.all([
    Fine.find(filters)
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
    )
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .exec(),
    Fine.countDocuments(filters).exec(),
  ]);

  return {
    items,
    pagination: createPaginationMetadata(query, total),
  };
};


/* =========================================================
   GET BY ID
========================================================= */

export const getFineById = async (
  id: string,
  session?: mongoose.ClientSession
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
    )
    .session(session || null);
};


/* =========================================================
   GET BY ISSUE
========================================================= */

export const getFineByIssueId = async (
  issueId: string,
  session?: mongoose.ClientSession
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
  }).session(session || null);
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
  data: UpdateFineData,
  session?: mongoose.ClientSession,
  expected?: Pick<UpdateFineData, "paidAmount" | "status">
) => {
  if (
    !mongoose.Types.ObjectId.isValid(id)
  ) {
    return null;
  }

  return Fine.findByIdAndUpdate(
    {
      _id: id,
      ...(expected?.paidAmount !== undefined
        ? { paidAmount: expected.paidAmount }
        : {}),
      ...(expected?.status !== undefined
        ? { status: expected.status }
        : {}),
    },
    {
      $set: data,
    },
    {
      returnDocument: "after",
      runValidators: true,
      session,
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