import Reservation, {
  IReservation,
  ReservationStatus,
} from "../models/Reservation.js";
import { Types } from "mongoose";
import { PaginatedResult, PaginationQuery } from "../types/pagination.js";
import { createPaginationMetadata, getPaginationOptions } from "../utils/pagination.js";
import { escapeRegex } from "../utils/search.js";

export interface CreateReservationData {
  bookId: string | Types.ObjectId;
  memberId: string | Types.ObjectId;
  reservedAt?: Date;
  expiresAt?: Date;
  fulfilledAt?: Date;
  cancelledAt?: Date;
  status?: ReservationStatus;
  queuePosition?: number;
  notes?: string;
}

export const createReservation = async (
  data: CreateReservationData
): Promise<IReservation> => {
  return Reservation.create(data);
};

export const getReservations = async (
  query: PaginationQuery,
  memberId?: string
): Promise<PaginatedResult<IReservation>> => {
  const filters: Record<string, unknown> = {};
  if (query.search) {
    filters.notes = new RegExp(escapeRegex(query.search), "i");
  }
  if (query.status) filters.status = query.status;
  if (query.bookId) filters.bookId = new Types.ObjectId(query.bookId);
  if (query.memberId) filters.memberId = new Types.ObjectId(query.memberId);
  if (memberId) filters.memberId = new Types.ObjectId(memberId);
  if (query.dateFrom || query.dateTo) {
    filters.reservedAt = {
      ...(query.dateFrom ? { $gte: new Date(query.dateFrom) } : {}),
      ...(query.dateTo ? { $lte: new Date(query.dateTo) } : {}),
    };
  }

  const { skip, limit, sort } = getPaginationOptions(query);
  const [items, total] = await Promise.all([
    Reservation.find(filters)
    .populate("bookId")
    .populate("memberId")
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .exec(),
    Reservation.countDocuments(filters).exec(),
  ]);

  return {
    items,
    pagination: createPaginationMetadata(query, total),
  };
};

export const getReservationById = async (
  id: string,
  session?: import("mongoose").ClientSession
): Promise<IReservation | null> => {
  return Reservation.findById(id)
    .populate("bookId")
    .populate("memberId")
    .session(session || null)
    .exec();
};

export const getReservationsByBook = async (
  bookId: string
): Promise<IReservation[]> => {
  return Reservation.find({
    bookId,
    status: { $in: ["WAITING", "READY"] },
  })
    .sort({ reservedAt: 1 })
    .exec();
};

export const getReservationsByMember = async (
  memberId: string
): Promise<IReservation[]> => {
  return Reservation.find({ memberId })
    .sort({ reservedAt: -1 })
    .exec();
};

export const getActiveReservation = async (
  bookId: string,
  memberId: string
): Promise<IReservation | null> => {
  return Reservation.findOne({
    bookId,
    memberId,
    status: { $in: ["WAITING", "READY"] },
  }).exec();
};

export const updateReservation = async (
  id: string,
  data: Partial<CreateReservationData>
): Promise<IReservation | null> => {
  return Reservation.findByIdAndUpdate(
    id,
    data,
    {
      returnDocument: "after",
      runValidators: true,
    }
  ).exec();
};

export const deleteReservation = async (
  id: string
): Promise<IReservation | null> => {
  return Reservation.findByIdAndDelete(id).exec();
};
