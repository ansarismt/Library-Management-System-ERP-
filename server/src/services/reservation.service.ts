import mongoose from "mongoose";
import Reservation from "../models/Reservation.js";

import {
  createReservation,
  getReservations,
  getReservationById,
  getReservationsByBook,
  getReservationsByMember,
  getActiveReservation,
  updateReservation,
  deleteReservation,
} from "../repositories/reservation.repository.js";

import { Book } from "../models/Book.js";
import { Member } from "../models/Member.js";
import { User } from "../models/User.js";
import { Role, ROLES } from "../constants/roles.js";

import {
  issueBookService,
} from "./issue.service.js";

import {
  getAvailableBookCopyByBookId,
} from "../repositories/bookCopy.repository.js";

import {
  getIssueById,
} from "../repositories/issue.repository.js";

/* =========================================================
   TYPES
========================================================= */

export interface CreateReservationServiceData {
  bookId: string;
  memberId: string;
  expiresAt?: Date;
  notes?: string;
}

export interface UpdateReservationServiceData {
  expiresAt?: Date;
  notes?: string;
}

export interface FulfillReservationServiceData {
  issuedBy: string;
  dueAt: Date;
  notes?: string;
}

export interface ReservationActor {
  userId: string;
  role: Role;
}

const RESERVATION_ADMIN_ROLES = new Set<Role>([
  ROLES.SUPER_ADMIN,
  ROLES.LIBRARY_ADMIN,
  ROLES.LIBRARIAN,
  ROLES.ASSISTANT_LIBRARIAN,
]);

export class ReservationAuthorizationError extends Error {
  readonly statusCode = 403;

  constructor() {
    super("You can only access your own reservations");
    this.name = "ReservationAuthorizationError";
  }
}

const isReservationAdministrator = (
  actor: ReservationActor
): boolean => RESERVATION_ADMIN_ROLES.has(actor.role);

const getActorMemberId = async (
  actor: ReservationActor
): Promise<string> => {
  const user = await User.findById(actor.userId)
    .select("memberId")
    .lean()
    .exec();

  if (!user?.memberId) {
    throw new ReservationAuthorizationError();
  }

  if (mongoose.Types.ObjectId.isValid(user.memberId)) {
    return user.memberId;
  }

  const member = await Member.findOne({
    memberId: user.memberId,
  })
    .select("_id")
    .lean()
    .exec();

  if (!member) {
    throw new ReservationAuthorizationError();
  }

  return member._id.toString();
};

const getReservationMemberId = (
  value: unknown
): string => {
  if (value instanceof mongoose.Types.ObjectId) {
    return value.toString();
  }

  if (
    value &&
    typeof value === "object" &&
    "_id" in value
  ) {
    return String(value._id);
  }

  return String(value);
};

const assertMemberAccess = async (
  actor: ReservationActor,
  memberId: string
): Promise<void> => {
  if (isReservationAdministrator(actor)) {
    return;
  }

  const actorMemberId = await getActorMemberId(actor);

  if (actorMemberId !== memberId) {
    throw new ReservationAuthorizationError();
  }
};

const getVisibleReservations = async (
  actor: ReservationActor,
  query: import("../types/pagination.js").PaginationQuery
) => {
  if (isReservationAdministrator(actor)) {
    return getReservations(query);
  }

  return getReservations(
    query,
    await getActorMemberId(actor)
  );
};

/* =========================================================
   CREATE RESERVATION
========================================================= */

export const createReservationService = async (
  data: CreateReservationServiceData,
  actor: ReservationActor
) => {
  const {
    bookId,
    memberId,
    expiresAt,
    notes,
  } = data;

  /* -------------------------------------------------------
     VALIDATION
  ------------------------------------------------------- */

  if (!mongoose.Types.ObjectId.isValid(bookId)) {
    throw new Error("Invalid book ID");
  }

  if (!mongoose.Types.ObjectId.isValid(memberId)) {
    throw new Error("Invalid member ID");
  }

  await assertMemberAccess(actor, memberId);

  if (expiresAt !== undefined) {
    if (
      !(expiresAt instanceof Date) ||
      Number.isNaN(expiresAt.getTime())
    ) {
      throw new Error("Invalid expiration date");
    }

    if (expiresAt <= new Date()) {
      throw new Error(
        "Expiration date must be in the future"
      );
    }
  }

  /* -------------------------------------------------------
     CHECK BOOK
  ------------------------------------------------------- */

  const book = await Book.findById(bookId);

  if (!book) {
    throw new Error("Book not found");
  }

  /* -------------------------------------------------------
     CHECK MEMBER
  ------------------------------------------------------- */

  const member = await Member.findById(memberId);

  if (!member) {
    throw new Error("Member not found");
  }

  if (member.status !== "ACTIVE") {
    throw new Error(
      `Member is not active. Current status: ${member.status}`
    );
  }

  /* -------------------------------------------------------
    CHECK AVAILABLE COPY

     If a copy is currently available, reservation is
     normally unnecessary.
  ------------------------------------------------------- */

  if (book.availableCopies > 0) {
    throw new Error(
      "Book currently has available copies. Reservation is not required"
    );
  }

  /* -------------------------------------------------------
     PREVENT DUPLICATE ACTIVE RESERVATION
  ------------------------------------------------------- */

  const existingReservation =
    await getActiveReservation(
      bookId,
      memberId
    );

  if (existingReservation) {
    throw new Error(
      "Member already has an active reservation for this book"
    );
  }

  /* -------------------------------------------------------
     CALCULATE QUEUE POSITION
  ------------------------------------------------------- */

  const activeReservations =
    await getReservationsByBook(bookId);

  const queuePosition =
    activeReservations.length + 1;

  /* -------------------------------------------------------
     CREATE
  ------------------------------------------------------- */

  const reservation =
    await createReservation({
      bookId,
      memberId,
      reservedAt: new Date(),
      expiresAt,
      status: "WAITING",
      queuePosition,
      notes,
    });

  if (!reservation) {
    throw new Error(
      "Failed to create reservation"
    );
  }

  return getReservationById(
    reservation._id.toString()
  );
};

/* =========================================================
   LIST ALL RESERVATIONS
========================================================= */

export const listReservationsService =
  async (
    actor: ReservationActor,
    query: import("../types/pagination.js").PaginationQuery
  ) => {
    return getVisibleReservations(actor, query);
  };

/* =========================================================
   GET RESERVATION
========================================================= */

export const getReservationService =
  async (
    id: string,
    actor: ReservationActor
  ) => {
    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      throw new Error(
        "Invalid reservation ID"
      );
    }

    const reservation =
      await getReservationById(id);

    if (!reservation) {
      throw new Error(
        "Reservation not found"
      );
    }

    await assertMemberAccess(
      actor,
      getReservationMemberId(reservation.memberId)
    );

    return reservation;
  };

/* =========================================================
   LIST BOOK RESERVATIONS
========================================================= */

export const listBookReservationsService =
  async (
    bookId: string,
    actor: ReservationActor
  ) => {
    if (
      !mongoose.Types.ObjectId.isValid(
        bookId
      )
    ) {
      throw new Error(
        "Invalid book ID"
      );
    }

    const book =
      await Book.findById(bookId);

    if (!book) {
      throw new Error(
        "Book not found"
      );
    }

    const reservations = await getReservationsByBook(bookId);

    if (isReservationAdministrator(actor)) {
      return reservations;
    }

    const actorMemberId = await getActorMemberId(actor);

    return reservations.filter(
      (reservation) =>
        getReservationMemberId(reservation.memberId) ===
        actorMemberId
    );
  };

/* =========================================================
   LIST MEMBER RESERVATIONS
========================================================= */

export const listMemberReservationsService =
  async (
    memberId: string,
    actor: ReservationActor
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

    await assertMemberAccess(actor, memberId);

    const member =
      await Member.findById(memberId);

    if (!member) {
      throw new Error(
        "Member not found"
      );
    }

    return getReservationsByMember(
      memberId
    );
  };

/* =========================================================
   CANCEL RESERVATION
========================================================= */

export const cancelReservationService =
  async (
    id: string,
    actor: ReservationActor
  ) => {
    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      throw new Error(
        "Invalid reservation ID"
      );
    }

    const reservation =
      await getReservationById(id);

    if (!reservation) {
      throw new Error(
        "Reservation not found"
      );
    }

    await assertMemberAccess(
      actor,
      getReservationMemberId(reservation.memberId)
    );

    if (
      !["WAITING", "READY"].includes(
        reservation.status
      )
    ) {
      throw new Error(
        `Reservation cannot be cancelled because status is ${reservation.status}`
      );
    }

    const updated = await updateReservation(id, {
  status: "CANCELLED",
  cancelledAt: new Date(),
});

if (!updated) throw new Error("Failed to cancel reservation");

const bookId =
  reservation.bookId instanceof mongoose.Types.ObjectId
    ? reservation.bookId.toString()
    : (reservation.bookId as any)._id.toString();

const remaining = await getReservationsByBook(bookId);

for (let index = 0; index < remaining.length; index++) {
  await updateReservation(remaining[index]._id.toString(), {
    queuePosition: index + 1,
  });
}

return getReservationById(id);
  };

/* =========================================================
   MARK RESERVATION READY
========================================================= */

export const markReservationReadyService = async (
  id: string,
  actor: ReservationActor
) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid reservation ID");
  }

  const reservation = await getReservationById(id);

  if (!reservation) {
    throw new Error("Reservation not found");
  }

  await assertMemberAccess(
    actor,
    getReservationMemberId(reservation.memberId)
  );

  if (reservation.status !== "WAITING") {
    throw new Error(
      `Only waiting reservations can be marked ready. Current status: ${reservation.status}`
    );
  }

  const bookId =
    reservation.bookId instanceof mongoose.Types.ObjectId
      ? reservation.bookId.toString()
      : (reservation.bookId as any)._id.toString();

  const activeReservations = await getReservationsByBook(bookId);

  if (activeReservations.length === 0) {
    throw new Error("No active reservation found");
  }

  const firstReservation = activeReservations[0];

  if (firstReservation._id.toString() !== reservation._id.toString()) {
    throw new Error(
      "Only the first reservation in the queue can be marked ready"
    );
  }

  const updated = await updateReservation(id, {
    status: "READY",
  });

  if (!updated) {
    throw new Error("Failed to mark reservation ready");
  }

  return getReservationById(id);
};

/* =========================================================
   FULFILL RESERVATION
========================================================= */

export const fulfillReservationService = async (
  id: string,
  data: FulfillReservationServiceData,
  actor: ReservationActor
) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid reservation ID");
  }

  if (!mongoose.Types.ObjectId.isValid(data.issuedBy)) {
    throw new Error("Invalid issuedBy user ID");
  }

  const authorizationReservation = await getReservationById(id);

  if (!authorizationReservation) {
    throw new Error("Reservation not found");
  }

  await assertMemberAccess(
    actor,
    getReservationMemberId(authorizationReservation.memberId)
  );

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const reservation = await getReservationById(id, session);

    if (!reservation) {
      throw new Error("Reservation not found");
    }

    if (reservation.status !== "READY") {
      throw new Error(
        `Only READY reservations can be fulfilled. Current status: ${reservation.status}`
      );
    }

  const bookId =
    reservation.bookId instanceof mongoose.Types.ObjectId
      ? reservation.bookId.toString()
      : (reservation.bookId as any)._id.toString();

  const memberId =
    reservation.memberId instanceof mongoose.Types.ObjectId
      ? reservation.memberId.toString()
      : (reservation.memberId as any)._id.toString();

    const availableCopy =
      await getAvailableBookCopyByBookId(bookId, session);

  if (!availableCopy) {
    throw new Error(
      "No available book copy is currently available for this reservation"
    );
  }

    const issue = await issueBookService(
      {
        bookId,
        bookCopyId: availableCopy._id.toString(),
        memberId,
        issuedBy: data.issuedBy,
        dueAt: data.dueAt,
        notes: data.notes,
      },
      session
    );

    const updatedReservation =
      await Reservation.findOneAndUpdate(
        {
          _id: id,
          status: "READY",
        },
        {
          status: "FULFILLED",
          fulfilledAt: new Date(),
        },
        {
          returnDocument: "after",
          runValidators: true,
          session,
        }
      ).exec();

    if (!updatedReservation) {
      throw new Error(
        "Failed to fulfill reservation"
      );
    }

    if (!issue) {
      throw new Error("Failed to create issue");
    }

    await session.commitTransaction();

    const populatedReservation =
      await getReservationById(id);
    const populatedIssue =
      await getIssueById(issue._id.toString());

    return {
      reservation: populatedReservation,
      issue: populatedIssue,
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
};

/* =========================================================
   EXPIRE RESERVATION
========================================================= */

export const expireReservationService =
  async (
    id: string,
    actor: ReservationActor
  ) => {
    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      throw new Error(
        "Invalid reservation ID"
      );
    }

    const reservation =
      await getReservationById(id);

    if (!reservation) {
      throw new Error(
        "Reservation not found"
      );
    }

    await assertMemberAccess(
      actor,
      getReservationMemberId(reservation.memberId)
    );

    if (
      !["WAITING", "READY"].includes(
        reservation.status
      )
    ) {
      throw new Error(
        `Reservation cannot be expired because status is ${reservation.status}`
      );
    }

    if (
      reservation.expiresAt &&
      reservation.expiresAt > new Date()
    ) {
      throw new Error(
        "Reservation has not reached its expiration time"
      );
    }

    const updated =
      await updateReservation(
        id,
        {
          status: "EXPIRED",
        }
      );

    if (!updated) {
      throw new Error(
        "Failed to expire reservation"
      );
    }

    return getReservationById(id);
  };

/* =========================================================
   UPDATE RESERVATION
========================================================= */

export const updateReservationService =
  async (
    id: string,
    data: UpdateReservationServiceData,
    actor: ReservationActor
  ) => {
    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      throw new Error(
        "Invalid reservation ID"
      );
    }

    const existing =
      await getReservationById(id);

    if (!existing) {
      throw new Error(
        "Reservation not found"
      );
    }

    await assertMemberAccess(
      actor,
      getReservationMemberId(existing.memberId)
    );

    if (data.expiresAt !== undefined) {
      if (
        Number.isNaN(
          data.expiresAt.getTime()
        )
      ) {
        throw new Error(
          "Invalid expiration date"
        );
      }
    }

    if (
      ["FULFILLED", "CANCELLED", "EXPIRED"].includes(
        existing.status
      )
    ) {
      throw new Error(
        `Reservation cannot be updated because status is ${existing.status}`
      );
    }

    const updated =
      await updateReservation(
        id,
        data
      );

    if (!updated) {
      throw new Error(
        "Failed to update reservation"
      );
    }

    return updated;
  };

/* =========================================================
   DELETE RESERVATION
========================================================= */

export const deleteReservationService =
  async (
    id: string,
    actor: ReservationActor
  ) => {
    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      throw new Error(
        "Invalid reservation ID"
      );
    }

    const reservation =
      await getReservationById(id);

    if (!reservation) {
      throw new Error(
        "Reservation not found"
      );
    }

    await assertMemberAccess(
      actor,
      getReservationMemberId(reservation.memberId)
    );

    if (
      ["WAITING", "READY"].includes(
        reservation.status
      )
    ) {
      throw new Error(
        "Active reservations cannot be deleted. Cancel the reservation first"
      );
    }

    const deleted =
      await deleteReservation(id);

    if (!deleted) {
      throw new Error(
        "Failed to delete reservation"
      );
    }

    return deleted;
  };