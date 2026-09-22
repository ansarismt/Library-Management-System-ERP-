import mongoose from "mongoose";
import Reservation from "../models/Reservation.js";

import {
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
  reserveBookCopy,
} from "../repositories/bookCopy.repository.js";

import {
  getIssueById,
} from "../repositories/issue.repository.js";

import { notifyMemberEvent, notifyAdmins } from "./notification.service.js";

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

/* =========================================================
   AUTHORIZATION
========================================================= */

export class ReservationAuthorizationError extends Error {
  readonly statusCode = 403;

  constructor() {
    super("You can only access your own reservations");
    this.name = "ReservationAuthorizationError";
  }
}

const isReservationAdministrator = (
  actor: ReservationActor
): boolean => {
  return RESERVATION_ADMIN_ROLES.has(actor.role);
};

const getActorMemberId = async (
  actor: ReservationActor
): Promise<string> => {
  const user = await User.findById(actor.userId)
    .select("memberId email")
    .lean()
    .exec();

  if (!user) {
    throw new ReservationAuthorizationError();
  }

  /* =====================================================
     1. FIRST: MATCH USER EMAIL -> MEMBER EMAIL
     
     Email is the most reliable link because the
     frontend /auth/me also resolves the member using
     the user's email.
  ===================================================== */

  if (user.email) {
    const normalizedEmail =
      user.email.trim().toLowerCase();

    const memberByEmail =
      await Member.findOne({
        email: normalizedEmail,
      })
        .select("_id")
        .lean()
        .exec();

    if (memberByEmail) {
      return memberByEmail._id.toString();
    }
  }

  /* =====================================================
     2. SECOND: USE USER.memberId
     
     Supports both:
       - MongoDB ObjectId
       - Library member ID such as MEM001
  ===================================================== */

  if (user.memberId) {
    /*
     * If memberId looks like MongoDB ObjectId,
     * verify that the Member actually exists.
     */
    if (
      mongoose.Types.ObjectId.isValid(
        user.memberId
      )
    ) {
      const memberByObjectId =
        await Member.findById(
          user.memberId
        )
          .select("_id")
          .lean()
          .exec();

      if (memberByObjectId) {
        return memberByObjectId._id.toString();
      }
    }

    /*
     * Otherwise treat it as the library memberId,
     * for example MEM001.
     */
    const memberByMemberId =
      await Member.findOne({
        memberId: user.memberId,
      })
        .select("_id")
        .lean()
        .exec();

    if (memberByMemberId) {
      return memberByMemberId._id.toString();
    }
  }

  /* =====================================================
     3. NO MEMBER LINK
  ===================================================== */

  throw new ReservationAuthorizationError();
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
   HELPERS
========================================================= */

const getObjectIdString = (
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

/**
 * Releases a physical copy held by a reservation.
 *
 * RESERVED
 *    ↓
 * AVAILABLE
 *
 * Book.availableCopies is increased by one.
 */
const releaseReservedCopy = async (
  reservationId: string,
  bookId: string,
  session: mongoose.ClientSession
): Promise<void> => {
  const copy = await mongoose
    .model("BookCopy")
    .findOneAndUpdate(
      {
        reservationId:
          new mongoose.Types.ObjectId(reservationId),
        bookId:
          new mongoose.Types.ObjectId(bookId),
        status: "RESERVED",
      },
      {
        $set: {
          status: "AVAILABLE",
        },
        $unset: {
          reservationId: 1,
        },
      },
      {
        returnDocument: "after",
        session,
      }
    )
    .exec();

  if (!copy) {
    return;
  }

  await Book.findOneAndUpdate(
    {
      _id: new mongoose.Types.ObjectId(bookId),
      $expr: {
        $lt: ["$availableCopies", "$totalCopies"],
      },
    },
    {
      $inc: {
        availableCopies: 1,
      },
    },
    {
      session,
    }
  ).exec();
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
     TRANSACTION
  ------------------------------------------------------- */

  const session = await mongoose.startSession();

  let createdReservationId: string | null = null;
  let becameReady = false;

  try {
    session.startTransaction();

    /*
     * Re-check the book inside the transaction.
     */
    const transactionBook =
      await Book.findById(bookId)
        .session(session)
        .exec();

    if (!transactionBook) {
      throw new Error("Book not found");
    }

    /*
     * Find one physical AVAILABLE copy.
     *
     * If one exists, this reservation becomes READY
     * immediately and that physical copy is RESERVED.
     *
     * If none exists, reservation becomes WAITING.
     */
    const availableCopy =
      await getAvailableBookCopyByBookId(
        bookId,
        session
      );

    if (availableCopy) {
      /* ===================================================
         AVAILABLE COPY EXISTS

         Reservation:
           READY

         Copy:
           AVAILABLE -> RESERVED

         Book:
           availableCopies - 1
      =================================================== */

      const reservationDocs =
        await Reservation.create(
          [
            {
              bookId:
                new mongoose.Types.ObjectId(bookId),
              memberId:
                new mongoose.Types.ObjectId(memberId),
              reservedAt: new Date(),
              expiresAt,
              status: "READY",
              queuePosition: 1,
              notes,
            },
          ],
          {
            session,
          }
        );

      const reservation =
        reservationDocs[0];

      if (!reservation) {
        throw new Error(
          "Failed to create reservation"
        );
      }

      createdReservationId =
        reservation._id.toString();

      /*
       * Atomically reserve the physical copy.
       */
      const reservedCopy =
  await reserveBookCopy(
    availableCopy._id.toString(),
    reservation._id.toString(),
    session
  );

      if (!reservedCopy) {
        throw new Error(
          "The selected book copy is no longer available"
        );
      }

      /*
       * Keep the denormalized book counter aligned with the physical
       * copies after the reservation atomically holds one copy. This
       * also repairs stale counters instead of failing the reservation.
       */
      const remainingAvailableCopies =
        await mongoose
          .model("BookCopy")
          .countDocuments({
            bookId: new mongoose.Types.ObjectId(bookId),
            status: "AVAILABLE",
          })
          .session(session)
          .exec();

      const updatedBook =
        await Book.findOneAndUpdate(
          {
            _id:
              new mongoose.Types.ObjectId(bookId),
          },
          {
            $set: {
              availableCopies: remainingAvailableCopies,
            },
          },
          {
            returnDocument: "after",
            session,
          }
        ).exec();

      if (!updatedBook) {
        throw new Error(
          "Failed to update book availability"
        );
      }

      becameReady = true;
    } else {
      /* ===================================================
         NO AVAILABLE COPY

         Reservation:
           WAITING

         Copy:
           none reserved

         Book:
           unchanged
      =================================================== */

      const activeReservations =
        await getReservationsByBook(bookId);

      /*
       * Only active queue entries should determine
       * the next waiting position.
       */
      const activeQueue =
        activeReservations.filter(
          (reservation) =>
            ["WAITING", "READY"].includes(
              reservation.status
            )
        );

      const queuePosition =
        activeQueue.length + 1;

      const reservationDocs =
        await Reservation.create(
          [
            {
              bookId:
                new mongoose.Types.ObjectId(bookId),
              memberId:
                new mongoose.Types.ObjectId(memberId),
              reservedAt: new Date(),
              expiresAt,
              status: "WAITING",
              queuePosition,
              notes,
            },
          ],
          {
            session,
          }
        );

      const reservation =
        reservationDocs[0];

      if (!reservation) {
        throw new Error(
          "Failed to create reservation"
        );
      }

      createdReservationId =
        reservation._id.toString();
    }

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }

  if (!createdReservationId) {
    throw new Error(
      "Failed to create reservation"
    );
  }

  const createdReservation =
    await getReservationById(
      createdReservationId
    );

  if (!createdReservation) {
    throw new Error(
      "Failed to load created reservation"
    );
  }

  /* -------------------------------------------------------
     NOTIFICATION
  ------------------------------------------------------- */

  const reservationMemberId =
    getReservationMemberId(
      createdReservation.memberId
    );

  const reservationBookTitle =
    typeof createdReservation.bookId === "object" &&
    createdReservation.bookId !== null &&
    "title" in createdReservation.bookId
      ? (
          createdReservation.bookId as unknown as {
            title?: string;
          }
        ).title ?? "book"
      : "book";

  if (becameReady) {
    await notifyMemberEvent(
      reservationMemberId,
      "RESERVATION_READY",
      "Reservation ready",
      `Your reserved book "${reservationBookTitle}" is ready for pickup.`,
      "RESERVATION",
      createdReservation._id.toString()
    );
  }

  // Notify when reservation is created (WAITING or READY)
  await notifyMemberEvent(
    reservationMemberId,
    "RESERVATION_CREATED",
    "Reservation created",
    `Your reservation for "${reservationBookTitle}" has been placed.${becameReady ? " It is ready for pickup." : " You will be notified when it becomes available."}`,
    "RESERVATION",
    createdReservation._id.toString()
  );

  // Notify all admins about the new reservation
  const reserverMember = await Member.findById(reservationMemberId).select("memberId name").exec();
  const reserverName = reserverMember?.name || "A member";
  await notifyAdmins(
    "RESERVATION_CREATED",
    "New reservation",
    `${reserverName} reserved the book "${reservationBookTitle}".`,
    "RESERVATION",
    createdReservation._id.toString()
  );

  return createdReservation;
};

/* =========================================================
   LIST ALL RESERVATIONS
========================================================= */

export const listReservationsService =
  async (
    actor: ReservationActor,
    query: import("../types/pagination.js").PaginationQuery
  ) => {
    return getVisibleReservations(
      actor,
      query
    );
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
      getReservationMemberId(
        reservation.memberId
      )
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

    const reservations =
      await getReservationsByBook(
        bookId
      );

    if (
      isReservationAdministrator(actor)
    ) {
      return reservations;
    }

    const actorMemberId =
      await getActorMemberId(actor);

    return reservations.filter(
      (reservation) =>
        getReservationMemberId(
          reservation.memberId
        ) === actorMemberId
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

    await assertMemberAccess(
      actor,
      memberId
    );

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

    const existing =
      await getReservationById(id);

    if (!existing) {
      throw new Error(
        "Reservation not found"
      );
    }

    await assertMemberAccess(
      actor,
      getReservationMemberId(
        existing.memberId
      )
    );

    if (
      !["WAITING", "READY"].includes(
        existing.status
      )
    ) {
      throw new Error(
        `Reservation cannot be cancelled because status is ${existing.status}`
      );
    }

    const bookId =
      getObjectIdString(
        existing.bookId
      );

    const session =
      await mongoose.startSession();

    try {
      session.startTransaction();

      const reservation =
        await Reservation.findOne({
          _id:
            new mongoose.Types.ObjectId(id),
          status: {
            $in: ["WAITING", "READY"],
          },
        })
          .session(session)
          .exec();

      if (!reservation) {
        throw new Error(
          "Reservation is no longer active"
        );
      }

      /*
       * If this reservation is READY, release the
       * physical copy it was holding.
       */
      if (reservation.status === "READY") {
        await releaseReservedCopy(
          id,
          bookId,
          session
        );
      }

      const updated =
        await Reservation.findOneAndUpdate(
          {
            _id:
              new mongoose.Types.ObjectId(id),
            status: {
              $in: ["WAITING", "READY"],
            },
          },
          {
            $set: {
              status: "CANCELLED",
              cancelledAt: new Date(),
            },
          },
          {
            returnDocument: "after",
            runValidators: true,
            session,
          }
        ).exec();

      if (!updated) {
        throw new Error(
          "Failed to cancel reservation"
        );
      }

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }

    /*
     * Recalculate active queue positions.
     */
    const remaining =
      await getReservationsByBook(
        bookId
      );

    const activeRemaining =
      remaining.filter(
        (reservation) =>
          ["WAITING", "READY"].includes(
            reservation.status
          )
      );

    for (
      let index = 0;
      index < activeRemaining.length;
      index++
    ) {
      await updateReservation(
        activeRemaining[index]._id.toString(),
        {
          queuePosition: index + 1,
        }
      );
    }

    const cancelledReservation =
      await getReservationById(id);

    if (cancelledReservation) {
      await notifyMemberEvent(
        getReservationMemberId(
          cancelledReservation.memberId
        ),
        "RESERVATION_CANCELLED",
        "Reservation cancelled",
        "Your reservation has been cancelled.",
        "RESERVATION",
        cancelledReservation._id.toString()
      );

      // Notify admins about the cancellation
      const cancelledMember = await Member.findById(getReservationMemberId(cancelledReservation.memberId)).select("memberId name").exec();
      const cancelledMemberName = cancelledMember?.name || "A member";
      const cancelledBookTitle = typeof cancelledReservation.bookId === "object" && cancelledReservation.bookId !== null && "title" in cancelledReservation.bookId
        ? (cancelledReservation.bookId as unknown as { title?: string }).title ?? "book"
        : "book";
      await notifyAdmins(
        "RESERVATION_CANCELLED",
        "Reservation cancelled",
        `${cancelledMemberName} cancelled the reservation for "${cancelledBookTitle}".`,
        "RESERVATION",
        cancelledReservation._id.toString()
      );
    }

    return cancelledReservation;
  };

/* =========================================================
   MARK RESERVATION READY
========================================================= */

export const markReservationReadyService =
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

    const authorizationReservation =
      await getReservationById(id);

    if (!authorizationReservation) {
      throw new Error(
        "Reservation not found"
      );
    }

    await assertMemberAccess(
      actor,
      getReservationMemberId(
        authorizationReservation.memberId
      )
    );

    if (
      authorizationReservation.status !==
      "WAITING"
    ) {
      throw new Error(
        `Only waiting reservations can be marked ready. Current status: ${authorizationReservation.status}`
      );
    }

    const bookId =
      getObjectIdString(
        authorizationReservation.bookId
      );

    const activeReservations =
      await getReservationsByBook(
        bookId
      );

    const activeQueue =
      activeReservations.filter(
        (reservation) =>
          ["WAITING", "READY"].includes(
            reservation.status
          )
      );

    if (activeQueue.length === 0) {
      throw new Error(
        "No active reservation found"
      );
    }

    const firstReservation =
      activeQueue[0];

    if (
      firstReservation._id.toString() !==
      authorizationReservation._id.toString()
    ) {
      throw new Error(
        "Only the first reservation in the queue can be marked ready"
      );
    }

    const session =
      await mongoose.startSession();

    try {
      session.startTransaction();

      /*
       * Find an available physical copy.
       */
      const availableCopy =
        await getAvailableBookCopyByBookId(
          bookId,
          session
        );

      if (!availableCopy) {
        throw new Error(
          "No available book copy is currently available"
        );
      }

      /*
       * Reserve the physical copy.
       */
      const reservedCopy =
        await reserveBookCopy(
          availableCopy._id.toString(),
          id,
          session
        );

      if (!reservedCopy) {
        throw new Error(
          "The book copy is no longer available"
        );
      }

      /*
       * Decrease book availability.
       */
      const updatedBook =
        await Book.findOneAndUpdate(
          {
            _id:
              new mongoose.Types.ObjectId(bookId),
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
            returnDocument: "after",
            session,
          }
        ).exec();

      if (!updatedBook) {
        throw new Error(
          "Failed to update book availability"
        );
      }

      /*
       * WAITING -> READY
       */
      const updated =
        await Reservation.findOneAndUpdate(
          {
            _id:
              new mongoose.Types.ObjectId(id),
            status: "WAITING",
          },
          {
            $set: {
              status: "READY",
            },
          },
          {
            returnDocument: "after",
            runValidators: true,
            session,
          }
        ).exec();

      if (!updated) {
        throw new Error(
          "Failed to mark reservation ready"
        );
      }

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }

    const readyReservation =
      await getReservationById(id);

    if (readyReservation) {
      const title =
        typeof readyReservation.bookId ===
          "object" &&
        readyReservation.bookId !== null &&
        "title" in readyReservation.bookId
          ? (
              readyReservation.bookId as unknown as {
                title?: string;
              }
            ).title ?? "book"
          : "book";

      await notifyMemberEvent(
        getReservationMemberId(
          readyReservation.memberId
        ),
        "RESERVATION_READY",
        "Reservation ready",
        `Your reserved book "${title}" is ready for pickup.`,
        "RESERVATION",
        readyReservation._id.toString()
      );

      // Notify admins that a reservation is ready for pickup
      const readyMember = await Member.findById(getReservationMemberId(readyReservation.memberId)).select("memberId name").exec();
      const readyMemberName = readyMember?.name || "A member";
      await notifyAdmins(
        "RESERVATION_READY",
        "Reservation ready",
        `${readyMemberName}'s reservation for "${title}" is ready for pickup.`,
        "RESERVATION",
        readyReservation._id.toString()
      );
    }

    return readyReservation;
  };

/* =========================================================
   FULFILL RESERVATION
========================================================= */

export const fulfillReservationService =
  async (
    id: string,
    data: FulfillReservationServiceData,
    actor: ReservationActor
  ) => {
    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      throw new Error(
        "Invalid reservation ID"
      );
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        data.issuedBy
      )
    ) {
      throw new Error(
        "Invalid issuedBy user ID"
      );
    }

    const authorizationReservation =
      await getReservationById(id);

    if (!authorizationReservation) {
      throw new Error(
        "Reservation not found"
      );
    }

    await assertMemberAccess(
      actor,
      getReservationMemberId(
        authorizationReservation.memberId
      )
    );

    const session =
      await mongoose.startSession();

    try {
      session.startTransaction();

      const reservation =
        await Reservation.findById(id)
          .session(session)
          .exec();

      if (!reservation) {
        throw new Error(
          "Reservation not found"
        );
      }

      if (reservation.status !== "READY") {
        throw new Error(
          `Only READY reservations can be fulfilled. Current status: ${reservation.status}`
        );
      }

      const bookId =
        getObjectIdString(
          reservation.bookId
        );

      const memberId =
        getObjectIdString(
          reservation.memberId
        );

      /*
       * IMPORTANT:
       *
       * The physical copy is RESERVED by this
       * reservation.
       *
       * We intentionally do NOT call
       * getAvailableBookCopyByBookId().
       *
       * Step 4 will update issue.service.ts so
       * issueBookService can convert:
       *
       * RESERVED -> ISSUED
       */
      const BookCopyModel =
        mongoose.model("BookCopy");

      const reservedCopy =
        await BookCopyModel.findOne({
          reservationId:
            reservation._id,
          bookId:
            new mongoose.Types.ObjectId(bookId),
          status: "RESERVED",
        })
          .session(session)
          .exec();

      if (!reservedCopy) {
        throw new Error(
          "No physical book copy is reserved for this reservation"
        );
      }

      const issue =
        await issueBookService(
          {
            bookId,
            bookCopyId:
              reservedCopy._id.toString(),
            memberId,
            issuedBy: data.issuedBy,
            dueAt: data.dueAt,
            notes: data.notes,
          },
          session
        );

      if (!issue) {
        throw new Error(
          "Failed to create issue"
        );
      }

      const updatedReservation =
        await Reservation.findOneAndUpdate(
          {
            _id:
              new mongoose.Types.ObjectId(id),
            status: "READY",
          },
          {
            $set: {
              status: "FULFILLED",
              fulfilledAt: new Date(),
            },
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

      await session.commitTransaction();

      const populatedReservation =
        await getReservationById(id);

      const populatedIssue =
        await getIssueById(
          issue._id.toString()
        );

      if (populatedReservation) {
        await notifyMemberEvent(
          memberId,
          "RESERVATION_FULFILLED",
          "Reservation fulfilled",
          "Your reserved book has been issued to you.",
          "RESERVATION",
          populatedReservation._id.toString()
        );

        // Notify admins that the reservation was fulfilled
        const fulfilledMember = await Member.findById(memberId).select("memberId name").exec();
        const fulfilledMemberName = fulfilledMember?.name || "A member";
        const fulfilledBookTitle = typeof populatedReservation.bookId === "object" && populatedReservation.bookId !== null && "title" in populatedReservation.bookId
          ? (populatedReservation.bookId as unknown as { title?: string }).title ?? "book"
          : "book";
        await notifyAdmins(
          "RESERVATION_FULFILLED",
          "Reservation fulfilled",
          `${fulfilledMemberName}'s reservation for "${fulfilledBookTitle}" was fulfilled.`,
          "RESERVATION",
          populatedReservation._id.toString()
        );
      }

      return {
        reservation:
          populatedReservation,
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
      getReservationMemberId(
        reservation.memberId
      )
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

    const bookId =
      getObjectIdString(
        reservation.bookId
      );

    const session =
      await mongoose.startSession();

    try {
      session.startTransaction();

      const currentReservation =
        await Reservation.findById(id)
          .session(session)
          .exec();

      if (!currentReservation) {
        throw new Error(
          "Reservation not found"
        );
      }

      if (
        !["WAITING", "READY"].includes(
          currentReservation.status
        )
      ) {
        throw new Error(
          `Reservation cannot be expired because status is ${currentReservation.status}`
        );
      }

      /*
       * READY reservation owns a physical copy.
       * Release it before expiring.
       */
      if (
        currentReservation.status ===
        "READY"
      ) {
        await releaseReservedCopy(
          id,
          bookId,
          session
        );
      }

      const updated =
        await Reservation.findOneAndUpdate(
          {
            _id:
              new mongoose.Types.ObjectId(id),
            status: {
              $in: ["WAITING", "READY"],
            },
          },
          {
            $set: {
              status: "EXPIRED",
            },
          },
          {
            returnDocument: "after",
            runValidators: true,
            session,
          }
        ).exec();

      if (!updated) {
        throw new Error(
          "Failed to expire reservation"
        );
      }

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }

    const expiredReservation =
      await getReservationById(id);

    if (expiredReservation) {
      await notifyMemberEvent(
        getReservationMemberId(
          expiredReservation.memberId
        ),
        "RESERVATION_EXPIRED",
        "Reservation expired",
        "Your reservation has expired.",
        "RESERVATION",
        expiredReservation._id.toString()
      );

      // Notify admins about the expired reservation
      const expiredMember = await Member.findById(getReservationMemberId(expiredReservation.memberId)).select("memberId name").exec();
      const expiredMemberName = expiredMember?.name || "A member";
      const expiredBookTitle = typeof expiredReservation.bookId === "object" && expiredReservation.bookId !== null && "title" in expiredReservation.bookId
        ? (expiredReservation.bookId as unknown as { title?: string }).title ?? "book"
        : "book";
      await notifyAdmins(
        "RESERVATION_EXPIRED",
        "Reservation expired",
        `${expiredMemberName}'s reservation for "${expiredBookTitle}" has expired.`,
        "RESERVATION",
        expiredReservation._id.toString()
      );
    }

    return expiredReservation;
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
      getReservationMemberId(
        existing.memberId
      )
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
      [
        "FULFILLED",
        "CANCELLED",
        "EXPIRED",
      ].includes(existing.status)
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
      getReservationMemberId(
        reservation.memberId
      )
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
