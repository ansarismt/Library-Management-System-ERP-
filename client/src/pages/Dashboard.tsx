import { useQueries } from "@tanstack/react-query";
import {
  ArrowUpRight,
  BookOpen,
  CircleDollarSign,
  Clock3,
  LibraryBig,
  Users,
  WalletCards,
} from "lucide-react";
import {
  booksApi,
  copiesApi,
  finesApi,
  issuesApi,
  membersApi,
} from "../api/services";
import { Badge, Loading } from "../components/ui";
import { date, money, nameOf, titleOf, tone } from "../utils/format";

export default function Dashboard() {
  const q = useQueries({
    queries: [
      { queryKey: ["books"], queryFn: booksApi.list },
      { queryKey: ["members"], queryFn: membersApi.list },
      { queryKey: ["issues"], queryFn: issuesApi.list },
      { queryKey: ["fines"], queryFn: finesApi.list },
      { queryKey: ["copies"], queryFn: copiesApi.list },
    ],
  });
  if (q.some((x) => x.isPending)) return <Loading />;
  const [b, m, i, f, c] = q.map((x) => (x.data ?? []) as any[]);
  const overdue = i.filter(
    (x) => x.status === "ISSUED" && new Date(x.dueAt) < new Date(),
  ).length;
  const outstanding = f
    .filter((x) => x.status === "UNPAID" || x.status === "PARTIAL")
    .reduce((s, x) => s + (x.amount - x.paidAmount), 0);
  const active = i.filter((x) => x.status === "ISSUED").length;
  const stats = [
    ["Total books", b.length, BookOpen],
    ["Members", m.length, Users],
    ["On loan", active, LibraryBig],
    ["Outstanding fines", money(outstanding), CircleDollarSign],
  ] as const;
  return (
    <>
      <div className="page-header">
        <div>
          <span className="eyebrow">OVERVIEW</span>
          <h1>Good evening, library team.</h1>
          <p>
            Here’s the operational picture across your catalogue and
            circulation.
          </p>
        </div>
      </div>
      <div className="stat-grid">
        {stats.map(([label, value, Icon]) => (
          <div className="stat-card" key={label}>
            <div className="stat-top">
              <span>{label}</span>
              <div className="stat-icon">
                <Icon size={18} />
              </div>
            </div>
            <strong>{String(value)}</strong>
            <span className="stat-foot">Live from your library data</span>
          </div>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Circulation watch</h2>
              <p>Loans that need attention today.</p>
            </div>
            <ArrowUpRight size={18} />
          </div>
          {overdue === 0 ? (
            <div className="empty compact">
              <Clock3 size={22} />
              <strong>No overdue loans</strong>
              <span>Everything currently issued is within its due date.</span>
            </div>
          ) : (
            <div className="list">
              {i
                .filter(
                  (x) =>
                    x.status === "ISSUED" && new Date(x.dueAt) < new Date(),
                )
                .slice(0, 6)
                .map((x) => (
                  <div className="list-row" key={x._id}>
                    <div className="row-avatar">
                      {titleOf(x.bookId).slice(0, 1)}
                    </div>
                    <div className="row-main">
                      <strong>{titleOf(x.bookId)}</strong>
                      <span>
                        {nameOf(x.memberId)} · due {date(x.dueAt)}
                      </span>
                    </div>
                    <Badge tone="danger">OVERDUE</Badge>
                  </div>
                ))}
            </div>
          )}
        </section>
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Collection snapshot</h2>
              <p>Availability across physical copies.</p>
            </div>
          </div>
          <div className="progress-wrap">
            <div className="progress-label">
              <span>Available copies</span>
              <strong>
                {c.filter((x) => x.status === "AVAILABLE").length} / {c.length}
              </strong>
            </div>
            <div className="progress">
              <i
                style={{
                  width: `${c.length ? Math.round((c.filter((x) => x.status === "AVAILABLE").length / c.length) * 100) : 0}%`,
                }}
              />
            </div>
            <div className="mini-stats">
              <div>
                <WalletCards size={17} />
                <span>Paid fines</span>
                <strong>
                  {money(
                    f
                      .filter((x) => x.status === "PAID")
                      .reduce((s, x) => s + x.paidAmount, 0),
                  )}
                </strong>
              </div>
              <div>
                <BookOpen size={17} />
                <span>Active titles</span>
                <strong>{b.filter((x) => x.status === "ACTIVE").length}</strong>
              </div>
            </div>
          </div>
        </section>
      </div>
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Recent activity</h2>
            <p>Latest circulation records.</p>
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
              {i.slice(0, 6).map((x) => (
                <tr key={x._id}>
                  <td>
                    <strong>{titleOf(x.bookId)}</strong>
                  </td>
                  <td>{nameOf(x.memberId)}</td>
                  <td>{date(x.issuedAt)}</td>
                  <td>{date(x.dueAt)}</td>
                  <td>
                    <Badge tone={tone(x.status)}>{x.status}</Badge>
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
