import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Loader2,
  X,
  XCircle,
} from "lucide-react";

import { reservationsApi } from "../api/services";
import type { Reservation } from "../api/services";
import { useAuth } from "../layout/AuthContext";

const formatDate = (value?: string) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getBookTitle = (reservation: Reservation) => {
  if (
    reservation.bookId &&
    typeof reservation.bookId === "object"
  ) {
    return reservation.bookId.title || "Unknown book";
  }

  return "Book";
};

const getBookIsbn = (reservation: Reservation) => {
  if (
    reservation.bookId &&
    typeof reservation.bookId === "object"
  ) {
    return reservation.bookId.isbn;
  }

  return undefined;
};

const getMemberName = (reservation: Reservation) => {
  if (
    reservation.memberId &&
    typeof reservation.memberId === "object"
  ) {
    return reservation.memberId.name || "Unknown member";
  }

  return "Member";
};

const getMemberCode = (reservation: Reservation) => {
  if (
    reservation.memberId &&
    typeof reservation.memberId === "object"
  ) {
    return reservation.memberId.memberId;
  }

  return undefined;
};

const statusConfig = {
  WAITING: {
    label: "WAITING",
    className: "bg-amber-50 text-amber-700",
    icon: Clock3,
  },
  READY: {
    label: "READY",
    className: "bg-emerald-50 text-emerald-700",
    icon: CheckCircle2,
  },
  FULFILLED: {
    label: "FULFILLED",
    className: "bg-blue-50 text-blue-700",
    icon: CheckCircle2,
  },
  CANCELLED: {
    label: "CANCELLED",
    className: "bg-red-50 text-red-700",
    icon: XCircle,
  },
  EXPIRED: {
    label: "EXPIRED",
    className: "bg-slate-100 text-slate-600",
    icon: XCircle,
  },
} as const;

/* -------------------------------------------------------------------------- */
/* Admin / staff reservation management                                       */
/* -------------------------------------------------------------------------- */

function ReservationManagement() {
  const queryClient = useQueryClient();

  const reservationsQuery = useQuery({
    queryKey: ["reservations"],
    queryFn: reservationsApi.list,
  });

  const readyMutation = useMutation({
    mutationFn: (reservationId: string) =>
      reservationsApi.ready(reservationId),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["reservations"],
      });

      await queryClient.invalidateQueries({
        queryKey: ["books"],
      });

      await queryClient.invalidateQueries({
        queryKey: ["dashboard"],
      });
    },
  });

  const fulfillMutation = useMutation({
    mutationFn: ({
      reservationId,
      dueAt,
    }: {
      reservationId: string;
      dueAt: string;
    }) =>
      reservationsApi.fulfill(reservationId, {
        dueAt,
      }),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["reservations"],
      });

      await queryClient.invalidateQueries({
        queryKey: ["books"],
      });

      await queryClient.invalidateQueries({
        queryKey: ["issues"],
      });

      await queryClient.invalidateQueries({
        queryKey: ["dashboard"],
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (reservationId: string) =>
      reservationsApi.cancel(reservationId),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["reservations"],
      });

      await queryClient.invalidateQueries({
        queryKey: ["books"],
      });

      await queryClient.invalidateQueries({
        queryKey: ["dashboard"],
      });
    },
  });

  const reservations: Reservation[] =
    reservationsQuery.data ?? [];

  const activeReservations = reservations.filter(
    (reservation) =>
      reservation.status === "WAITING" ||
      reservation.status === "READY",
  );

  const waitingCount = reservations.filter(
    (reservation) => reservation.status === "WAITING",
  ).length;

  const readyCount = reservations.filter(
    (reservation) => reservation.status === "READY",
  ).length;

  const handleReady = (reservation: Reservation) => {
    const bookTitle = getBookTitle(reservation);
    const memberName = getMemberName(reservation);

    const confirmed = window.confirm(
      `Mark "${bookTitle}" as READY for ${memberName}?`,
    );

    if (!confirmed) return;

    readyMutation.mutate(reservation._id);
  };

  const handleFulfill = (reservation: Reservation) => {
    const bookTitle = getBookTitle(reservation);
    const memberName = getMemberName(reservation);

    const defaultDueDate = new Date();
    defaultDueDate.setDate(defaultDueDate.getDate() + 7);

    const defaultValue = defaultDueDate
      .toISOString()
      .slice(0, 10);

    const dueDate = window.prompt(
      `Enter due date for "${bookTitle}" issued to ${memberName}.\nUse YYYY-MM-DD.`,
      defaultValue,
    );

    if (!dueDate) return;

    const parsedDate = new Date(`${dueDate}T23:59:59`);

    if (Number.isNaN(parsedDate.getTime())) {
      window.alert("Invalid due date.");
      return;
    }

    fulfillMutation.mutate({
      reservationId: reservation._id,
      dueAt: parsedDate.toISOString(),
    });
  };

  const handleCancel = (reservation: Reservation) => {
    const bookTitle = getBookTitle(reservation);
    const memberName = getMemberName(reservation);

    const confirmed = window.confirm(
      `Cancel "${bookTitle}" reservation for ${memberName}?`,
    );

    if (!confirmed) return;

    cancelMutation.mutate(reservation._id);
  };

  const isMutating =
    readyMutation.isPending ||
    fulfillMutation.isPending ||
    cancelMutation.isPending;

  if (reservationsQuery.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Reservations"
          description="Manage the reservation queue and fulfill member reservations."
        />

        <LoadingState />
      </div>
    );
  }

  if (reservationsQuery.isError) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Reservations"
          description="Manage the reservation queue and fulfill member reservations."
        />

        <ErrorState />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reservations"
        description="Manage the reservation queue and fulfill member reservations."
      />

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Active reservations"
          value={activeReservations.length}
          icon={CalendarClock}
          iconClassName="bg-emerald-50 text-emerald-700"
        />

        <SummaryCard
          label="Waiting"
          value={waitingCount}
          icon={Clock3}
          iconClassName="bg-amber-50 text-amber-700"
        />

        <SummaryCard
          label="Ready"
          value={readyCount}
          icon={CheckCircle2}
          iconClassName="bg-blue-50 text-blue-700"
        />
      </div>

      {/* Empty */}
      {reservations.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
            <CalendarClock className="h-7 w-7 text-slate-500" />
          </div>

          <h2 className="mt-4 text-base font-semibold text-slate-900">
            No reservations
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            There are currently no reservations in the system.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Book
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Member
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Reserved
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Queue
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Expires
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Status
                  </th>

                  <th className="px-5 py-4 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {reservations.map((reservation) => {
                  const config =
                    statusConfig[reservation.status];

                  const StatusIcon = config.icon;

                  const bookTitle =
                    getBookTitle(reservation);

                  const bookIsbn =
                    getBookIsbn(reservation);

                  const memberName =
                    getMemberName(reservation);

                  const memberCode =
                    getMemberCode(reservation);

                  return (
                    <tr
                      key={reservation._id}
                      className="border-b border-slate-100 last:border-b-0"
                    >
                      {/* Book */}
                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-900">
                          {bookTitle}
                        </p>

                        {bookIsbn && (
                          <p className="mt-1 text-xs text-slate-500">
                            ISBN: {bookIsbn}
                          </p>
                        )}
                      </td>

                      {/* Member */}
                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-900">
                          {memberName}
                        </p>

                        {memberCode && (
                          <p className="mt-1 text-xs text-slate-500">
                            ID: {memberCode}
                          </p>
                        )}
                      </td>

                      {/* Reserved */}
                      <td className="px-5 py-4 text-sm text-slate-600">
                        {formatDate(reservation.reservedAt)}
                      </td>

                      {/* Queue */}
                      <td className="px-5 py-4 text-sm text-slate-600">
                        {reservation.queuePosition ?? "—"}
                      </td>

                      {/* Expires */}
                      <td className="px-5 py-4 text-sm text-slate-600">
                        {formatDate(reservation.expiresAt)}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${config.className}`}
                        >
                          <StatusIcon className="h-3.5 w-3.5" />
                          {config.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {reservation.status === "WAITING" && (
                            <button
                              type="button"
                              onClick={() =>
                                handleReady(reservation)
                              }
                              disabled={isMutating}
                              className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {readyMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4" />
                              )}

                              Ready
                            </button>
                          )}

                          {reservation.status === "READY" && (
                            <button
                              type="button"
                              onClick={() =>
                                handleFulfill(reservation)
                              }
                              disabled={isMutating}
                              className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {fulfillMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4" />
                              )}

                              Fulfill
                            </button>
                          )}

                          {(reservation.status === "WAITING" ||
                            reservation.status === "READY") && (
                            <button
                              type="button"
                              onClick={() =>
                                handleCancel(reservation)
                              }
                              disabled={isMutating}
                              className="inline-flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <X className="h-4 w-4" />
                              Cancel
                            </button>
                          )}

                          {reservation.status !== "WAITING" &&
                            reservation.status !== "READY" && (
                              <span className="text-sm text-slate-400">
                                —
                              </span>
                            )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Workflow explanation */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-medium text-slate-900">
            Reservation workflow
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Manage reservations in queue order.
          </p>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-3">
          <WorkflowCard
            number="1"
            title="WAITING"
            description="Member is waiting in the reservation queue."
          />

          <WorkflowCard
            number="2"
            title="READY"
            description="Staff marks the reservation ready when the book can be picked up."
          />

          <WorkflowCard
            number="3"
            title="FULFILLED"
            description="Fulfill the reservation and create the library issue."
          />
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Student / member reservation page                                           */
/* -------------------------------------------------------------------------- */

function MyReservations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const memberId = user?.memberId;

  const reservationsQuery = useQuery({
    queryKey: ["my-reservations", memberId],
    queryFn: () => reservationsApi.byMember(memberId!),
    enabled: Boolean(memberId),
  });

  const cancelMutation = useMutation({
    mutationFn: (reservationId: string) =>
      reservationsApi.cancel(reservationId),

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["my-reservations"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["books"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["dashboard"],
        }),
      ]);
    },
  });

  const reservations: Reservation[] =
    reservationsQuery.data ?? [];

  const activeReservations = reservations.filter(
    (reservation) =>
      reservation.status === "WAITING" ||
      reservation.status === "READY",
  );

  const handleCancel = (reservation: Reservation) => {
    if (cancelMutation.isPending) return;

    const bookTitle = getBookTitle(reservation);

    const confirmed = window.confirm(
      `Cancel your reservation for "${bookTitle}"?`,
    );

    if (!confirmed) return;

    cancelMutation.mutate(reservation._id);
  };

  if (!memberId) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="My reservations"
          description="Track books you're waiting for and cancel active reservations."
        />

        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
            <XCircle className="h-6 w-6 text-red-500" />
          </div>

          <h2 className="mt-4 text-base font-semibold text-slate-900">
            Library account not linked
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            Your login account is not linked to a library member
            record. Please contact the library.
          </p>
        </div>
      </div>
    );
  }

  if (reservationsQuery.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="My reservations"
          description="Track books you're waiting for and cancel active reservations."
        />

        <LoadingState />
      </div>
    );
  }

  if (reservationsQuery.isError) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="My reservations"
          description="Track books you're waiting for and cancel active reservations."
        />

        <ErrorState />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My reservations"
        description="Track books you're waiting for and cancel active reservations."
      />

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2">
        <SummaryCard
          label="Active reservations"
          value={activeReservations.length}
          icon={CalendarClock}
          iconClassName="bg-emerald-50 text-emerald-700"
        />

        <SummaryCard
          label="Total reservations"
          value={reservations.length}
          icon={Clock3}
          iconClassName="bg-slate-100 text-slate-600"
        />
      </div>

      {reservations.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
            <CalendarClock className="h-7 w-7 text-emerald-700" />
          </div>

          <h2 className="mt-4 text-base font-semibold text-slate-900">
            No reservations yet
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            When a book is unavailable, you can reserve it from
            the Books &amp; Copies page.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Book
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Reserved
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Queue
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Expires
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Status
                  </th>

                  <th className="px-5 py-4 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {reservations.map((reservation) => {
                  const config =
                    statusConfig[reservation.status];

                  const StatusIcon = config.icon;

                  const canCancel =
                    reservation.status === "WAITING" ||
                    reservation.status === "READY";

                  const bookTitle =
                    getBookTitle(reservation);

                  const bookIsbn =
                    getBookIsbn(reservation);

                  return (
                    <tr
                      key={reservation._id}
                      className="border-b border-slate-100 last:border-b-0"
                    >
                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-900">
                          {bookTitle}
                        </p>

                        {bookIsbn && (
                          <p className="mt-1 text-xs text-slate-500">
                            ISBN: {bookIsbn}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {formatDate(reservation.reservedAt)}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {reservation.queuePosition ?? "—"}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {formatDate(reservation.expiresAt)}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${config.className}`}
                        >
                          <StatusIcon className="h-3.5 w-3.5" />
                          {config.label}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        {canCancel ? (
                          <button
                            type="button"
                            onClick={() =>
                              handleCancel(reservation)
                            }
                            disabled={
                              cancelMutation.isPending
                            }
                            className="inline-flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {cancelMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <X className="h-4 w-4" />
                            )}

                            Cancel
                          </button>
                        ) : (
                          <span className="text-sm text-slate-400">
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Main page                                                                  */
/* -------------------------------------------------------------------------- */

export default function Reservations() {
  const { can } = useAuth();

  if (can("RESERVATION_UPDATE")) {
    return <ReservationManagement />;
  }

  return <MyReservations />;
}

/* -------------------------------------------------------------------------- */
/* Reusable UI                                                                */
/* -------------------------------------------------------------------------- */

function PageHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">
        {title}
      </h1>

      <p className="mt-1 text-sm text-slate-500">
        {description}
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading reservations...
      </div>
    </div>
  );
}

function ErrorState() {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />

        <div>
          <h2 className="font-semibold text-red-800">
            Unable to load reservations
          </h2>

          <p className="mt-1 text-sm text-red-700">
            Please refresh the page and try again.
          </p>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  iconClassName,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  iconClassName: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {label}
          </p>

          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {value}
          </p>
        </div>

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClassName}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function WorkflowCard({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
          {number}
        </div>

        <p className="font-medium text-slate-900">
          {title}
        </p>
      </div>

      <p className="mt-3 text-sm text-slate-500">
        {description}
      </p>
    </div>
  );
}