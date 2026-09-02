import mongoose from "mongoose";
import {
  Issue,
  IIssue,
  IssueStatus,
} from "../models/Issue.js";

export interface CreateIssueData {
  bookId: string;
  bookCopyId: string;
  memberId: string;
  issuedBy: string;

  issuedAt?: Date;
  dueAt: Date;

  returnedAt?: Date;
  returnedBy?: string;

  status?: IssueStatus;

  renewalCount?: number;

  notes?: string;
}

export interface UpdateIssueData {
  dueAt?: Date;
  returnedAt?: Date;
  returnedBy?: string;

  status?: IssueStatus;

  renewalCount?: number;

  notes?: string;
}

export const createIssue = async (
  data: CreateIssueData
): Promise<IIssue> => {
  const issue = await Issue.create({
    bookId: new mongoose.Types.ObjectId(
      data.bookId
    ),

    bookCopyId: new mongoose.Types.ObjectId(
      data.bookCopyId
    ),

    memberId: new mongoose.Types.ObjectId(
      data.memberId
    ),

    issuedBy: new mongoose.Types.ObjectId(
      data.issuedBy
    ),

    issuedAt:
      data.issuedAt ?? new Date(),

    dueAt: data.dueAt,

    returnedAt:
      data.returnedAt,

    returnedBy:
      data.returnedBy
        ? new mongoose.Types.ObjectId(
            data.returnedBy
          )
        : undefined,

    status:
      data.status ?? "ISSUED",

    renewalCount:
      data.renewalCount ?? 0,

    notes: data.notes,
  });

  return issue;
};


/**
 * Get all issues
 */
export const getIssues = async (): Promise<
  IIssue[]
> => {
  return Issue.find()
    .populate(
      "bookId",
      "isbn title authors publisher category"
    )
    .populate(
      "bookCopyId",
      "accessionNumber barcode location status condition"
    )
    .populate(
      "memberId",
      "memberId name email phone department course year membershipType status"
    )
    .populate(
      "issuedBy",
      "name email role"
    )
    .populate(
      "returnedBy",
      "name email role"
    )
    .sort({
      createdAt: -1,
    });
};


/**
 * Get issue by ID
 */
export const getIssueById = async (
  id: string
): Promise<IIssue | null> => {
  if (
    !mongoose.Types.ObjectId.isValid(id)
  ) {
    return null;
  }

  return Issue.findById(id)
    .populate(
      "bookId",
      "isbn title authors publisher category"
    )
    .populate(
      "bookCopyId",
      "accessionNumber barcode location status condition"
    )
    .populate(
      "memberId",
      "memberId name email phone department course year membershipType status"
    )
    .populate(
      "issuedBy",
      "name email role"
    )
    .populate(
      "returnedBy",
      "name email role"
    );
};


/**
 * Get active issue for a book copy
 */
export const getActiveIssueByCopyId =
  async (
    bookCopyId: string
  ): Promise<IIssue | null> => {
    if (
      !mongoose.Types.ObjectId.isValid(
        bookCopyId
      )
    ) {
      return null;
    }

    return Issue.findOne({
      bookCopyId:
        new mongoose.Types.ObjectId(
          bookCopyId
        ),

      status: "ISSUED",
    });
  };


/**
 * Get active issues for a member
 */
export const getActiveIssuesByMemberId =
  async (
    memberId: string
  ): Promise<IIssue[]> => {
    if (
      !mongoose.Types.ObjectId.isValid(
        memberId
      )
    ) {
      return [];
    }

    return Issue.find({
      memberId:
        new mongoose.Types.ObjectId(
          memberId
        ),

      status: "ISSUED",
    })
      .populate(
        "bookId",
        "isbn title authors"
      )
      .populate(
        "bookCopyId",
        "accessionNumber barcode location status condition"
      )
      .sort({
        issuedAt: -1,
      });
  };


/**
 * Get all issues for a member
 */
export const getIssuesByMemberId =
  async (
    memberId: string
  ): Promise<IIssue[]> => {
    if (
      !mongoose.Types.ObjectId.isValid(
        memberId
      )
    ) {
      return [];
    }

    return Issue.find({
      memberId:
        new mongoose.Types.ObjectId(
          memberId
        ),
    })
      .populate(
        "bookId",
        "isbn title authors"
      )
      .populate(
        "bookCopyId",
        "accessionNumber barcode location status condition"
      )
      .populate(
        "issuedBy",
        "name email role"
      )
      .populate(
        "returnedBy",
        "name email role"
      )
      .sort({
        issuedAt: -1,
      });
  };


/**
 * Update issue
 */
export const updateIssue = async (
  id: string,
  data: UpdateIssueData
): Promise<IIssue | null> => {
  if (
    !mongoose.Types.ObjectId.isValid(id)
  ) {
    return null;
  }

  const updateData: Record<
    string,
    unknown
  > = {};

  if (data.dueAt !== undefined) {
    updateData.dueAt = data.dueAt;
  }

  if (
    data.returnedAt !== undefined
  ) {
    updateData.returnedAt =
      data.returnedAt;
  }

  if (
    data.returnedBy !== undefined
  ) {
    updateData.returnedBy =
      data.returnedBy
        ? new mongoose.Types.ObjectId(
            data.returnedBy
          )
        : undefined;
  }

  if (data.status !== undefined) {
    updateData.status = data.status;
  }

  if (
    data.renewalCount !== undefined
  ) {
    updateData.renewalCount =
      data.renewalCount;
  }

  if (data.notes !== undefined) {
    updateData.notes = data.notes;
  }

  return Issue.findByIdAndUpdate(
    id,
    updateData,
    {
      new: true,
      runValidators: true,
    }
  )
    .populate(
      "bookId",
      "isbn title authors"
    )
    .populate(
      "bookCopyId",
      "accessionNumber barcode location status condition"
    )
    .populate(
      "memberId",
      "memberId name email phone department course year membershipType status"
    )
    .populate(
      "issuedBy",
      "name email role"
    )
    .populate(
      "returnedBy",
      "name email role"
    );
};


/**
 * Delete issue
 */
export const deleteIssue = async (
  id: string
): Promise<IIssue | null> => {
  if (
    !mongoose.Types.ObjectId.isValid(id)
  ) {
    return null;
  }

  return Issue.findByIdAndDelete(id);
};