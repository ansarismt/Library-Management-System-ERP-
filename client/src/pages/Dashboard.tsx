import { useQueries } from "@tanstack/react-query";
import {
  ArrowUpRight,
  BookOpen,
  CalendarClock,
  CircleDollarSign,
  Clock3,
  LibraryBig,
  WalletCards,
} from "lucide-react";

import {
  booksApi,
  copiesApi,
  finesApi,
  issuesApi,
  membersApi,
  reservationsApi,
} from "../api/services";

import { Badge, Loading } from "../components/ui";
import {
  date,
  money,
  nameOf,
  titleOf,
  tone,
} from "../utils/format";

import { useAuth } from "../layout/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();

  const isPersonalUser =
    user?.role === "STUDENT" ||
    user?.role === "FACULTY" ||
    user?.role === "MEMBER";

  if (isPersonalUser) {
    return <PersonalDashboard />;
  }

  return <StaffDashboard />;
}

/*
 * ============================================================
 * PERSONAL DASHBOARD
 * ============================================================
 */

function PersonalDashboard() {
  const { user } = useAuth();

  const memberId = user?.memberId;

  const q = useQueries({
    queries: [
      {
        queryKey: ["books"],
        queryFn: booksApi.list,
      },
      {
        queryKey: ["my-issues", memberId],
        queryFn: () => issuesApi.byMember(memberId!),
        enabled: Boolean(memberId),
      },
      {
        queryKey: ["my-fines", memberId],
        queryFn: () => finesApi.byMember(memberId!),
        enabled: Boolean(memberId),
      },
      {
        queryKey: ["my-reservations", memberId],
        queryFn: () => reservationsApi.byMember(memberId!),
        enabled: Boolean(memberId),
      },
    ],
  });

  // Check for missing memberId first, before loading check
  if (!memberId) {
    return (
      <section className="panel">
        <div className="panel-head">
          <div>
            <span className="eyebrow">ACCOUNT</span>
            <h2>Library account not linked</h2>
            <p>
              Your login account is not currently linked to a
              library member record. Please contact the library.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (q.some((x) => x.isPending)) {
    return <Loading />;
  }

  const [books, issues, fines, reservations] =
    q.map((x) => (x.data ?? []) as any[]);

  const activeIssues = issues.filter(
    (x) => x.status === "ISSUED",
  );

  const overdueIssues = activeIssues.filter(
    (x) =>
      x.dueAt &&
      new Date(x.dueAt) < new Date(),
  );

  const outstanding = fines
    .filter(
      (x) =>
        x.status === "UNPAID" ||
        x.status === "PARTIAL",
    )
    .reduce(
      (sum, x) =>
        sum + (x.amount - x.paidAmount),
      0,
    );

  const activeReservations =
    reservations.filter((x) =>
      ["WAITING", "READY"].includes(
        x.status,
      ),
    );

  const availableTitles = books.filter(
    (x) =>
      x.status === "ACTIVE" &&
      x.availableCopies > 0,
  );

  return (
    <>
      <div className="page-header">
        <div>
          <span className="eyebrow">
            MY LIBRARY
          </span>

          <h1>
            Welcome, {user?.name || "member"}.
          </h1>

          <p>
            Your personal library activity and
            catalogue overview.
          </p>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-top">
            <span>Books on loan</span>

            <div className="stat-icon">
              <LibraryBig size={18} />
            </div>
          </div>

          <strong>{activeIssues.length}</strong>

          <span className="stat-foot">
            Currently issued to you
          </span>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <span>Overdue</span>

            <div className="stat-icon">
              <Clock3 size={18} />
            </div>
          </div>

          <strong>{overdueIssues.length}</strong>

          <span className="stat-foot">
            Loans requiring attention
          </span>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <span>Reservations</span>

            <div className="stat-icon">
              <CalendarClock size={18} />
            </div>
          </div>

          <strong>
            {activeReservations.length}
          </strong>

          <span className="stat-foot">
            Active reservations
          </span>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <span>Outstanding fines</span>

            <div className="stat-icon">
              <CircleDollarSign size={18} />
            </div>
          </div>

          <strong>{money(outstanding)}</strong>

          <span className="stat-foot">
            Amount currently due
          </span>
        </div>
      </div>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>My current loans</h2>
              <p>
                Books currently issued to your
                account.
              </p>
            </div>

            <ArrowUpRight size={18} />
          </div>

          {activeIssues.length === 0 ? (
            <div className="empty compact">
              <BookOpen size={22} />

              <strong>
                No books currently on loan
              </strong>

              <span>
                Books you borrow will appear here.
              </span>
            </div>
          ) : (
            <div className="list">
              {activeIssues
                .slice(0, 6)
                .map((x) => {
                  const overdue =
                    x.dueAt &&
                    new Date(x.dueAt) <
                      new Date();

                  return (
                    <div
                      className="list-row"
                      key={x._id}
                    >
                      <div className="row-avatar">
                        {titleOf(
                          x.bookId,
                        ).slice(0, 1)}
                      </div>

                      <div className="row-main">
                        <strong>
                          {titleOf(x.bookId)}
                        </strong>

                        <span>
                          Due{" "}
                          {date(x.dueAt)}
                        </span>
                      </div>

                      <Badge
                        tone={
                          overdue
                            ? "danger"
                            : "success"
                        }
                      >
                        {overdue
                          ? "OVERDUE"
                          : "ISSUED"}
                      </Badge>
                    </div>
                  );
                })}
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>My reservations</h2>

              <p>
                Books you're waiting for.
              </p>
            </div>
          </div>

          {activeReservations.length === 0 ? (
            <div className="empty compact">
              <CalendarClock size={22} />

              <strong>
                No active reservations
              </strong>

              <span>
                Reserve an unavailable book from
                the catalogue.
              </span>
            </div>
          ) : (
            <div className="list">
              {activeReservations
                .slice(0, 6)
                .map((x) => (
                  <div
                    className="list-row"
                    key={x._id}
                  >
                    <div className="row-avatar">
                      {titleOf(
                        x.bookId,
                      ).slice(0, 1)}
                    </div>

                    <div className="row-main">
                      <strong>
                        {titleOf(x.bookId)}
                      </strong>

                      <span>
                        Queue position{" "}
                        {x.queuePosition ??
                          "—"}
                      </span>
                    </div>

                    <Badge
                      tone={
                        x.status === "READY"
                          ? "success"
                          : "warning"
                      }
                    >
                      {x.status}
                    </Badge>
                  </div>
                ))}
            </div>
          )}
        </section>
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Catalogue availability</h2>

            <p>
              Currently available active titles.
            </p>
          </div>
        </div>

        <div className="mini-stats">
          <div>
            <BookOpen size={17} />

            <span>Active titles</span>

            <strong>
              {books.filter(
                (x) =>
                  x.status === "ACTIVE",
              ).length}
            </strong>
          </div>

          <div>
            <WalletCards size={17} />

            <span>Available titles</span>

            <strong>
              {availableTitles.length}
            </strong>
          </div>

          <div>
            <CircleDollarSign size={17} />

            <span>Outstanding fines</span>

            <strong>
              {money(outstanding)}
            </strong>
          </div>
        </div>
      </section>
    </>
  );
}

/*
 * ============================================================
 * STAFF / ADMIN DASHBOARD
 * ============================================================
 */

function StaffDashboard() {
  const q = useQueries({
    queries: [
      {
        queryKey: ["books"],
        queryFn: booksApi.list,
      },
      {
        queryKey: ["members"],
        queryFn: membersApi.list,
      },
      {
        queryKey: ["issues"],
        queryFn: issuesApi.list,
      },
      {
        queryKey: ["fines"],
        queryFn: finesApi.list,
      },
      {
        queryKey: ["copies"],
        queryFn: copiesApi.list,
      },
    ],
  });

  if (q.some((x) => x.isPending)) {
    return <Loading />;
  }

  const [b, m, i, f, c] =
    q.map((x) => (x.data ?? []) as any[]);

  const overdue = i.filter(
    (x) =>
      x.status === "ISSUED" &&
      new Date(x.dueAt) < new Date(),
  ).length;

  const outstanding = f
    .filter(
      (x) =>
        x.status === "UNPAID" ||
        x.status === "PARTIAL",
    )
    .reduce(
      (s, x) =>
        s + (x.amount - x.paidAmount),
      0,
    );

  const active = i.filter(
    (x) => x.status === "ISSUED",
  ).length;

  const stats = [
    ["Total books", b.length, BookOpen],
    ["Members", m.length, LibraryBig],
    ["On loan", active, LibraryBig],
    [
      "Outstanding fines",
      money(outstanding),
      CircleDollarSign,
    ],
  ] as const;

  return (
    <>
      <div className="page-header">
        <div>
          <span className="eyebrow">
            OVERVIEW
          </span>

          <h1>
            Good evening, library team.
          </h1>

          <p>
            Here's the operational picture
            across your catalogue and
            circulation.
          </p>
        </div>
      </div>

      <div className="stat-grid">
        {stats.map(
          ([label, value, Icon]) => (
            <div
              className="stat-card"
              key={label}
            >
              <div className="stat-top">
                <span>{label}</span>

                <div className="stat-icon">
                  <Icon size={18} />
                </div>
              </div>

              <strong>
                {String(value)}
              </strong>

              <span className="stat-foot">
                Live from your library data
              </span>
            </div>
          ),
        )}
      </div>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>
                Circulation watch
              </h2>

              <p>
                Loans that need attention
                today.
              </p>
            </div>

            <ArrowUpRight size={18} />
          </div>

          {overdue === 0 ? (
            <div className="empty compact">
              <Clock3 size={22} />

              <strong>
                No overdue loans
              </strong>

              <span>
                Everything currently
                issued is within its due
                date.
              </span>
            </div>
          ) : (
            <div className="list">
              {i
                .filter(
                  (x) =>
                    x.status ===
                      "ISSUED" &&
                    new Date(x.dueAt) <
                      new Date(),
                )
                .slice(0, 6)
                .map((x) => (
                  <div
                    className="list-row"
                    key={x._id}
                  >
                    <div className="row-avatar">
                      {titleOf(
                        x.bookId,
                      ).slice(0, 1)}
                    </div>

                    <div className="row-main">
                      <strong>
                        {titleOf(
                          x.bookId,
                        )}
                      </strong>

                      <span>
                        {nameOf(
                          x.memberId,
                        )}{" "}
                        · due{" "}
                        {date(
                          x.dueAt,
                        )}
                      </span>
                    </div>

                    <Badge tone="danger">
                      OVERDUE
                    </Badge>
                  </div>
                ))}
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>
                Collection snapshot
              </h2>

              <p>
                Availability across
                physical copies.
              </p>
            </div>
          </div>

          <div className="progress-wrap">
            <div className="progress-label">
              <span>
                Available copies
              </span>

              <strong>
                {
                  c.filter(
                    (x) =>
                      x.status ===
                      "AVAILABLE",
                  ).length
                }{" "}
                / {c.length}
              </strong>
            </div>

            <div className="progress">
              <i
                style={{
                  width: `${
                    c.length
                      ? Math.round(
                          (c.filter(
                            (x) =>
                              x.status ===
                              "AVAILABLE",
                          ).length /
                            c.length) *
                            100,
                        )
                      : 0
                  }%`,
                }}
              />
            </div>

            <div className="mini-stats">
              <div>
                <WalletCards size={17} />

                <span>
                  Paid fines
                </span>

                <strong>
                  {money(
                    f
                      .filter(
                        (x) =>
                          x.status ===
                          "PAID",
                      )
                      .reduce(
                        (s, x) =>
                          s +
                          x.paidAmount,
                        0,
                      ),
                  )}
                </strong>
              </div>

              <div>
                <BookOpen size={17} />

                <span>
                  Active titles
                </span>

                <strong>
                  {
                    b.filter(
                      (x) =>
                        x.status ===
                        "ACTIVE",
                    ).length
                  }
                </strong>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>
              Recent activity
            </h2>

            <p>
              Latest circulation
              records.
            </p>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Book</th>
                <th>Member</th>
                <th>Issued</th>
                <th>Due</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {i
                .slice(0, 6)
                .map((x) => (
                  <tr key={x._id}>
                    <td>
                      <strong>
                        {titleOf(
                          x.bookId,
                        )}
                      </strong>
                    </td>

                    <td>
                      {nameOf(
                        x.memberId,
                      )}
                    </td>

                    <td>
                      {date(
                        x.issuedAt,
                      )}
                    </td>

                    <td>
                      {date(x.dueAt)}
                    </td>

                    <td>
                      <Badge
                        tone={tone(
                          x.status,
                        )}
                      >
                        {x.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}