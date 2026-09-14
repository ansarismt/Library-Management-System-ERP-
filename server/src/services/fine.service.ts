import mongoose from "mongoose";

import {
  createFine,
  getFines,
  getFineById,
  getFineByIssueId,
  getFinesByMemberId,
  updateFine,
  deleteFine,
} from "../repositories/fine.repository.js";

import { Issue } from "../models/Issue.js";
import { Member } from "../models/Member.js";
import { notifyMemberEvent } from "./notification.service.js";



/* =========================================================
   CONFIGURATION
========================================================= */

const DEFAULT_FINE_RATE_PER_DAY =
  Number(
    process.env.FINE_RATE_PER_DAY
  ) || 5;


/* =========================================================
   CALCULATE OVERDUE
========================================================= */

const calculateDaysOverdue = (
  dueAt: Date,
  endDate: Date = new Date()
): number => {
  const difference =
    endDate.getTime() -
    dueAt.getTime();

  if (difference <= 0) {
    return 0;
  }

  return Math.ceil(
    difference /
      (1000 * 60 * 60 * 24)
  );
};


/* =========================================================
   CALCULATE FINE
========================================================= */

export const calculateFineService =
  async (
    issueId: string,
    session?: mongoose.ClientSession
  ) => {
    if (
      !mongoose.Types.ObjectId.isValid(
        issueId
      )
    ) {
      throw new Error(
        "Invalid issue ID"
      );
    }

    const issue =
  await Issue.findById(
    issueId
  ).session(session || null);

    if (!issue) {
      throw new Error(
        "Issue not found"
      );
    }

    const member =
  await Member.findById(
    issue.memberId
  ).session(session || null);

    if (!member) {
      throw new Error(
        "Member not found"
      );
    }

    const endDate =
      issue.returnedAt ||
      new Date();

    const daysOverdue = calculateDaysOverdue(issue.dueAt, endDate);

if (daysOverdue <= 0) {
  return null;
}

    const amount =
      daysOverdue *
      DEFAULT_FINE_RATE_PER_DAY;

    const existingFine =
  await getFineByIssueId(
    issueId,
    session
  );

    if (existingFine) {
      const updated =
  await updateFine(
    existingFine._id.toString(),
    {
      amount,
      daysOverdue,
      ratePerDay:
        DEFAULT_FINE_RATE_PER_DAY,
    },
    session
  );

      return updated;
    }

    const fine =
  await createFine(
    {
      issueId,
      memberId:
        issue.memberId.toString(),
      bookId:
        issue.bookId.toString(),

      amount,

      daysOverdue,

      ratePerDay:
        DEFAULT_FINE_RATE_PER_DAY,

      status:
        "UNPAID",
    },
    session
  );

    if (session) {
      return fine;
    }

    const result = await getFineById(fine._id.toString());
    await notifyMemberEvent(issue.memberId.toString(), "FINE_CREATED", "Fine created", `A fine of ${amount} has been added to your account.`, "FINE", fine._id.toString());
    return result;
  };


/* =========================================================
   LIST FINES
========================================================= */

export const listFinesService =
  async (query: import("../types/pagination.js").PaginationQuery) => {
    return getFines(query);
  };


/* =========================================================
   GET FINE
========================================================= */

export const getFineService =
  async (
    id: string
  ) => {
    if (
      !mongoose.Types.ObjectId.isValid(
        id
      )
    ) {
      throw new Error(
        "Invalid fine ID"
      );
    }

    const fine =
      await getFineById(id);

    if (!fine) {
      throw new Error(
        "Fine not found"
      );
    }

    return fine;
  };


/* =========================================================
   MEMBER FINES
========================================================= */

export const listMemberFinesService =
  async (
    memberId: string
  ) => {
    if (
      !mongoose.Types.ObjectId.isValid(
        memberId
      )
    ) {
      throw new Error(
        "Invalid member ID"
      );
    }

    const member =
      await Member.findById(
        memberId
      );

    if (!member) {
      throw new Error(
        "Member not found"
      );
    }

    return getFinesByMemberId(
      memberId
    );
  };


/* =========================================================
   PAY FINE
========================================================= */

export const payFineService =
  async (
    fineId: string,
    data: {
      amount: number;
      paymentMethod: string;
      paidBy: string;
    }
  ) => {
    if (
      !mongoose.Types.ObjectId.isValid(
        fineId
      )
    ) {
      throw new Error(
        "Invalid fine ID"
      );
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        data.paidBy
      )
    ) {
      throw new Error(
        "Invalid paidBy user ID"
      );
    }

    if (
      !Number.isFinite(data.amount) ||
      data.amount <= 0
    ) {
      throw new Error(
        "Payment amount must be greater than zero"
      );
    }

    const session =
      await mongoose.startSession();

    try {
      let updatedFine;

      await session.withTransaction(
        async () => {
          const fine =
            await getFineById(
              fineId,
              session
            );

          if (!fine) {
            throw new Error(
              "Fine not found"
            );
          }

          if (
            fine.status === "PAID"
          ) {
            throw new Error(
              "Fine is already fully paid"
            );
          }

          if (
            fine.status === "WAIVED"
          ) {
            throw new Error(
              "Waived fine cannot be paid"
            );
          }

          const remaining =
            fine.amount -
            fine.paidAmount;

          if (
            data.amount > remaining
          ) {
            throw new Error(
              `Payment exceeds remaining fine amount of ${remaining}`
            );
          }

          const newPaidAmount =
            fine.paidAmount +
            data.amount;

          const newStatus =
            newPaidAmount >= fine.amount
              ? "PAID"
              : "PARTIAL";

          updatedFine =
            await updateFine(
              fineId,
              {
                paidAmount:
                  newPaidAmount,

                status:
                  newStatus,

                paymentMethod:
                  data.paymentMethod as any,

                paidAt:
                  new Date(),

                paidBy:
                  data.paidBy,
              },
              session,
              {
                paidAmount: fine.paidAmount,
                status: fine.status,
              }
            );

          if (!updatedFine) {
            throw new Error(
              "Failed to record payment"
            );
          }
        }
      );

      const result = await getFineById(fineId);
      if (result?.status === "PAID") await notifyMemberEvent(result.memberId.toString(), "FINE_PAID", "Fine paid", "Your fine payment has been completed.", "FINE", fineId);
      return result;
    } finally {
      await session.endSession();
    }
  };


/* =========================================================
   WAIVE FINE
========================================================= */

export const waiveFineService =
  async (
    fineId: string,
    data: {
      waivedBy: string;
      reason: string;
    }
  ) => {
    if (
      !mongoose.Types.ObjectId.isValid(
        fineId
      )
    ) {
      throw new Error(
        "Invalid fine ID"
      );
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        data.waivedBy
      )
    ) {
      throw new Error(
        "Invalid waivedBy user ID"
      );
    }

    if (!data.reason?.trim()) {
      throw new Error(
        "Waiver reason is required"
      );
    }

    const fine =
      await getFineById(
        fineId
      );

    if (!fine) {
      throw new Error(
        "Fine not found"
      );
    }

    if (
      fine.status === "PAID"
    ) {
      throw new Error(
        "Paid fine cannot be waived"
      );
    }

    if (
      fine.status === "WAIVED"
    ) {
      throw new Error(
        "Fine is already waived"
      );
    }

    const updated =
      await updateFine(
        fineId,
        {
          status: "WAIVED",

          waivedAt:
            new Date(),

          waivedBy:
            data.waivedBy,

          waiverReason:
            data.reason.trim(),
        }
      );

    if (!updated) {
      throw new Error(
        "Failed to waive fine"
      );
    }

    const result = await getFineById(fineId);
    if (result) await notifyMemberEvent(result.memberId.toString(), "FINE_WAIVED", "Fine waived", "Your fine has been waived.", "FINE", fineId);
    return result;
  };


/* =========================================================
   DELETE
========================================================= */

export const deleteFineService =
  async (
    id: string
  ) => {
    const fine =
      await getFineService(id);

    if (
      fine.status === "PAID"
    ) {
      throw new Error(
        "Paid fines cannot be deleted"
      );
    }

    const deleted =
      await deleteFine(id);

    if (!deleted) {
      throw new Error(
        "Failed to delete fine"
      );
    }

    return deleted;
  };
