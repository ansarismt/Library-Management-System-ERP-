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

import { Badge, Button, Loading, PageHeader } from "../components/ui";
import { ErrorState } from "../components/ErrorState";

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
    label: "Waiting",
    tone: "warning",
    icon: Clock3,
  },
  READY: {
    label: "Ready for pickup",
    tone: "info",
    icon: CheckCircle2,
  },
  FULFILLED: {
    label: "Fulfilled",
    tone: "success",
    icon: CheckCircle2,
  },
  CANCELLED: {
    label: "Cancelled",
    tone: "neutral",
    icon: XCircle,
  },
  EXPIRED: {
    label: "Expired",
    tone: "danger",
    icon: XCircle,
  },
} as const;

/* -------------------------------------------------------------------------- */
/* Admin / staff reservation management                                       */
/* -------------------------------------------------------------------------- */

function ReservationManagement() {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const canManage = can("RESERVATION_UPDATE");
  const canCancel = can("RESERVATION_CANCEL");

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
  const hasActions = reservations.some(
    (reservation) =>
      (canManage || canCancel) &&
      (reservation.status === "WAITING" || reservation.status === "READY"),
  );

  if (reservationsQuery.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Reservations"
          subtitle="Manage the reservation queue and fulfill member reservations."
        />

        <Loading />
      </div>
    );
  }

  if (reservationsQuery.isError) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Reservations"
          subtitle="Manage the reservation queue and fulfill member reservations."
        />

        <ErrorState error={reservationsQuery.error} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reservations"
        subtitle="Manage the reservation queue and fulfill member reservations."
      />

      {/* Summary */}
      <div className="stat-grid three">
        <div className="stat-card">
          <div className="stat-top">
            <span>Active reservations</span>
            <div className="stat-icon">
              <CalendarClock size={20} />
            </div>
          </div>
          <strong>{activeReservations.length}</strong>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <span>Waiting</span>
            <div className="stat-icon">
              <Clock3 size={20} />
            </div>
          </div>
          <strong>{waitingCount}</strong>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <span>Ready</span>
            <div className="stat-icon">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <strong>{readyCount}</strong>
        </div>
      </div>

      <section className="panel reservation-workflow">
        <div className="panel-head">
          <div>
            <h2>Reservation workflow</h2>
            <p>A copy is held immediately when available; waiting requests are promoted when staff allocate a copy.</p>
          </div>
        </div>

        <div className="reservation-steps">
          <div className="reservation-step">
            <Badge tone="warning">WAITING</Badge>
            <span>No copy is currently available.</span>
          </div>
          <div className="reservation-step-arrow">→</div>
          <div className="reservation-step">
            <Badge tone="info">READY</Badge>
            <span>A physical copy is held for pickup.</span>
          </div>
          <div className="reservation-step-arrow">→</div>
          <div className="reservation-step">
            <Badge tone="success">FULFILLED</Badge>
            <span>Staff hands over the book and creates the issue.</span>
          </div>
        </div>
      </section>

      {/* Empty */}
      {reservations.length === 0 ? (
        <div className="panel">
          <div className="empty">
            <CalendarClock size={28} />
            <strong>No reservations</strong>
            <span>
              There are currently no reservations in the system.
            </span>
          </div>
        </div>
      ) : (
        <div className="panel table-wrap">
          <table>
            <thead>
              <tr>
                <th>Book</th>
                <th>Member</th>
                <th>Reserved</th>
                <th>Queue</th>
                <th>Expires</th>
                <th>Status</th>
                {hasActions && <th>Actions</th>}
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
                      <Badge tone={config.tone}>
                        <StatusIcon size={12} />
                        {config.label}
                      </Badge>
                    </td>

                    {hasActions && <td className="px-5 py-4 text-right">
                      <div className="inline-actions">
                        {canManage && reservation.status === "WAITING" && (
                          <Button
                            variant="secondary"
                            onClick={() =>
                              handleReady(reservation)
                            }
                            disabled={isMutating}
                          >
                            {readyMutation.isPending ? (
                              <Loader2 size={14} />
                            ) : (
                              <CheckCircle2 size={14} />
                            )}

                            Ready
                          </Button>
                        )}

                        {canManage && reservation.status === "READY" && (
                          <Button
                            variant="secondary"
                            onClick={() =>
                              handleFulfill(reservation)
                            }
                            disabled={isMutating}
                          >
                            {fulfillMutation.isPending ? (
                              <Loader2 size={14} />
                            ) : (
                              <CheckCircle2 size={14} />
                            )}

                            Fulfill
                          </Button>
                        )}

                        {canCancel && (reservation.status === "WAITING" ||
                          reservation.status === "READY") && (
                          <Button
                            variant="danger"
                            onClick={() =>
                              handleCancel(reservation)
                            }
                            disabled={isMutating}
                          >
                            <X size={14} />
                            Cancel
                          </Button>
                        )}

                      </div>
                    </td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Student / member reservation page                                           */
/* -------------------------------------------------------------------------- */

function MyReservations() {
  const queryClient = useQueryClient();
  const { user, can } = useAuth();

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
  const hasActions = can("RESERVATION_CANCEL") && activeReservations.length > 0;

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
          subtitle="Track books you're waiting for and cancel active reservations."
        />

        <div className="panel empty">
          <AlertCircle size={28} />
          <strong>Library account not linked</strong>
          <span>
            Your login account is not linked to a library member
            record. Please contact the library.
          </span>
        </div>
      </div>
    );
  }

  if (reservationsQuery.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="My reservations"
          subtitle="Track books you're waiting for and cancel active reservations."
        />

        <Loading />
      </div>
    );
  }

  if (reservationsQuery.isError) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="My reservations"
          subtitle="Track books you're waiting for and cancel active reservations."
        />

        <ErrorState error={reservationsQuery.error} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My reservations"
        subtitle="Track books you're waiting for and cancel active reservations."
      />

      {/* Summary */}
      <div className="stat-grid three">
        <div className="stat-card">
          <div className="stat-top">
            <span>Active reservations</span>
            <div className="stat-icon">
              <CalendarClock size={20} />
            </div>
          </div>
          <strong>{activeReservations.length}</strong>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <span>Total reservations</span>
            <div className="stat-icon">
              <Clock3 size={20} />
            </div>
          </div>
          <strong>{reservations.length}</strong>
        </div>
      </div>

      {reservations.length === 0 ? (
        <div className="panel empty">
          <div className="rounded-full bg-emerald-50 p-3">
            <CalendarClock size={28} className="text-emerald-700" />
          </div>
          <strong>No reservations yet</strong>
          <span>
            When a book is unavailable, you can reserve it from
            the Books & Copies page.
          </span>
        </div>
      ) : (
        <div className="panel table-wrap">
          <table>
            <thead>
              <tr>
                <th>Book</th>
                <th>Reserved</th>
                <th>Queue</th>
                <th>Expires</th>
                <th>Status</th>
                {hasActions && <th>Actions</th>}
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
                      <Badge tone={config.tone}>
                        <StatusIcon size={12} />
                        {config.label}
                      </Badge>
                    </td>

                    {hasActions && <td className="px-5 py-4 text-right">
                      {canCancel ? (
                        <Button
                          variant="danger"
                          onClick={() =>
                            handleCancel(reservation)
                          }
                          disabled={
                            cancelMutation.isPending
                          }
                        >
                          {cancelMutation.isPending ? (
                            <Loader2 size={14} />
                          ) : (
                            <X size={14} />
                          )}

                          Cancel
                        </Button>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
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

  if (can("RESERVATION_READ") && can("MEMBER_READ")) {
    return <ReservationManagement />;
  }

  return <MyReservations />;
}