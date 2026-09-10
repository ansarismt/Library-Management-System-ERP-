import mongoose from "mongoose";
import { Book } from "../models/Book.js";
import { BookCopy } from "../models/BookCopy.js";
import { Issue } from "../models/Issue.js";
import { Member } from "../models/Member.js";
import { Fine } from "../models/Fine.js";
import Reservation from "../models/Reservation.js";

export interface ReportQuery {
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  category?: string;
  bookId?: string;
  memberId?: string;
}

const addDateRange = (
  match: Record<string, unknown>,
  field: string,
  query: ReportQuery
): void => {
  if (query.dateFrom || query.dateTo) {
    match[field] = {
      ...(query.dateFrom ? { $gte: new Date(query.dateFrom) } : {}),
      ...(query.dateTo ? { $lte: new Date(query.dateTo) } : {}),
    };
  }
};

const addObjectIdFilter = (
  match: Record<string, unknown>,
  field: string,
  value?: string
): void => {
  if (value) {
    match[field] = new mongoose.Types.ObjectId(value);
  }
};

const getBookMatch = (query: ReportQuery) => {
  const match: Record<string, unknown> = {};
  if (query.status) match.status = query.status;
  if (query.category) match.category = query.category;
  addObjectIdFilter(match, "_id", query.bookId);
  addDateRange(match, "createdAt", query);
  return match;
};

const getIssueMatch = (query: ReportQuery) => {
  const match: Record<string, unknown> = {};
  if (query.status) match.status = query.status;
  addObjectIdFilter(match, "bookId", query.bookId);
  addObjectIdFilter(match, "memberId", query.memberId);
  addDateRange(match, "issuedAt", query);
  return match;
};

const getFineMatch = (query: ReportQuery) => {
  const match: Record<string, unknown> = {};
  if (query.status) match.status = query.status;
  addObjectIdFilter(match, "bookId", query.bookId);
  addObjectIdFilter(match, "memberId", query.memberId);
  addDateRange(match, "createdAt", query);
  return match;
};

const getReservationMatch = (query: ReportQuery) => {
  const match: Record<string, unknown> = {};
  if (query.status) match.status = query.status;
  addObjectIdFilter(match, "bookId", query.bookId);
  addObjectIdFilter(match, "memberId", query.memberId);
  addDateRange(match, "reservedAt", query);
  return match;
};

export const getCirculationReport = async (query: ReportQuery) => {
  const match = getIssueMatch(query);
  const now = new Date();
  const [result] = await Issue.aggregate([
    { $match: match },
    {
      $facet: {
        totals: [
          {
            $group: {
              _id: null,
              totalIssues: { $sum: 1 },
              currentlyIssued: {
                $sum: { $cond: [{ $eq: ["$status", "ISSUED"] }, 1, 0] },
              },
              returned: {
                $sum: { $cond: [{ $eq: ["$status", "RETURNED"] }, 1, 0] },
              },
              overdue: {
                $sum: {
                  $cond: [
                    {
                      $or: [
                        { $eq: ["$status", "OVERDUE"] },
                        {
                          $and: [
                            { $eq: ["$status", "ISSUED"] },
                            { $lte: ["$dueAt", now] },
                          ],
                        },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
              lost: {
                $sum: { $cond: [{ $eq: ["$status", "LOST"] }, 1, 0] },
              },
            },
          },
        ],
        issueTrend: [
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$issuedAt" } },
              issues: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
          { $project: { _id: 0, date: "$_id", issues: 1 } },
        ],
        returnTrend: [
          { $match: { returnedAt: { $ne: null } } },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$returnedAt" } },
              returns: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
          { $project: { _id: 0, date: "$_id", returns: 1 } },
        ],
      },
    },
  ]);

  return {
    totals: result?.totals[0] ?? {
      totalIssues: 0,
      currentlyIssued: 0,
      returned: 0,
      overdue: 0,
      lost: 0,
    },
    trends: {
      issues: result?.issueTrend ?? [],
      returns: result?.returnTrend ?? [],
    },
  };
};

export const getBooksReport = async (query: ReportQuery) => {
  const bookMatch = getBookMatch(query);
  const copyMatch: Record<string, unknown> = {};
  if (query.bookId) copyMatch.bookId = new mongoose.Types.ObjectId(query.bookId);
  const joinedBookMatch: Record<string, unknown> = {};
  if (query.status) joinedBookMatch["book.status"] = query.status;
  if (query.category) joinedBookMatch["book.category"] = query.category;
  if (query.dateFrom || query.dateTo) {
    joinedBookMatch["book.createdAt"] = {
      ...(query.dateFrom ? { $gte: new Date(query.dateFrom) } : {}),
      ...(query.dateTo ? { $lte: new Date(query.dateTo) } : {}),
    };
  }

  const [bookResult, copyResult, circulation] = await Promise.all([
    Book.aggregate([
      { $match: bookMatch },
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: null,
                totalBooks: { $sum: 1 },
                totalCopies: { $sum: "$totalCopies" },
                availableCopies: { $sum: "$availableCopies" },
              },
            },
          ],
          categories: [
            {
              $group: {
                _id: { $ifNull: ["$category", "Uncategorized"] },
                books: { $sum: 1 },
                copies: { $sum: "$totalCopies" },
              },
            },
            { $sort: { books: -1, _id: 1 } },
            { $project: { _id: 0, category: "$_id", books: 1, copies: 1 } },
          ],
        },
      },
    ]),
    BookCopy.aggregate([
      { $match: copyMatch },
      {
        $lookup: {
          from: "books",
          localField: "bookId",
          foreignField: "_id",
          as: "book",
        },
      },
      { $unwind: "$book" },
      ...(Object.keys(joinedBookMatch).length > 0
        ? [{ $match: joinedBookMatch }]
        : []),
      {
        $group: {
          _id: null,
          issuedCopies: { $sum: { $cond: [{ $eq: ["$status", "ISSUED"] }, 1, 0] } },
          lostCopies: { $sum: { $cond: [{ $eq: ["$status", "LOST"] }, 1, 0] } },
          damagedCopies: { $sum: { $cond: [{ $eq: ["$status", "DAMAGED"] }, 1, 0] } },
        },
      },
    ]),
    Issue.aggregate([
      ...(query.dateFrom || query.dateTo ? [{ $match: getIssueMatch(query) }] : []),
      {
        $group: {
          _id: "$bookId",
          circulationCount: { $sum: 1 },
        },
      },
      { $sort: { circulationCount: -1 } },
      {
        $lookup: {
          from: "books",
          localField: "_id",
          foreignField: "_id",
          as: "book",
        },
      },
      { $unwind: "$book" },
      ...(query.category ? [{ $match: { "book.category": query.category } }] : []),
      {
        $project: {
          _id: 0,
          bookId: "$_id",
          title: "$book.title",
          isbn: "$book.isbn",
          circulationCount: 1,
        },
      },
    ]),
  ]);

  return {
    totals: bookResult[0]?.totals[0] ?? {
      totalBooks: 0,
      totalCopies: 0,
      availableCopies: 0,
    },
    copies: copyResult[0] ?? { issuedCopies: 0, lostCopies: 0, damagedCopies: 0 },
    categories: bookResult[0]?.categories ?? [],
    mostCirculated: circulation.slice(0, 10),
    leastCirculated: circulation.slice(-10).reverse(),
  };
};

export const getMembersReport = async (query: ReportQuery) => {
  const match: Record<string, unknown> = {};
  if (query.status) match.status = query.status;
  if (query.category) match.membershipType = query.category;
  addDateRange(match, "createdAt", query);
  const issueMatch: Record<string, unknown> = {};
  addDateRange(issueMatch, "issuedAt", query);

  const [memberResult, activeIssues, overdueIssues, borrowers] = await Promise.all([
    Member.aggregate([
      { $match: match },
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: null,
                totalMembers: { $sum: 1 },
                activeMembers: { $sum: { $cond: [{ $eq: ["$status", "ACTIVE"] }, 1, 0] } },
                inactiveMembers: { $sum: { $cond: [{ $ne: ["$status", "ACTIVE"] }, 1, 0] } },
              },
            },
          ],
          membershipTypes: [
            { $group: { _id: "$membershipType", count: { $sum: 1 } } },
            { $sort: { count: -1, _id: 1 } },
            { $project: { _id: 0, membershipType: "$_id", count: 1 } },
          ],
        },
      },
    ]),
    Issue.aggregate([
      { $match: { ...issueMatch, status: "ISSUED" } },
      { $group: { _id: "$memberId", activeIssues: { $sum: 1 } } },
      { $sort: { activeIssues: -1 } },
    ]),
    Issue.aggregate([
      { $match: { ...issueMatch, status: "ISSUED", dueAt: { $lte: new Date() } } },
      { $group: { _id: "$memberId", overdueIssues: { $sum: 1 } } },
      { $sort: { overdueIssues: -1 } },
    ]),
    Issue.aggregate([
      { $match: issueMatch },
      { $group: { _id: "$memberId", borrowCount: { $sum: 1 } } },
      { $sort: { borrowCount: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "members",
          localField: "_id",
          foreignField: "_id",
          as: "member",
        },
      },
      { $unwind: "$member" },
      { $project: { _id: 0, memberId: "$_id", memberNumber: "$member.memberId", name: "$member.name", borrowCount: 1 } },
    ]),
  ]);

  return {
    totals: memberResult[0]?.totals[0] ?? { totalMembers: 0, activeMembers: 0, inactiveMembers: 0 },
    membershipTypes: memberResult[0]?.membershipTypes ?? [],
    membersWithActiveIssues: activeIssues,
    membersWithOverdueIssues: overdueIssues,
    topBorrowers: borrowers,
  };
};

export const getFinesReport = async (query: ReportQuery) => {
  const match = getFineMatch(query);
  const [result] = await Fine.aggregate([
    { $match: match },
    {
      $facet: {
        totals: [
          {
            $group: {
              _id: null,
              totalFines: { $sum: 1 },
              totalAmount: { $sum: "$amount" },
              paidAmount: { $sum: "$paidAmount" },
              outstandingAmount: { $sum: { $max: [{ $subtract: ["$amount", "$paidAmount"] }, 0] } },
              waivedAmount: { $sum: { $cond: [{ $eq: ["$status", "WAIVED"] }, "$amount", 0] } },
            },
          },
        ],
        statuses: [
          { $group: { _id: "$status", count: { $sum: 1 }, amount: { $sum: "$amount" } } },
          { $sort: { _id: 1 } },
          { $project: { _id: 0, status: "$_id", count: 1, amount: 1 } },
        ],
        paymentMethods: [
          { $match: { paymentMethod: { $ne: null } } },
          { $group: { _id: "$paymentMethod", count: { $sum: 1 }, amount: { $sum: "$paidAmount" } } },
          { $sort: { count: -1 } },
          { $project: { _id: 0, paymentMethod: "$_id", count: 1, amount: 1 } },
        ],
        trend: [
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              fines: { $sum: 1 },
              amount: { $sum: "$amount" },
            },
          },
          { $sort: { _id: 1 } },
          { $project: { _id: 0, date: "$_id", fines: 1, amount: 1 } },
        ],
      },
    },
  ]);

  return {
    totals: result?.totals[0] ?? { totalFines: 0, totalAmount: 0, paidAmount: 0, outstandingAmount: 0, waivedAmount: 0 },
    statuses: result?.statuses ?? [],
    paymentMethods: result?.paymentMethods ?? [],
    trend: result?.trend ?? [],
  };
};

export const getReservationsReport = async (query: ReportQuery) => {
  const match = getReservationMatch(query);
  const [result] = await Reservation.aggregate([
    { $match: match },
    {
      $facet: {
        statuses: [
          { $group: { _id: "$status", count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
          { $project: { _id: 0, status: "$_id", count: 1 } },
        ],
        trend: [
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$reservedAt" } },
              reservations: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
          { $project: { _id: 0, date: "$_id", reservations: 1 } },
        ],
        queue: [
          { $match: { status: { $in: ["WAITING", "READY"] } } },
          {
            $group: {
              _id: null,
              activeReservations: { $sum: 1 },
              averageQueuePosition: { $avg: "$queuePosition" },
              maximumQueuePosition: { $max: "$queuePosition" },
            },
          },
        ],
      },
    },
  ]);

  return {
    statuses: result?.statuses ?? [],
    trend: result?.trend ?? [],
    queue: result?.queue[0] ?? {
      activeReservations: 0,
      averageQueuePosition: 0,
      maximumQueuePosition: 0,
    },
  };
};

export const getRecentDashboardActivity = async (
  query: ReportQuery,
  limit = 10
) => {
  const issueMatch = getIssueMatch(query);
  const reservationMatch = getReservationMatch(query);

  const [circulation, reservations] = await Promise.all([
    Issue.aggregate([
      { $match: issueMatch },
      { $sort: { issuedAt: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: "books",
          localField: "bookId",
          foreignField: "_id",
          as: "book",
        },
      },
      { $unwind: { path: "$book", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "members",
          localField: "memberId",
          foreignField: "_id",
          as: "member",
        },
      },
      { $unwind: { path: "$member", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          status: 1,
          issuedAt: 1,
          dueAt: 1,
          returnedAt: 1,
          book: { id: "$book._id", title: "$book.title", isbn: "$book.isbn" },
          member: { id: "$member._id", memberId: "$member.memberId", name: "$member.name" },
        },
      },
    ]),
    Reservation.aggregate([
      { $match: reservationMatch },
      { $sort: { reservedAt: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: "books",
          localField: "bookId",
          foreignField: "_id",
          as: "book",
        },
      },
      { $unwind: { path: "$book", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "members",
          localField: "memberId",
          foreignField: "_id",
          as: "member",
        },
      },
      { $unwind: { path: "$member", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          status: 1,
          reservedAt: 1,
          queuePosition: 1,
          expiresAt: 1,
          book: { id: "$book._id", title: "$book.title", isbn: "$book.isbn" },
          member: { id: "$member._id", memberId: "$member.memberId", name: "$member.name" },
        },
      },
    ]),
  ]);

  return { circulation, reservations };
};
