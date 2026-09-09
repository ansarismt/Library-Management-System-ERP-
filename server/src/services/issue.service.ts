import mongoose from "mongoose";
import { calculateFineService } from "./fine.service.js";

import {
  createIssue,
  getIssues,
  getIssueById,
  getIssuesByMemberId,
  getActiveIssuesByMemberId,
  getActiveIssueByCopyId,
  updateIssue,
  renewIssue,
  deleteIssue,
  CreateIssueData,
  UpdateIssueData,
} from "../repositories/issue.repository.js";

import { Book } from "../models/Book.js";
import { BookCopy } from "../models/BookCopy.js";
import { Member } from "../models/Member.js";

const MAX_RENEWALS = 2;

/* =========================================================
   TYPES
========================================================= */

export interface IssueBookData {
  bookId: string;
  bookCopyId: string;
  memberId: string;
  issuedBy: string;
  dueAt: Date;
  notes?: string;
}

export interface ReturnBookData {
  returnedBy: string;
  notes?: string;
}

export interface RenewBookData {
  additionalDays?: number;
  dueAt?: Date;
}

/* =========================================================
   ISSUE BOOK
   Transaction:
   1. Create Issue
   2. Mark BookCopy as ISSUED
   3. Decrease Book.availableCopies
   4. Commit
========================================================= */

export const issueBookService = async (
  data: IssueBookData,
  existingSession?: mongoose.ClientSession
) => {
  const {
    bookId,
    bookCopyId,
    memberId,
    issuedBy,
    dueAt,
    notes,
  } = data;

  /* -------------------------------------------------------
     VALIDATION
  ------------------------------------------------------- */

  if (!mongoose.Types.ObjectId.isValid(bookId)) {
    throw new Error("Invalid book ID");
  }

  if (!mongoose.Types.ObjectId.isValid(bookCopyId)) {
    throw new Error("Invalid book copy ID");
  }

  if (!mongoose.Types.ObjectId.isValid(memberId)) {
    throw new Error("Invalid member ID");
  }

  if (!mongoose.Types.ObjectId.isValid(issuedBy)) {
    throw new Error("Invalid issuedBy user ID");
  }

  if (!(dueAt instanceof Date) || Number.isNaN(dueAt.getTime())) {
    throw new Error("Invalid due date");
  }

  if (dueAt <= new Date()) {
    throw new Error("Due date must be in the future");
  }

  const session =
    existingSession ??
    await mongoose.startSession();
  const ownsSession = !existingSession;

  try {
    if (ownsSession) {
      session.startTransaction();
    }

  /* -------------------------------------------------------
     CHECK BOOK
  ------------------------------------------------------- */

  const book = await Book.findById(bookId).session(session);

  if (!book) {
    throw new Error("Book not found");
  }

  /* -------------------------------------------------------
     CHECK BOOK COPY
  ------------------------------------------------------- */

  const bookCopy = await BookCopy.findById(bookCopyId).session(session);

  if (!bookCopy) {
    throw new Error("Book copy not found");
  }

  if (bookCopy.bookId.toString() !== bookId) {
    throw new Error(
      "Book copy does not belong to the selected book"
    );
  }

  if (bookCopy.status !== "AVAILABLE") {
    throw new Error(
      `Book copy is not available. Current status: ${bookCopy.status}`
    );
  }

  /* -------------------------------------------------------
     CHECK MEMBER
  ------------------------------------------------------- */

  const member = await Member.findById(memberId).session(session);

  if (!member) {
    throw new Error("Member not found");
  }

  if (member.status !== "ACTIVE") {
    throw new Error(
      `Member is not active. Current status: ${member.status}`
    );
  }

  /* -------------------------------------------------------
     CHECK EXISTING ACTIVE ISSUE
  ------------------------------------------------------- */

  const activeIssue = await getActiveIssueByCopyId(
    bookCopyId,
    session
  );

  if (activeIssue) {
    throw new Error(
      "This book copy is already issued"
    );
  }

  /* -------------------------------------------------------
     CHECK BOOK AVAILABILITY
  ------------------------------------------------------- */

  if (book.availableCopies <= 0) {
    throw new Error(
      "Book has no available copies"
    );
  }

    /* -------------------------------------------------------
       CREATE ISSUE
    ------------------------------------------------------- */

    const issueData: CreateIssueData = {
      bookId,
      bookCopyId,
      memberId,
      issuedBy,
      dueAt,
      status: "ISSUED",
      notes,
    };

    const issue = await createIssue(
      issueData,
      session
    );

    if (!issue) {
      throw new Error(
        "Failed to create issue"
      );
    }

    /* -------------------------------------------------------
       UPDATE BOOK COPY
       AVAILABLE -> ISSUED

       The status condition protects against a race condition.
    ------------------------------------------------------- */

    const updatedBookCopy =
      await BookCopy.findOneAndUpdate(
        {
          _id: bookCopyId,
          status: "AVAILABLE",
        },
        {
          $set: {
            status: "ISSUED",
          },
        },
        {
          session,
          returnDocument: "after",
          runValidators: true,
        }
      );

    if (!updatedBookCopy) {
      throw new Error(
        "Book copy is no longer available"
      );
    }

    /* -------------------------------------------------------
       UPDATE BOOK
       availableCopies - 1

       $gt: 0 prevents negative availability.
    ------------------------------------------------------- */

    const updatedBook =
      await Book.findOneAndUpdate(
        {
          _id: bookId,
          availableCopies: {
            $gt: 0,
          },
        },
        {
          $inc: {
            availableCopies: -1,
          },
        },
        {
          session,
          returnDocument: "after",
          runValidators: true,
        }
      );

    if (!updatedBook) {
      throw new Error(
        "Book has no available copies"
      );
    }

    /* -------------------------------------------------------
       COMMIT TRANSACTION
    ------------------------------------------------------- */

    if (ownsSession) {
  await session.commitTransaction();
}

    /* -------------------------------------------------------
       GET FINAL POPULATED ISSUE
       Outside transaction after successful commit.
    ------------------------------------------------------- */

    if (existingSession) {
      return issue;
    }

    return await getIssueById(
      issue._id.toString()
    );

  } catch (error) {

    /* -------------------------------------------------------
       ROLLBACK
    ------------------------------------------------------- */

    if (ownsSession) {
  await session.abortTransaction();
}

    throw error;

  } finally {

    /* -------------------------------------------------------
       CLOSE SESSION
    ------------------------------------------------------- */

    if (ownsSession) {
  await session.endSession();
}
  }
};

/* =========================================================
   LIST ALL ISSUES
========================================================= */

export const listIssuesService = async (
  query: import("../types/pagination.js").PaginationQuery
) => {
  return getIssues(query);
};

/* =========================================================
   GET SINGLE ISSUE
========================================================= */

export const getIssueService = async (
  id: string
) => {
  if (
    !mongoose.Types.ObjectId.isValid(id)
  ) {
    throw new Error(
      "Invalid issue ID"
    );
  }

  const issue = await getIssueById(id);

  if (!issue) {
    throw new Error(
      "Issue not found"
    );
  }

  return issue;
};

/* =========================================================
   LIST MEMBER ISSUES
========================================================= */

export const listMemberIssuesService =
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

    return getIssuesByMemberId(
      memberId
    );
  };

/* =========================================================
   LIST ACTIVE MEMBER ISSUES
========================================================= */

export const listActiveMemberIssuesService =
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

    return getActiveIssuesByMemberId(
      memberId
    );
  };

/* =========================================================
   RETURN BOOK
========================================================= */

/* =========================================================
   RETURN BOOK
   Transaction:
   1. Issue -> RETURNED
   2. BookCopy -> AVAILABLE
   3. Increase Book.availableCopies
   4. Calculate/Create Fine
   5. Commit
========================================================= */

export const returnBookService =
  async (
    issueId: string,
    data: ReturnBookData
  ) => {
    /* -------------------------------------------------------
       VALIDATION
    ------------------------------------------------------- */

    if (
      !mongoose.Types.ObjectId.isValid(
        issueId
      )
    ) {
      throw new Error(
        "Invalid issue ID"
      );
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        data.returnedBy
      )
    ) {
      throw new Error(
        "Invalid returnedBy user ID"
      );
    }

    const session = await mongoose.startSession();

    try {
      session.startTransaction();

    /* -------------------------------------------------------
       GET ISSUE
    ------------------------------------------------------- */

    const issue =
      await getIssueById(
        issueId,
        session
      );

    if (!issue) {
      throw new Error(
        "Issue not found"
      );
    }

    if (
      issue.status !== "ISSUED"
    ) {
      throw new Error(
        `Book cannot be returned because issue status is ${issue.status}`
      );
    }

    const now = new Date();

      /* -------------------------------------------------------
         UPDATE ISSUE
         ISSUED -> RETURNED
      ------------------------------------------------------- */

      const updatedIssue =
        await updateIssue(
          issueId,
          {
            status: "RETURNED",

            returnedAt:
              now,

            returnedBy:
              data.returnedBy,

            notes:
              data.notes !== undefined
                ? data.notes
                : issue.notes,
          },
          session,
          "ISSUED"
        );

      if (!updatedIssue) {
        throw new Error(
          "Failed to return book"
        );
      }

      /* -------------------------------------------------------
         MARK PHYSICAL COPY AVAILABLE
         ISSUED -> AVAILABLE

         Status condition protects against inconsistent state.
      ------------------------------------------------------- */

      const updatedBookCopy =
        await BookCopy.findOneAndUpdate(
          {
            _id:
              issue.bookCopyId,
            status:
              "ISSUED",
          },
          {
            $set: {
              status:
                "AVAILABLE",
            },
          },
          {
            session,
            returnDocument: "after",
            runValidators: true,
          }
        );

      if (!updatedBookCopy) {
        throw new Error(
          "Book copy is not currently issued"
        );
      }

      /* -------------------------------------------------------
         INCREASE BOOK AVAILABILITY
         availableCopies + 1
      ------------------------------------------------------- */

      const updatedBook =
        await Book.findOneAndUpdate(
          {
            _id: issue.bookId,
            $expr: {
              $lt: ["$availableCopies", "$totalCopies"],
            },
          },
          {
            $inc: {
              availableCopies:
                1,
            },
          },
          {
            session,
            returnDocument: "after",
            runValidators: true,
          }
        );

      if (!updatedBook) {
        throw new Error(
          "Failed to update book availability"
        );
      }

      /* -------------------------------------------------------
         CALCULATE / CREATE FINE
         Uses the SAME transaction session.
      ------------------------------------------------------- */

      let fine = null;

      try {
        fine =
          await calculateFineService(
            issueId,
            session
          );
      } catch (error) {
        if (
          error instanceof Error &&
          error.message ===
            "No overdue fine applicable"
        ) {
          fine = null;
        } else {
          throw error;
        }
      }

      /* -------------------------------------------------------
         COMMIT TRANSACTION
      ------------------------------------------------------- */

      await session.commitTransaction();

      /* -------------------------------------------------------
         GET FINAL POPULATED ISSUE
         Outside transaction after successful commit.
      ------------------------------------------------------- */

      const finalIssue =
        await getIssueById(
          issueId
        );

      return {
        issue:
          finalIssue,
        fine,
      };

    } catch (error) {

      /* -------------------------------------------------------
         ROLLBACK
      ------------------------------------------------------- */

      await session.abortTransaction();

      throw error;

    } finally {

      /* -------------------------------------------------------
         CLOSE SESSION
      ------------------------------------------------------- */

      await session.endSession();
    }
  };
/* =========================================================
   RENEW BOOK
========================================================= */

export const renewBookService = async (
  issueId: string,
  data: RenewBookData
) => {
  if (!mongoose.Types.ObjectId.isValid(issueId)) {
    throw new Error("Invalid issue ID");
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const issue = await getIssueById(issueId, session);

    if (!issue) {
      throw new Error("Issue not found");
    }

    if (issue.status !== "ISSUED") {
      throw new Error("Only issued books can be renewed");
    }

    if (issue.renewalCount >= MAX_RENEWALS) {
      throw new Error(
        `Maximum renewal limit of ${MAX_RENEWALS} reached`
      );
    }

  let newDueAt: Date;

  if (data.dueAt) {
    newDueAt = new Date(data.dueAt);
  } else if (data.additionalDays !== undefined) {
    if (
      !Number.isInteger(data.additionalDays) ||
      data.additionalDays <= 0
    ) {
      throw new Error(
        "additionalDays must be a positive integer"
      );
    }

    newDueAt = new Date(issue.dueAt);
    newDueAt.setDate(
      newDueAt.getDate() + data.additionalDays
    );
  } else {
    throw new Error("Provide additionalDays or dueAt");
  }

  if (Number.isNaN(newDueAt.getTime())) {
    throw new Error("Invalid new due date");
  }

  if (newDueAt <= issue.dueAt) {
    throw new Error(
      "New due date must be later than current due date"
    );
  }

    const updatedIssue = await renewIssue(
      issueId,
      newDueAt,
      MAX_RENEWALS,
      session
    );

    if (!updatedIssue) {
      throw new Error(
        "Renewal failed. Issue may have already been renewed or maximum renewal limit reached"
      );
    }

    await session.commitTransaction();

    return getIssueById(issueId);
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
};
/* =========================================================
   UPDATE ISSUE
========================================================= */

export const updateIssueService =
  async (
    id: string,
    data: Pick<UpdateIssueData, "dueAt" | "notes">
  ) => {
    if (
      !mongoose.Types.ObjectId.isValid(
        id
      )
    ) {
      throw new Error(
        "Invalid issue ID"
      );
    }

    const existing =
      await getIssueById(id);

    if (!existing) {
      throw new Error(
        "Issue not found"
      );
    }

    /* -------------------------------------------------------
       DUE DATE VALIDATION
    ------------------------------------------------------- */

    if (
      data.dueAt !== undefined
    ) {
      if (
        Number.isNaN(
          data.dueAt.getTime()
        )
      ) {
        throw new Error(
          "Invalid due date"
        );
      }
    }

    /* -------------------------------------------------------
       UPDATE
    ------------------------------------------------------- */

    const updated =
      await updateIssue(
        id,
        data
      );

    if (!updated) {
      throw new Error(
        "Failed to update issue"
      );
    }

    return updated;
  };

/* =========================================================
   DELETE ISSUE
========================================================= */

export const deleteIssueService =
  async (
    id: string
  ) => {
    if (
      !mongoose.Types.ObjectId.isValid(
        id
      )
    ) {
      throw new Error(
        "Invalid issue ID"
      );
    }

    const issue =
      await getIssueById(id);

    if (!issue) {
      throw new Error(
        "Issue not found"
      );
    }

    /* -------------------------------------------------------
       PROTECT ACTIVE ISSUES
    ------------------------------------------------------- */

    if (issue.status !== "RETURNED") {
      throw new Error(
        "Only returned issue records can be deleted"
      );
    }

    /* -------------------------------------------------------
       DELETE
    ------------------------------------------------------- */

    const deleted =
      await deleteIssue(id);

    if (!deleted) {
      throw new Error(
        "Failed to delete issue"
      );
    }

    return deleted;
  };