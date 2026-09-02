import mongoose from "mongoose";

import {
  createIssue,
  getIssues,
  getIssueById,
  getIssuesByMemberId,
  getActiveIssuesByMemberId,
  getActiveIssueByCopyId,
  updateIssue,
  deleteIssue,
  CreateIssueData,
  UpdateIssueData,
} from "../repositories/issue.repository.js";

import { Book } from "../models/Book.js";
import { BookCopy } from "../models/BookCopy.js";
import { Member } from "../models/Member.js";


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
========================================================= */

export const issueBookService = async (
  data: IssueBookData
) => {
  const {
    bookId,
    bookCopyId,
    memberId,
    issuedBy,
    dueAt,
    notes,
  } = data;

  if (
    !mongoose.Types.ObjectId.isValid(
      bookId
    )
  ) {
    throw new Error("Invalid book ID");
  }

  if (
    !mongoose.Types.ObjectId.isValid(
      bookCopyId
    )
  ) {
    throw new Error(
      "Invalid book copy ID"
    );
  }

  if (
    !mongoose.Types.ObjectId.isValid(
      memberId
    )
  ) {
    throw new Error(
      "Invalid member ID"
    );
  }

  if (
    !mongoose.Types.ObjectId.isValid(
      issuedBy
    )
  ) {
    throw new Error(
      "Invalid issuedBy user ID"
    );
  }

  if (!(dueAt instanceof Date)) {
    throw new Error(
      "Invalid due date"
    );
  }

  if (
    Number.isNaN(
      dueAt.getTime()
    )
  ) {
    throw new Error(
      "Invalid due date"
    );
  }

  if (
    dueAt <= new Date()
  ) {
    throw new Error(
      "Due date must be in the future"
    );
  }


  /* -------------------------------------------------------
     Check book
  ------------------------------------------------------- */

  const book =
    await Book.findById(bookId);

  if (!book) {
    throw new Error(
      "Book not found"
    );
  }


  /* -------------------------------------------------------
     Check book copy
  ------------------------------------------------------- */

  const bookCopy =
    await BookCopy.findById(
      bookCopyId
    );

  if (!bookCopy) {
    throw new Error(
      "Book copy not found"
    );
  }

  if (
    bookCopy.bookId.toString() !==
    bookId
  ) {
    throw new Error(
      "Book copy does not belong to this book"
    );
  }

  if (
    bookCopy.status !==
    "AVAILABLE"
  ) {
    throw new Error(
      `Book copy is not available. Current status: ${bookCopy.status}`
    );
  }


  /* -------------------------------------------------------
     Check member
  ------------------------------------------------------- */

  const member =
    await Member.findById(
      memberId
    );

  if (!member) {
    throw new Error(
      "Member not found"
    );
  }

  if (
    member.status !==
    "ACTIVE"
  ) {
    throw new Error(
      "Member is not active"
    );
  }


  /* -------------------------------------------------------
     Check existing issue
  ------------------------------------------------------- */

  const existingIssue =
    await getActiveIssueByCopyId(
      bookCopyId
    );

  if (existingIssue) {
    throw new Error(
      "This book copy is already issued"
    );
  }


  /* -------------------------------------------------------
     Create issue
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

  const issue =
    await createIssue(
      issueData
    );


  /* -------------------------------------------------------
     Update book copy
  ------------------------------------------------------- */

  await BookCopy.findByIdAndUpdate(
    bookCopyId,
    {
      $set: {
        status: "ISSUED",
      },
    }
  );


  /* -------------------------------------------------------
     Update book availability
  ------------------------------------------------------- */

  await Book.findByIdAndUpdate(
    bookId,
    {
      $inc: {
        availableCopies: -1,
      },
    }
  );


  return getIssueById(
    issue._id.toString()
  );
};


/* =========================================================
   LIST ALL ISSUES
========================================================= */

export const listIssuesService =
  async () => {
    return getIssues();
  };


/* =========================================================
   GET SINGLE ISSUE
========================================================= */

export const getIssueService =
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

export const returnBookService =
  async (
    issueId: string,
    data: ReturnBookData
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

    if (
      !mongoose.Types.ObjectId.isValid(
        data.returnedBy
      )
    ) {
      throw new Error(
        "Invalid returnedBy user ID"
      );
    }

    const issue =
      await getIssueById(
        issueId
      );

    if (!issue) {
      throw new Error(
        "Issue not found"
      );
    }

    if (
      issue.status !==
      "ISSUED"
    ) {
      throw new Error(
        `Book cannot be returned because issue status is ${issue.status}`
      );
    }


    const now =
      new Date();

    const updated =
      await updateIssue(
        issueId,
        {
          status:
            "RETURNED",

          returnedAt:
            now,

          returnedBy:
            data.returnedBy,

          notes:
            data.notes !== undefined
              ? data.notes
              : issue.notes,
        }
      );

    if (!updated) {
      throw new Error(
        "Failed to return book"
      );
    }


    /* -------------------------------------------------------
       Mark physical copy available
    ------------------------------------------------------- */

    await BookCopy.findByIdAndUpdate(
      issue.bookCopyId,
      {
        $set: {
          status:
            "AVAILABLE",
        },
      }
    );


    /* -------------------------------------------------------
       Increase book availability
    ------------------------------------------------------- */

    await Book.findByIdAndUpdate(
      issue.bookId,
      {
        $inc: {
          availableCopies: 1,
        },
      }
    );


    return getIssueById(
      issueId
    );
  };


/* =========================================================
   RENEW BOOK
========================================================= */

export const renewBookService =
  async (
    issueId: string,
    data: RenewBookData
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
      await getIssueById(
        issueId
      );

    if (!issue) {
      throw new Error(
        "Issue not found"
      );
    }

    if (
      issue.status !==
      "ISSUED"
    ) {
      throw new Error(
        "Only issued books can be renewed"
      );
    }


    let newDueAt: Date;


    /* -------------------------------------------------------
       Explicit dueAt
    ------------------------------------------------------- */

    if (data.dueAt) {
      newDueAt =
        new Date(
          data.dueAt
        );
    }


    /* -------------------------------------------------------
       Additional days
    ------------------------------------------------------- */

    else if (
      data.additionalDays !==
      undefined
    ) {
      if (
        !Number.isInteger(
          data.additionalDays
        ) ||
        data.additionalDays <= 0
      ) {
        throw new Error(
          "additionalDays must be a positive integer"
        );
      }

      newDueAt =
        new Date(
          issue.dueAt
        );

      newDueAt.setDate(
        newDueAt.getDate() +
          data.additionalDays
      );
    }

    else {
      throw new Error(
        "Provide additionalDays or dueAt"
      );
    }


    if (
      Number.isNaN(
        newDueAt.getTime()
      )
    ) {
      throw new Error(
        "Invalid new due date"
      );
    }

    if (
      newDueAt <= issue.dueAt
    ) {
      throw new Error(
        "New due date must be later than current due date"
      );
    }


    const updated =
      await updateIssue(
        issueId,
        {
          dueAt:
            newDueAt,

          renewalCount:
            issue.renewalCount + 1,

          status:
            "ISSUED",
        }
      );

    if (!updated) {
      throw new Error(
        "Failed to renew book"
      );
    }

    return getIssueById(
      issueId
    );
  };


/* =========================================================
   UPDATE ISSUE
========================================================= */

export const updateIssueService =
  async (
    id: string,
    data: UpdateIssueData
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


    if (
      data.renewalCount !==
      undefined
    ) {
      if (
        !Number.isInteger(
          data.renewalCount
        ) ||
        data.renewalCount < 0
      ) {
        throw new Error(
          "renewalCount must be a non-negative integer"
        );
      }
    }


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


    if (
      issue.status ===
      "ISSUED"
    ) {
      throw new Error(
        "Active issued records cannot be deleted"
      );
    }


    const deleted =
      await deleteIssue(id);

    if (!deleted) {
      throw new Error(
        "Failed to delete issue"
      );
    }

    return deleted;
  };