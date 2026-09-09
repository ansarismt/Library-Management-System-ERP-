import mongoose from "mongoose";
import { PaginatedResult, PaginationQuery } from "../types/pagination.js";
import { createPaginationMetadata, getPaginationOptions } from "../utils/pagination.js";
import { escapeRegex } from "../utils/search.js";
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

/**
 * Create issue
 */
export const createIssue = async (
  data: CreateIssueData,
  session?: mongoose.ClientSession
): Promise<IIssue> => {
  const issues = await Issue.create(
    [
      {
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
      },
    ],
    { session }
  );

  return issues[0];
};


/**
 * Get all issues
 */
export const getIssues = async (
  query: PaginationQuery
): Promise<PaginatedResult<IIssue>> => {
  const filters: Record<string, unknown> = {};

  if (query.search) {
    filters.notes = new RegExp(escapeRegex(query.search), "i");
  }
  if (query.status) filters.status = query.status;
  if (query.bookId) filters.bookId = new mongoose.Types.ObjectId(query.bookId);
  if (query.memberId) filters.memberId = new mongoose.Types.ObjectId(query.memberId);
  if (query.dateFrom || query.dateTo) {
    filters.issuedAt = {
      ...(query.dateFrom ? { $gte: new Date(query.dateFrom) } : {}),
      ...(query.dateTo ? { $lte: new Date(query.dateTo) } : {}),
    };
  }

  const { skip, limit, sort } = getPaginationOptions(query);
  const [items, total] = await Promise.all([
    Issue.find(filters)
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
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .exec(),
    Issue.countDocuments(filters).exec(),
  ]);

  return {
    items,
    pagination: createPaginationMetadata(query, total),
  };
};


/**
 * Get issue by ID
 */
export const getIssueById = async (
  id: string,
  session?: mongoose.ClientSession
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
    )
    .session(session || null);
};


/**
 * Get active issue for a book copy
 */
export const getActiveIssueByCopyId =
  async (
    bookCopyId: string,
    session?: mongoose.ClientSession
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
    }).session(session || null);
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
  data: UpdateIssueData,
  session?: mongoose.ClientSession,
  expectedStatus?: IssueStatus
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

  return Issue.findOneAndUpdate(
    {
      _id: id,
      ...(expectedStatus ? { status: expectedStatus } : {}),
    },
    updateData,
    {
      returnDocument: "after",
      runValidators: true,
      session,
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
 * Renew issue atomically
 *
 * Updates the issue only when:
 * - issue ID matches
 * - status is still ISSUED
 * - renewalCount is below the maximum
 */
export const renewIssue = async (
  id: string,
  newDueAt: Date,
  maxRenewals: number,
  session?: mongoose.ClientSession
): Promise<IIssue | null> => {
  if (
    !mongoose.Types.ObjectId.isValid(id)
  ) {
    return null;
  }

  return Issue.findOneAndUpdate(
    {
      _id: id,
      status: "ISSUED",
      renewalCount: {
        $lt: maxRenewals,
      },
    },
    {
      $set: {
        dueAt: newDueAt,
        status: "ISSUED",
      },
      $inc: {
        renewalCount: 1,
      },
    },
    {
      returnDocument: "after",
      runValidators: true,
      session,
    }
  )
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