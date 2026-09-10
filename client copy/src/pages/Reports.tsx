import { useQueries } from "@tanstack/react-query";
import {
  BarChart3,
  BookOpen,
  CircleDollarSign,
  Download,
  Users,
} from "lucide-react";
import { booksApi, finesApi, issuesApi, membersApi } from "../api/services";
import { Button, Loading, PageHeader } from "../components/ui";
import { money } from "../utils/format";
export default function Reports() {
  const qs = useQueries({
    queries: [
      { queryKey: ["books"], queryFn: booksApi.list },
      { queryKey: ["members"], queryFn: membersApi.list },
      { queryKey: ["issues"], queryFn: issuesApi.list },
      { queryKey: ["fines"], queryFn: finesApi.list },
    ],
  });
  if (qs.some((q) => q.isPending)) return <Loading />;
  const [books, members, issues, fines] = qs.map((q) => q.data as any[]);
  const active = issues.filter((x) => x.status === "ISSUED").length;
  const overdue = issues.filter(
    (x) => x.status === "ISSUED" && new Date(x.dueAt) < new Date(),
  ).length;
  const outstanding = fines
    .filter((x) => x.status === "UNPAID" || x.status === "PARTIAL")
    .reduce((s, x) => s + x.amount - x.paidAmount, 0);
  const byCategory = books.reduce(
    (a, b) => {
      const k = b.category || "Uncategorized";
      a[k] = (a[k] || 0) + 1;
      return a;
    },
    {} as Record<string, number>,
  );
  const exportCsv = () => {
    const rows = [
      [
        "Title",
        "ISBN",
        "Category",
        "Total copies",
        "Available copies",
        "Status",
      ],
      ...books.map((b) => [
        b.title,
        b.isbn,
        b.category || "",
        b.totalCopies,
        b.availableCopies,
        b.status,
      ]),
    ];
    const blob = new Blob(
      [
        rows
          .map((r) =>
            r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","),
          )
          .join("\\n"),
      ],
      { type: "text/csv" },
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "library-books-report.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Operational reporting built from the data exposed by the current API."
        action={
          <Button variant="secondary" onClick={exportCsv}>
            <Download size={16} /> Export books CSV
          </Button>
        }
      />
      <div className="report-grid">
        <div className="report-card">
          <BarChart3 />
          <span>Active loans</span>
          <strong>{active}</strong>
          <small>{overdue} currently overdue</small>
        </div>
        <div className="report-card">
          <Users />
          <span>Members</span>
          <strong>{members.length}</strong>
          <small>
            {members.filter((m) => m.status === "ACTIVE").length} active members
          </small>
        </div>
        <div className="report-card">
          <CircleDollarSign />
          <span>Outstanding fines</span>
          <strong>{money(outstanding)}</strong>
          <small>{fines.length} fine records</small>
        </div>
        <div className="report-card">
          <BookOpen />
          <span>Catalogue</span>
          <strong>{books.length}</strong>
          <small>
            {books.reduce((s, b) => s + b.totalCopies, 0)} physical copies
          </small>
        </div>
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Catalogue by category</h2>
              <p>Title count grouped from current book records.</p>
            </div>
          </div>
          <div className="bars">
            {Object.entries(byCategory as Record<string, number>)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 10)
              .map(([k, v]) => (
                <div className="bar-row" key={k}>
                  <span>{k}</span>
                  <div>
                    <i
                      style={{
                        width: `${Math.max(8, (Number(v) / Math.max(...Object.values(byCategory as Record<string, number>))) * 100)}%`,
                      }}
                    />
                  </div>
                  <strong>{String(v)}</strong>
                </div>
              ))}
          </div>
        </section>
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Collection health</h2>
              <p>Inventory availability based on book totals.</p>
            </div>
          </div>
          <div className="health">
            <div>
              <span>Available</span>
              <strong>
                {books.reduce((s, b) => s + b.availableCopies, 0)}
              </strong>
            </div>
            <div>
              <span>On loan</span>
              <strong>
                {books.reduce(
                  (s, b) => s + b.totalCopies - b.availableCopies,
                  0,
                )}
              </strong>
            </div>
            <div>
              <span>Archived</span>
              <strong>
                {books.filter((b) => b.status === "ARCHIVED").length}
              </strong>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
